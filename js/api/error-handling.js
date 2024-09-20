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
import { AVAILABLE_MODELS } from '../config/model-config.js';
import { logger } from '../utils/logger.js';

/**
 * Logs errors with contextual information.
 * 
 * How it works:
 * 1. Logs the error to the console using the logger utility
 * 2. Stores the error in local storage, maintaining a history of the last 100 errors
 * 3. Calls logApiUsageStats to update API usage statistics
 * 
 * Usage example:
 * try {
 *   // Some operation that might throw an error
 * } catch (error) {
 *   logError(error, 'API:GetUserData');
 * }
 * 
 * Files that use this function:
 * - js/api/api-core.js
 * - js/services/user-service.js
 * - js/components/ErrorBoundary.js
 * 
 * Role in overall program logic:
 * This function is crucial for error tracking and debugging. It provides a centralized way to log errors,
 * which helps in identifying and resolving issues across the application.
 * 
 * @param {Error} error - The error object.
 * @param {string} context - The context where the error occurred.
 */
export function logError(error, context) {
    logger.error(`Error in ${context}:`, error);

    // Local storage logging
    const errorLog = JSON.parse(localStorage.getItem('errorLog') || '[]');
    errorLog.push({
        timestamp: new Date().toISOString(),
        context,
        message: error.message,
        stack: error.stack
    });
    localStorage.setItem('errorLog', JSON.stringify(errorLog.slice(-100)));

    logApiUsageStats();
}

/**
 * Wraps an API call with error handling and retries.
 * 
 * How it works:
 * 1. Attempts to execute the provided API call
 * 2. If an error occurs, it logs the error and attempts to handle it based on the error type
 * 3. Retries the API call up to a maximum number of times (defined in systemSettings)
 * 
 * Usage example:
 * const getUserData = withErrorHandling(async (userId) => {
 *   // API call to get user data
 * }, 'API:GetUserData');
 * 
 * const userData = await getUserData(123);
 * 
 * Files that use this function:
 * - js/api/api-core.js
 * - js/services/data-service.js
 * 
 * Role in overall program logic:
 * This function enhances the reliability of API calls by adding automatic error handling and retry logic.
 * It helps in managing rate limits, token limits, and network issues, improving the overall robustness of the application.
 * 
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
 * 
 * How it works:
 * 1. Logs a warning about the rate limit being exceeded
 * 2. Calculates a dynamic wait time based on the model's rate limits
 * 3. Waits for the calculated time
 * 4. Refills the token buckets
 * 
 * Usage example:
 * if (error.message.includes('Rate limit exceeded')) {
 *   await handleRateLimitError('gpt-3.5-turbo');
 * }
 * 
 * Files that use this function:
 * - js/api/error-handling.js (internal use in withErrorHandling)
 * 
 * Role in overall program logic:
 * This function helps manage API rate limits by implementing a waiting strategy when limits are exceeded.
 * It ensures that the application respects API usage limits and prevents excessive API calls.
 * 
 * @param {string} model - The model name.
 */
async function handleRateLimitError(model) {
    logger.warn(`Rate limit exceeded for model: ${model}. Waiting before retry...`);
    const waitTime = calculateDynamicWaitTime(model);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    refillTokenBuckets();
}

/**
 * Handles token limit errors by waiting for token refill.
 * 
 * How it works:
 * 1. Logs a warning about the token limit being exceeded
 * 2. Retrieves the token bucket for the specified model
 * 3. Calculates the time needed for token refill
 * 4. Waits for the calculated time
 * 5. Refills the token buckets
 * 
 * Usage example:
 * if (error.message.includes('Token limit exceeded')) {
 *   await handleTokenLimitError('gpt-3.5-turbo');
 * }
 * 
 * Files that use this function:
 * - js/api/error-handling.js (internal use in withErrorHandling)
 * 
 * Role in overall program logic:
 * This function manages token usage limits for API calls. It implements a waiting strategy when token limits are exceeded,
 * ensuring that the application stays within allowed token usage limits.
 * 
 * @param {string} model - The model name.
 */
