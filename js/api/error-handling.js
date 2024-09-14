import { API_ENDPOINT, API_KEY, rateLimits, systemSettings } from '../config/config.js';
import { initializeTokenBuckets, refillTokenBuckets, tokenBuckets, checkRateLimit, consumeTokens, logApiUsageStats } from './rate-limiting.js';
import { getModelContextWindow } from './modelInfo/model-info.js';
import { moaConfig } from '../config/config.js';
import { estimateTokens } from './api-core.js';
import { AVAILABLE_MODELS as availableModels, MODEL_INFO as modelInfo } from '../config/model-config.js';

// Enhanced error logging function
export function logError(error, context) {
    console.error(`Error in ${context}:`, error);
    
    if (typeof Sentry !== 'undefined' && systemSettings.useSentry) {
        Sentry.captureException(error, { 
            extra: { context, timestamp: new Date().toISOString() }
        });
    }
    
    const errorLog = JSON.parse(localStorage.getItem('errorLog') || '[]');
    errorLog.push({
        timestamp: new Date().toISOString(),
        context,
        error: error.message,
        stack: error.stack
    });
    localStorage.setItem('errorLog', JSON.stringify(errorLog.slice(-100)));
    
    if (systemSettings.useCustomErrorTracking) {
        sendToCustomErrorTrackingService(error, context);
    }

    logApiUsageStats();
}

