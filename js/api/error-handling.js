import { API_ENDPOINT, API_KEY, rateLimits, systemSettings } from '../config/config.js';
import { availableModels, modelInfo } from './modelInfo/model-info.js';

import { initializeTokenBuckets, refillTokenBuckets, tokenBuckets, checkRateLimit, consumeTokens, logApiUsageStats } from './rate-limiting.js';
import { getModelContextWindow } from './modelInfo/model-info.js';
import { moaConfig } from '../config/config.js';

// Enhanced error logging function
export function logError(error, context) {
    console.error(`Error in ${context}:`, error);
    
    // Log to Sentry if available
    if (typeof Sentry !== 'undefined' && systemSettings.useSentry) {
        Sentry.captureException(error, { 
            extra: { context, timestamp: new Date().toISOString() }
        });
    }
    
    // Log to local storage for debugging
    const errorLog = JSON.parse(localStorage.getItem('errorLog') || '[]');
    errorLog.push({
        timestamp: new Date().toISOString(),
        context,
        error: error.message,
        stack: error.stack
    });
    localStorage.setItem('errorLog', JSON.stringify(errorLog.slice(-100))); // Keep last 100 errors
    
    // If configured, send error to a custom error tracking service
    if (systemSettings.useCustomErrorTracking) {
        sendToCustomErrorTrackingService(error, context);
    }

    // Log API usage stats
    logApiUsageStats();
}

// Function to send errors to a custom error tracking service
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

// Enhanced error handling wrapper
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
                    // If it's an unhandled error, throw it immediately
                    throw error;
                }
                
                retryCount++;
            }
        }
        
        throw new Error(`Max retries (${maxRetries}) exceeded for operation: ${context}`);
    };
}

// Handle rate limit errors
async function handleRateLimitError(model) {
    console.warn(`Rate limit exceeded for model: ${model}. Waiting before retry...`);
    const waitTime = calculateDynamicWaitTime(model);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    refillTokenBuckets();
}

// Handle token limit errors
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

