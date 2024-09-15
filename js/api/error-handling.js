import { API_ENDPOINT, API_KEY, rateLimits, systemSettings, moaConfig } from '../config/config.js';
import { 
    initializeTokenBuckets, 
    refillTokenBuckets, 
    tokenBuckets, 
    checkRateLimit, 
    consumeTokens, 
    logApiUsageStats 
} from './rate-limiting.js';
import { 
    getModelContextWindow, 
    findModelWithLargerContext 
} from './modelInfo/model-info.js';
import { estimateTokens } from './api-core.js';
import { AVAILABLE_MODELS } from '../config/model-config.js';

/**
 * Logs errors with contextual information.
 * @param {Error} error - The error object.
 * @param {string} context - The context where the error occurred.
 */
export function logError(error, context) {
    console.error(`Error in ${context}:`, error);

    // Sentry integration
    if (typeof Sentry !== 'undefined' && systemSettings.useSentry) {
        Sentry.captureException(error, { 
            extra: { context, timestamp: new Date().toISOString() }
        });
    }

    // Local storage logging
    const errorLog = JSON.parse(localStorage.getItem('errorLog') || '[]');
    errorLog.push({
        timestamp: new Date().toISOString(),
        context,
        message: error.message,
        stack: error.stack
    });
    localStorage.setItem('errorLog', JSON.stringify(errorLog.slice(-100)));

    // Custom error tracking service
    if (systemSettings.useCustomErrorTracking) {
        sendToCustomErrorTrackingService(error, context);
    }

    logApiUsageStats();
}

/**
 * Sends error details to a custom error tracking service.
 * @param {Error} error - The error object.
 * @param {string} context - The context where the error occurred.
 */
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
                environment: process.env.NODE_ENV || 'development',
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

/**
 * Wraps an API call with error handling and retries.
 * @param {Function} apiCall - The API function to wrap.
 * @param {string} context - The context for error logging.
 * @returns {Function} A wrapped function with error handling.
 */
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

        throw new Error(`Max retries (${systemSettings.maxRetries || 3}) exceeded for operation: ${context}`);
    };
}

/**
 * Handles rate limit errors by waiting and refilling tokens.
 * @param {string} model - The model name.
 */
async function handleRateLimitError(model) {
    console.warn(`Rate limit exceeded for model: ${model}. Waiting before retry...`);
    const waitTime = calculateDynamicWaitTime(model);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    refillTokenBuckets();
}

/**
 * Handles token limit errors by waiting for token refill.
 * @param {string} model - The model name.
 */
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

/**
 * Handles API failure errors with exponential backoff.
 * @param {number} retryCount - Current retry attempt.
 */