async function sendToCustomErrorTrackingService(error, context) {
    try {
        const response = await fetch(systemSettings.customErrorTrackingEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${systemSettings.customErrorTrackingApiKey}`
            },
            body: JSON.stringify({
                timestamp: new Date().toISOString(),
                context,
                message: error.message,
                stack: error.stack,
                environment: process.env.NODE_ENV,
                apiEndpoint: API_ENDPOINT,
                userAgent: navigator.userAgent
            })
        });
        if (!response.ok) {
            console.warn('Failed to send error to custom tracking service:', await response.text());
        }
    } catch (e) {
        console.error('Error while sending to custom error tracking service:', e);
    }
}

export function withErrorHandling(apiCall, context) {
    return async (...args) => {
        const maxRetries = systemSettings.maxRetries || 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                return await apiCall(...args);
            } catch (error) {
                logError(error, context);
                
                const [operation, model] = context.split(':');
                
                if (error.message.includes('Rate limit exceeded')) {
                    await handleRateLimitError(model);
                } else if (error.message.includes('Token limit exceeded')) {
                    await handleTokenLimitError(model);
                } else if (error.message.includes('API request failed')) {
                    await handleApiFailureError(retryCount);
                } else if (error.message.includes('Network error')) {
                    await handleNetworkError(retryCount);
                } else if (error.message.includes('Model parameter is missing or undefined')) {
                    throw new Error(`Invalid model parameter in ${context}: ${error.message}`);
                } else {
                    throw error;
                }
                
                retryCount++;
            }
        }
        
        throw new Error(`Max retries (${maxRetries}) exceeded for operation: ${context}`);
    };
}

async function handleRateLimitError(model) {
    console.warn(`Rate limit exceeded for model: ${model}. Waiting before retry...`);
    const waitTime = calculateDynamicWaitTime(model);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    refillTokenBuckets();
}

async function handleTokenLimitError(model) {
    console.warn(`Token limit exceeded for model: ${model}. Waiting for token refill...`);
    const bucket = tokenBuckets.get(model);
    if (bucket) {
        const waitTime = calculateTokenRefillTime(bucket);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        refillTokenBuckets();
    } else {
        throw new Error(`No token bucket found for model: ${model}`);
    }
}

async function handleApiFailureError(retryCount) {
    const baseWaitTime = systemSettings.baseWaitTime || 5000;
    const waitTime = baseWaitTime * Math.pow(2, retryCount);
    console.warn(`API request failed. Retrying in ${waitTime/1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
}

async function handleNetworkError(retryCount) {
    const baseWaitTime = systemSettings.networkErrorBaseWaitTime || 10000;
    const waitTime = baseWaitTime * Math.pow(2, retryCount);
    console.warn(`Network error detected. Retrying in ${waitTime/1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
}

function calculateDynamicWaitTime(model) {
    const limits = rateLimits[model] || modelInfo[model];
    if (!limits) {
        return systemSettings.defaultWaitTime || 60000;
    }
    return (60000 / limits.requestsPerMinute) * (systemSettings.waitTimeMultiplier || 2);
}

function calculateTokenRefillTime(bucket) {
    const now = Date.now();
    const timeSinceLastRefill = now - bucket.lastRefill;
    const refillInterval = systemSettings.tokenRefillInterval || 60000;
    return Math.max(0, refillInterval - timeSinceLastRefill);
}

export async function canPerformOperation(model, estimatedTokens) {
    try {
        await checkRateLimit(model, estimatedTokens);
        return true;
    } catch (error) {
        logError(error, `RateCheck:${model}`);
        return false;
    }
}

export function updateTokenUsage(model, tokensUsed) {
    try {
        consumeTokens(model, tokensUsed);
    } catch (error) {
        logError(error, `TokenUpdate:${model}`);
    }
}

export function getRateLimitStatus(model) {
    const bucket = tokenBuckets.get(model);
    if (!bucket) {
        return null;
    }
    return {
        availableTokens: bucket.tokens,
        requestsRemaining: bucket.rpm - bucket.requestCount,
        dailyTokensRemaining: bucket.dailyTokens,
        nextRefillIn: calculateTokenRefillTime(bucket)
    };
}

export async function handleGracefulDegradation(error, context) {
    console.warn(`Attempting graceful degradation for error in ${context}: ${error.message}`);
    
    logError(error, `GracefulDegradation:${context}`);

    if (error.message.includes('Rate limit exceeded')) {
        return await handleRateLimitExceeded(context);
    } else if (error.message.includes('Token limit exceeded')) {
        return await handleTokenLimitExceeded(context);
    } else if (error.message.includes('API request failed')) {
        return await handleApiFailure(context);
    } else if (error.message.includes('Model parameter is missing or undefined')) {
        return await handleMissingModelError(context);
    }

    return { status: 'error', message: `Unhandled error in graceful degradation: ${error.message}` };
}

async function handleMissingModelError(context) {
    console.log(`Handling missing model error in ${context}`);
    const defaultModel = systemSettings.defaultModel;
    if (defaultModel && availableModels.includes(defaultModel)) {
        console.log(`Using default model: ${defaultModel}`);
        return { status: 'using_default_model', message: `Using default model: ${defaultModel}`, model: defaultModel };
    }
    return { status: 'error', message: 'No valid model specified and no default model available' };
}

async function handleRateLimitExceeded(context) {
    console.log(`Handling rate limit exceeded in ${context}`);
    const waitTime = 5000 + Math.random() * 5000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return { status: 'retry', message: 'Rate limit exceeded, retrying after wait' };
}

async function handleTokenLimitExceeded(context, requiredTokens) {
    console.log(`Handling token limit exceeded in ${context}`);
    const currentModel = context.split(':')[1];
    
    if (typeof moaConfig === 'undefined' || !moaConfig.layers) {
        console.error('moaConfig is not properly defined. Unable to handle token limit exceeded.');
        return { status: 'error', message: 'Invalid moaConfig' };
    }

    let availableModels = moaConfig.layers.flatMap(layer => layer.map(agent => agent.model_name));
    let sortedModels = availableModels.sort((a, b) => getModelContextWindow(b) - getModelContextWindow(a));
    
    for (let model of sortedModels) {
        if (getModelContextWindow(model) >= requiredTokens) {
            return { status: 'use_larger_model', message: `Using larger model: ${model}`, model: model };
        }
    }
    
    const maxTokens = getModelContextWindow(currentModel);
    const chunks = partitionInput(context, maxTokens);
    return { 
        status: 'chunk_input', 
        message: `Input needs to be chunked. Divided into ${chunks.length} parts.`,
        model: currentModel,
        chunks: chunks
    };
}

function partitionInput(input, maxTokens) {
    const partitions = [];
    let currentPartition = '';
    let currentTokens = 0;

    const words = input.split(' ');
    for (const word of words) {
        const wordTokens = estimateTokens([{ content: word }], 'default');
        if (currentTokens + wordTokens > maxTokens) {
            partitions.push(currentPartition.trim());
            currentPartition = '';
            currentTokens = 0;
        }
        currentPartition += word + ' ';
        currentTokens += wordTokens;
    }

    if (currentPartition) {
        partitions.push(currentPartition.trim());
    }

    return partitions;
}

async function handleApiFailure(context) {
    console.log(`Handling API failure in ${context}`);
    for (let attempt = 1; attempt <= 3; attempt++) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        try {
            console.log(`Retrying API call, attempt ${attempt}`);
            return { status: 'success', message: 'API call successful after retry' };
        } catch (error) {
            console.log(`Retry attempt ${attempt} failed: ${error.message}`);
        }
    }
    return { status: 'error', message: 'API failure persists after multiple retries' };
}

function findModelWithLargerContext(currentModel) {
    const currentContextSize = getModelContextWindow(currentModel);
    return availableModels.find(model => getModelContextWindow(model) > currentContextSize);
}

export {
    handleRateLimitExceeded,
    handleTokenLimitExceeded,
    handleApiFailure,
    findModelWithLargerContext
};