// Handle API failure errors
async function handleApiFailureError(retryCount) {
    const baseWaitTime = systemSettings.baseWaitTime || 5000; // 5 seconds
    const waitTime = baseWaitTime * Math.pow(2, retryCount); // Exponential backoff
    console.warn(`API request failed. Retrying in ${waitTime/1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
}

// Handle network errors
async function handleNetworkError(retryCount) {
    const baseWaitTime = systemSettings.networkErrorBaseWaitTime || 10000; // 10 seconds
    const waitTime = baseWaitTime * Math.pow(2, retryCount); // Exponential backoff
    console.warn(`Network error detected. Retrying in ${waitTime/1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
}

// Calculate dynamic wait time based on rate limits
function calculateDynamicWaitTime(model) {
    const limits = rateLimits[model] || modelInfo[model];
    if (!limits) {
        return systemSettings.defaultWaitTime || 60000; // Default to 1 minute if no limits found
    }
    return (60000 / limits.requestsPerMinute) * (systemSettings.waitTimeMultiplier || 2); // Adjustable multiplier
}

// Calculate time until next token refill
function calculateTokenRefillTime(bucket) {
    const now = Date.now();
    const timeSinceLastRefill = now - bucket.lastRefill;
    const refillInterval = systemSettings.tokenRefillInterval || 60000; // Configurable refill interval
    return Math.max(0, refillInterval - timeSinceLastRefill);
}

// Function to check if an operation can be performed
export async function canPerformOperation(model, estimatedTokens) {
    try {
        await checkRateLimit(model, estimatedTokens);
        return true;
    } catch (error) {
        logError(error, `RateCheck:${model}`);
        return false;
    }
}

// Function to update token usage after an operation
export function updateTokenUsage(model, tokensUsed) {
    try {
        consumeTokens(model, tokensUsed);
    } catch (error) {
        logError(error, `TokenUpdate:${model}`);
    }
}

// Function to get current rate limit status
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

// Function to handle graceful degradation
export async function handleGracefulDegradation(error, context) {
    console.warn(`Attempting graceful degradation for error in ${context}: ${error.message}`);
    
    // Log the error for monitoring and analysis
    logError(error, `GracefulDegradation:${context}`);

    // Implement fallback strategies based on the error type and context
    if (error.message.includes('Rate limit exceeded')) {
        return await handleRateLimitExceeded(context);
    } else if (error.message.includes('Token limit exceeded')) {
        return await handleTokenLimitExceeded(context);
    } else if (error.message.includes('API request failed')) {
        return await handleApiFailure(context);
    } else if (error.message.includes('Model parameter is missing or undefined')) {
        return await handleMissingModelError(context);
    }

    // Default fallback strategy
    return await useBackupService(context);
}

async function handleMissingModelError(context) {
    console.log(`Handling missing model error in ${context}`);
    // Check if a default model is specified in the system settings
    const defaultModel = systemSettings.defaultModel;
    if (defaultModel && availableModels.includes(defaultModel)) {
        console.log(`Using default model: ${defaultModel}`);
        return { status: 'using_default_model', message: `Using default model: ${defaultModel}`, model: defaultModel };
    }
    // If no default model is available, return an error status
    return { status: 'error', message: 'No valid model specified and no default model available' };
}

async function handleRateLimitExceeded(context) {
    console.log(`Handling rate limit exceeded in ${context}`);
    const waitTime = 5000 + Math.random() * 5000; // Wait 5-10 seconds
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return { status: 'retry', message: 'Rate limit exceeded, retrying after wait' };
}

async function handleTokenLimitExceeded(context, requiredTokens) {
    console.log(`Handling token limit exceeded in ${context}`);
    const currentModel = context.split(':')[1];
    
    if (typeof moaConfig === 'undefined' || !moaConfig.layers) {
        console.error('moaConfig is not properly defined. Unable to handle token limit exceeded.');
        throw new Error('Invalid moaConfig');
    }

    let availableModels = moaConfig.layers.flatMap(layer => layer.map(agent => agent.model_name));
    let sortedModels = availableModels.sort((a, b) => getModelContextWindow(b) - getModelContextWindow(a));
    
    for (let model of sortedModels) {
        if (getModelContextWindow(model) >= requiredTokens) {
            return { status: 'use_larger_model', message: `Using larger model: ${model}`, model: model };
        }
    }
    
    // If no model can handle the required tokens, fall back to chunking
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
    const sentences = input.split(/(?<=[.!?])\s+/);
    
    for (const sentence of sentences) {
        if (estimateTokens(currentPartition + sentence) > maxTokens) {
            if (currentPartition) {
                partitions.push(currentPartition.trim());
                currentPartition = '';
            }
            if (estimateTokens(sentence) > maxTokens) {
                // If a single sentence is too long, split it into words
                const words = sentence.split(/\s+/);
                for (const word of words) {
                    if (estimateTokens(currentPartition + word) > maxTokens) {
                        partitions.push(currentPartition.trim());
                        currentPartition = word + ' ';
                    } else {
                        currentPartition += word + ' ';
                    }
                }
            } else {
                currentPartition = sentence + ' ';
            }
        } else {
            currentPartition += sentence + ' ';
        }
    }
    
    if (currentPartition) {
        partitions.push(currentPartition.trim());
    }
    
    return partitions;
}

async function handleApiFailure(context) {
    console.log(`Handling API failure in ${context}`);
    // Implement exponential backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        try {
            // Attempt to retry the API call
            // This is a placeholder and should be replaced with actual retry logic
            console.log(`Retrying API call, attempt ${attempt}`);
            return { status: 'success', message: 'API call successful after retry' };
        } catch (error) {
            console.log(`Retry attempt ${attempt} failed: ${error.message}`);
        }
    }
    return { status: 'error', message: 'API failure persists after multiple retries' };
}

async function useBackupService(context) {
    console.log(`Using backup service for ${context}`);
    
    // Use Ollama as a backup local LLM service
    try {
        const ollamaEndpoint = process.env.LOCAL_OPENAI_ENDPOINT || "http://localhost:11434";
        const client = new OpenAI({
            baseURL: ollamaEndpoint,
            apiKey: "no-key-required" // Ollama doesn't require an API key
        });

        const response = await client.chat.completions.create({
            model: "ollama/llama2", // You can change this to any model available in your Ollama setup
            messages: [{ role: "user", content: context }]
        });

        console.log(`Successfully used Ollama backup service for ${context}`);
        return { 
            status: 'using_backup', 
            message: 'Using Ollama as backup service',
            data: response.choices[0].message.content
        };
    } catch (error) {
        console.error(`Error using Ollama backup service: ${error.message}`);
        return { 
            status: 'error', 
            message: 'Failed to use Ollama backup service',
            error: error.message
        };
    }
}

function findModelWithLargerContext(currentModel) {
    const currentContextSize = getModelContextWindow(currentModel);
    return availableModels.find(model => getModelContextWindow(model) > currentContextSize);
}

// Export additional functions for use in other modules
export {
    handleRateLimitExceeded,
    handleTokenLimitExceeded,
    handleApiFailure,
    useBackupService,
    findModelWithLargerContext
};