async function handleApiFailureError(retryCount) {
    const baseWaitTime = systemSettings.baseWaitTime || 5000;
    const waitTime = baseWaitTime * Math.pow(2, retryCount);
    console.warn(`API request failed. Retrying in ${waitTime / 1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
}

/**
 * Handles network errors with exponential backoff.
 * @param {number} retryCount - Current retry attempt.
 */
async function handleNetworkError(retryCount) {
    const baseWaitTime = systemSettings.networkErrorBaseWaitTime || 10000;
    const waitTime = baseWaitTime * Math.pow(2, retryCount);
    console.warn(`Network error detected. Retrying in ${waitTime / 1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
}

/**
 * Calculates dynamic wait time based on model rate limits.
 * @param {string} model - The model name.
 * @returns {number} Wait time in milliseconds.
 */
function calculateDynamicWaitTime(model) {
    const limits = rateLimits[model] || moaConfig.layers?.find(layer => layer.some(agent => agent.model_name === model))?.[0];
    if (!limits) {
        return systemSettings.defaultWaitTime || 60000;
    }
    return (60000 / limits.requestsPerMinute) * (systemSettings.waitTimeMultiplier || 2);
}

/**
 * Calculates the time needed to refill tokens.
 * @param {TokenBucket} bucket - The token bucket object.
 * @returns {number} Wait time in milliseconds.
 */
function calculateTokenRefillTime(bucket) {
    const now = Date.now();
    const timeSinceLastRefill = now - bucket.lastRefill;
    const refillInterval = systemSettings.tokenRefillInterval || 60000;
    return Math.max(0, refillInterval - timeSinceLastRefill);
}

/**
 * Determines if an operation can be performed based on rate limits.
 * @param {string} model - The model name.
 * @param {number} estimatedTokens - Estimated tokens required.
 * @returns {Promise<boolean>} True if operation can be performed.
 */
export async function canPerformOperation(model, estimatedTokens) {
    try {
        await checkRateLimit(model, estimatedTokens);
        return true;
    } catch (error) {
        logError(error, `RateCheck:${model}`);
        return false;
    }
}

/**
 * Updates token usage after an operation.
 * @param {string} model - The model name.
 * @param {number} tokensUsed - Tokens consumed.
 */
export function updateTokenUsage(model, tokensUsed) {
    try {
        consumeTokens(model, tokensUsed);
    } catch (error) {
        logError(error, `TokenUpdate:${model}`);
    }
}

/**
 * Retrieves the current rate limit status for a model.
 * @param {string} model - The model name.
 * @returns {Object|null} Rate limit status or null if not available.
 */
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

/**
 * Handles graceful degradation based on error context.
 * @param {Error} error - The error object.
 * @param {string} context - The context where degradation is handled.
 * @returns {Object} Result of degradation.
 */
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

/**
 * Handles missing model parameter errors by switching to a default model.
 * @param {string} context - The context where the error occurred.
 * @returns {Object} Degradation result.
 */
async function handleMissingModelError(context) {
    console.log(`Handling missing model error in ${context}`);
    const defaultModel = systemSettings.defaultModel;
    if (defaultModel && AVAILABLE_MODELS.includes(defaultModel)) {
        console.log(`Using default model: ${defaultModel}`);
        return { status: 'using_default_model', message: `Using default model: ${defaultModel}`, model: defaultModel };
    }
    return { status: 'error', message: 'No valid model specified and no default model available' };
}

/**
 * Handles rate limit exceeded scenarios with random wait times.
 * @param {string} context - The context where the limit was exceeded.
 * @returns {Object} Degradation result.
 */
async function handleRateLimitExceeded(context) {
    console.log(`Handling rate limit exceeded in ${context}`);
    const waitTime = 5000 + Math.random() * 5000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return { status: 'retry', message: 'Rate limit exceeded, retrying after wait' };
}

/**
 * Handles token limit exceeded scenarios by selecting larger models or chunking input.
 * @param {string} context - The context where the limit was exceeded.
 * @param {number} [requiredTokens] - Tokens required for the operation.
 * @returns {Object} Degradation result.
 */
async function handleTokenLimitExceeded(context, requiredTokens = 1000) {
    console.log(`Handling token limit exceeded in ${context}`);
    const currentModel = context.split(':')[1];
    
    if (!moaConfig?.layers) {
        console.error('moaConfig is not properly defined. Unable to handle token limit exceeded.');
        return { status: 'error', message: 'Invalid moaConfig' };
    }

    const availableModels = moaConfig.layers.flatMap(layer => layer.map(agent => agent.model_name));
    const sortedModels = availableModels.sort((a, b) => getModelContextWindow(b) - getModelContextWindow(a));

    for (const model of sortedModels) {
        if (getModelContextWindow(model) >= requiredTokens) {
            return { status: 'use_larger_model', message: `Using larger model: ${model}`, model };
        }
    }

    const maxTokens = getModelContextWindow(currentModel);
    const chunks = partitionInput(context, maxTokens);
    return { 
        status: 'chunk_input', 
        message: `Input needs to be chunked. Divided into ${chunks.length} parts.`,
        model: currentModel,
        chunks
    };
}

/**
 * Partitions input text into chunks based on token limits.
 * @param {string} input - The input text.
 * @param {number} maxTokens - Maximum tokens per chunk.
 * @returns {Array<string>} Chunks of input.
 */
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
        currentPartition += `${word} `;
        currentTokens += wordTokens;
    }

    if (currentPartition) {
        partitions.push(currentPartition.trim());
    }

    return partitions;
}

/**
 * Handles API failure scenarios with retries.
 * @param {string} context - The context where the failure occurred.
 * @returns {Object} Degradation result.
 */
async function handleApiFailure(context) {
    console.log(`Handling API failure in ${context}`);
    for (let attempt = 1; attempt <= 3; attempt++) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        try {
            console.log(`Retrying API call, attempt ${attempt}`);
            // Placeholder for actual retry logic
            return { status: 'success', message: 'API call successful after retry' };
        } catch (error) {
            console.log(`Retry attempt ${attempt} failed: ${error.message}`);
        }
    }
    return { status: 'error', message: 'API failure persists after multiple retries' };
}

export {
    handleRateLimitExceeded,
    handleTokenLimitExceeded,
    handleApiFailure,
    findModelWithLargerContext
};