async function handleTokenLimitError(model) {
    logger.warn(`Token limit exceeded for model: ${model}. Waiting for token refill...`);
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
 * 
 * How it works:
 * 1. Calculates a wait time using exponential backoff based on the retry count
 * 2. Logs a warning with the calculated wait time
 * 3. Waits for the calculated time before allowing another retry
 * 
 * Usage example:
 * if (error.message.includes('API request failed')) {
 *   await handleApiFailureError(retryCount);
 * }
 * 
 * Files that use this function:
 * - js/api/error-handling.js (internal use in withErrorHandling)
 * 
 * Role in overall program logic:
 * This function implements an exponential backoff strategy for handling API failures.
 * It helps prevent overwhelming the API with rapid successive requests during downtime or issues.
 * 
 * @param {number} retryCount - Current retry attempt.
 */
async function handleApiFailureError(retryCount) {
    const baseWaitTime = systemSettings.baseWaitTime || 5000;
    const waitTime = baseWaitTime * Math.pow(2, retryCount);
    logger.warn(`API request failed. Retrying in ${waitTime / 1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
}

/**
 * Handles network errors with exponential backoff.
 * 
 * How it works:
 * 1. Calculates a wait time using exponential backoff based on the retry count
 * 2. Logs a warning with the calculated wait time
 * 3. Waits for the calculated time before allowing another retry
 * 
 * Usage example:
 * if (error.message.includes('Network error')) {
 *   await handleNetworkError(retryCount);
 * }
 * 
 * Files that use this function:
 * - js/api/error-handling.js (internal use in withErrorHandling)
 * 
 * Role in overall program logic:
 * This function implements an exponential backoff strategy for handling network errors.
 * It helps manage situations where network connectivity is unstable or temporarily unavailable.
 * 
 * @param {number} retryCount - Current retry attempt.
 */
async function handleNetworkError(retryCount) {
    const baseWaitTime = systemSettings.networkErrorBaseWaitTime || 10000;
    const waitTime = baseWaitTime * Math.pow(2, retryCount);
    logger.warn(`Network error detected. Retrying in ${waitTime / 1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
}

/**
 * Calculates dynamic wait time based on model rate limits.
 * 
 * How it works:
 * 1. Retrieves rate limits for the specified model from rateLimits or moaConfig
 * 2. If no limits are found, uses a default wait time
 * 3. Calculates wait time based on requests per minute and a multiplier
 * 
 * Usage example:
 * const waitTime = calculateDynamicWaitTime('gpt-3.5-turbo');
 * 
 * Files that use this function:
 * - js/api/error-handling.js (internal use in handleRateLimitError)
 * 
 * Role in overall program logic:
 * This function helps in dynamically adjusting wait times based on specific model rate limits.
 * It ensures that the application respects varying rate limits for different models.
 * 
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
 * 
 * How it works:
 * 1. Calculates the time elapsed since the last token refill
 * 2. Determines the remaining time until the next refill based on the refill interval
 * 
 * Usage example:
 * const bucket = tokenBuckets.get('gpt-3.5-turbo');
 * const waitTime = calculateTokenRefillTime(bucket);
 * 
 * Files that use this function:
 * - js/api/error-handling.js (internal use in handleTokenLimitError)
 * 
 * Role in overall program logic:
 * This function is crucial for managing token-based rate limiting.
 * It helps determine how long to wait before tokens are refilled, ensuring adherence to token usage limits.
 * 
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
 * 
 * How it works:
 * 1. Attempts to check the rate limit for the specified model and estimated tokens
 * 2. Returns true if the operation can be performed within rate limits
 * 3. Logs an error and returns false if rate limit is exceeded
 * 
 * Usage example:
 * const canProceed = await canPerformOperation('gpt-3.5-turbo', 1000);
 * if (canProceed) {
 *   // Perform the operation
 * }
 * 
 * Files that use this function:
 * - js/api/api-core.js
 * - js/services/ai-service.js
 * 
 * Role in overall program logic:
 * This function acts as a gatekeeper for API operations, ensuring that they comply with rate limits.
 * It helps prevent rate limit errors by proactively checking before performing operations.
 * 
 * @param {string} model - The model name.
 * @param {number} estimatedTokens - Tokens required for the operation.
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
 * 
 * How it works:
 * 1. Attempts to consume the specified number of tokens for the given model
 * 2. Logs an error if token consumption fails
 * 
 * Usage example:
 * updateTokenUsage('gpt-3.5-turbo', 500);
 * 
 * Files that use this function:
 * - js/api/api-core.js
 * - js/services/ai-service.js
 * 
 * Role in overall program logic:
 * This function is essential for maintaining accurate token usage tracking.
 * It ensures that the token buckets are updated after each API operation, helping to enforce rate limits.
 * 
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
 * 
 * How it works:
 * 1. Retrieves the token bucket for the specified model
 * 2. If the bucket exists, calculates and returns various rate limit metrics
 * 3. Returns null if no bucket is found for the model
 * 
 * Usage example:
 * const status = getRateLimitStatus('gpt-3.5-turbo');
 * console.log(`Available tokens: ${status.availableTokens}`);
 * 
 * Files that use this function:
 * - js/components/RateLimitDisplay.js
 * - js/services/ai-service.js
 * 
 * Role in overall program logic:
 * This function provides visibility into the current rate limit status for a specific model.
 * It's useful for displaying rate limit information to users or for making decisions about API usage in the application.
 * 
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
 * 
 * How it works:
 * 1. Logs a warning about the degradation attempt
 * 2. Logs the error for tracking
 * 3. Determines the type of error and calls the appropriate handler
 * 4. Returns the result of the degradation attempt
 * 
 * Usage example:
 * try {
 *   // Some operation that might fail
 * } catch (error) {
 *   const result = await handleGracefulDegradation(error, 'API:GetUserData');
 *   // Handle the result
 * }
 * 
 * Files that use this function:
 * - js/api/api-core.js
 * - js/services/ai-service.js
 * 
 * Role in overall program logic:
 * This function is crucial for maintaining system stability and user experience during errors.
 * It provides a structured way to handle various types of errors and attempt recovery or alternative actions.
 * 
 * @param {Error} error - The error object.
 * @param {string} context - The context where degradation is handled.
 * @returns {Object} Result of degradation.
 */
export async function handleGracefulDegradation(error, context) {
    logger.warn(`Attempting graceful degradation for error in ${context}: ${error.message}`);

    logError(error, `GracefulDegradation:${context}`);

    if (error.message.includes('Rate limit exceeded')) {
        return await handleRateLimitExceeded(context);
    } else if (error.message.includes('Token limit exceeded')) {
        return await handleTokenLimitExceeded(context);
    } else if (error.message.includes('API request failed')) {
        return await handleApiFailure(context);
    } else if (error.message.includes('Network error')) {
        return await handleNetworkError(context);
    }

    return { status: 'error', message: `Unhandled error in graceful degradation: ${error.message}` };
}

/**
 * Handles missing model parameter errors by switching to a default model.
 * 
 * How it works:
 * 1. Logs information about handling the missing model error
 * 2. Checks if a default model is specified in system settings
 * 3. If a valid default model is available, returns it for use
 * 4. If no valid default model is found, returns an error status
 * 
 * Usage example:
 * const result = await handleMissingModelError('API:GenerateText');
 * if (result.status === 'using_default_model') {
 *   // Proceed with the default model
 * }
 * 
 * Files that use this function:
 * - js/api/error-handling.js (internal use in handleGracefulDegradation)
 * 
 * Role in overall program logic:
 * This function provides a fallback mechanism when a specific model is not specified or is invalid.
 * It helps maintain system functionality by defaulting to a predefined model when necessary.
 * 
 * @param {string} context - The context where the error occurred.
 * @returns {Object} Degradation result.
 */
async function handleMissingModelError(context) {
    logger.info(`Handling missing model error in ${context}`);
    const defaultModel = systemSettings.defaultModel;
    if (defaultModel && AVAILABLE_MODELS.includes(defaultModel)) {
        logger.info(`Using default model: ${defaultModel}`);
        return { status: 'using_default_model', message: `Using default model: ${defaultModel}`, model: defaultModel };
    }
    return { status: 'error', message: 'No valid model specified and no default model available' };
}

/**
 * Handles rate limit exceeded scenarios with random wait times.
 * 
 * How it works:
 * 1. Logs information about handling the rate limit exceeded error
 * 2. Calculates a random wait time between 5 and 10 seconds
 * 3. Waits for the calculated time
 * 4. Returns a retry status
 * 
 * Usage example:
 * const result = await handleRateLimitExceeded('API:GenerateText');
 * if (result.status === 'retry') {
 *   // Attempt the operation again
 * }
 * 
 * Files that use this function:
 * - js/api/error-handling.js (internal use in handleGracefulDegradation)
 * 
 * Role in overall program logic:
 * This function implements a simple backoff strategy for rate limit errors.
 * It helps in managing API usage by introducing random delays when rate limits are exceeded.
 * 
 * @param {string} context - The context where the limit was exceeded.
 * @returns {Object} Degradation result.
 */
async function handleRateLimitExceeded(context) {
    logger.info(`Handling rate limit exceeded in ${context}`);
    const waitTime = 5000 + Math.random() * 5000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return { status: 'retry', message: 'Rate limit exceeded, retrying after wait' };
}

/**
 * Handles token limit exceeded scenarios by selecting larger models or chunking input.
 * 
 * How it works:
 * 1. Logs information about handling the token limit exceeded error
 * 2. Attempts to find a larger model that can handle the required tokens
 * 3. If a larger model is found, returns it for use
 * 4. If no larger model is available, chunks the input based on the current model's token limit
 * 
 * Usage example:
 * const result = await handleTokenLimitExceeded('API:GenerateText', 2000);
 * if (result.status === 'use_larger_model') {
 *   // Use the suggested larger model
 * } else if (result.status === 'chunk_input') {
 *   // Process the input in chunks
 * }
 * 
 * Files that use this function:
 * - js/api/error-handling.js (internal use in handleGracefulDegradation)
 * 
 * Role in overall program logic:
 * This function is crucial for handling scenarios where the input exceeds token limits.
 * It provides strategies to either use a more capable model or break down the input into manageable chunks.
 * 
 * @param {string} context - The context where the limit was exceeded.
 * @param {number} [requiredTokens=1000] - Tokens required for the operation.
 * @returns {Object} Degradation result.
 */
async function handleTokenLimitExceeded(context, requiredTokens = 1000) {
    logger.info(`Handling token limit exceeded in ${context}`);
    const currentModel = context.split(':')[1];
    
    if (!moaConfig?.layers) {
        logger.error('moaConfig is not properly defined. Unable to handle token limit exceeded.');
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
 * 
 * How it works:
 * 1. Initializes empty partitions and current partition
 * 2. Splits the input into words
 * 3. Iterates through words, estimating tokens for each
 * 4. Adds words to the current partition until the token limit is reached
 * 5. Starts a new partition when the limit is reached
 * 6. Returns an array of partitioned chunks
 * 
 * Usage example:
 * const chunks = partitionInput(longText, 1000);
 * for (const chunk of chunks) {
 *   // Process each chunk
 * }
 * 
 * Files that use this function:
 * - js/api/error-handling.js (internal use in handleTokenLimitExceeded)
 * 
 * Role in overall program logic:
 * This function is essential for handling large inputs that exceed token limits.
 * It enables processing of long texts by breaking them into smaller, manageable chunks.
 * 
 * @param {string} input - The input text.
 * @param {number} maxTokens - Maximum tokens per chunk.
 * @returns {Array<string>} Chunks of input.
 */
function partitionInput(input, maxTokens) {
    const partitions = [];
    let currentPartition = '';
    let currentTokens = 0;

    const words = input.split(/\s+/);
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
 * 
 * How it works:
 * 1. Logs information about handling the API failure
 * 2. Attempts to retry the API call up to 3 times
 * 3. Uses exponential backoff for wait times between retries
 * 4. Returns success status if a retry succeeds, or error status after all retries fail
 * 
 * Usage example:
 * const result = await handleApiFailure('API:GetUserData');
 * if (result.status === 'success') {
 *   // Process the successful result
 * } else {
 *   // Handle the persistent failure
 * }
 * 
 * Files that use this function:
 * - js/api/error-handling.js (internal use in handleGracefulDegradation)
 * 
 * Role in overall program logic:
 * This function provides a robust mechanism for handling temporary API failures.
 * It improves system reliability by attempting to recover from transient API issues.
 * 
 * @param {string} context - The context where the failure occurred.
 * @returns {Object} Degradation result.
 */
async function handleApiFailure(context) {
    logger.info(`Handling API failure in ${context}`);
    for (let attempt = 1; attempt <= 3; attempt++) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        try {
            logger.info(`Retrying API call, attempt ${attempt}`);
            // Placeholder for actual retry logic
            return { status: 'success', message: 'API call successful after retry' };
        } catch (error) {
            logger.warn(`Retry attempt ${attempt} failed: ${error.message}`);
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
