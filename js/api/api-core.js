import { API_ENDPOINT, API_KEY, systemSettings } from '../config/config.js';
import { createAndProcessBatch } from '../chat/batchProcessor/batch-processor.js';
import { availableModels, getModelInfo, getModelContextWindow, getModelTokenLimit, getModelTokenizer } from './modelInfo/model-info.js';
import { 
    initializeTokenBuckets, 
    refillTokenBuckets, 
    checkRateLimit, 
    consumeTokens, 
    logApiUsageStats 
} from './rate-limiting.js';
import { 
    withErrorHandling, 
    handleGracefulDegradation, 
    handleApiFailure 
} from './error-handling.js';
import { logger } from '../utils/logger.js';
import { executeWithRetryAndCircuitBreaker } from '../utils/retry.js';

const apiQueue = [];
let isProcessingQueue = false;

/**
 * Queues an API request for processing.
 * @param {string} model - The model name.
 * @param {Array<Object>} messages - Array of message objects.
 * @param {number} temperature - Sampling temperature.
 * @param {Function} updateCallback - Callback for partial responses.
 * @param {string} [priority='normal'] - Priority of the request.
 * @returns {Promise<string|Object>} Result of the API call.
 */
export async function queueApiRequest(model, messages, temperature, updateCallback, priority = 'normal') {
    return new Promise((resolve, reject) => {
        const request = { model, messages, temperature, updateCallback, resolve, reject, priority, timestamp: Date.now() };
        insertRequestIntoQueue(request);
        processApiQueue();
    });
}

/**
 * Inserts a request into the API queue based on priority.
 * @param {Object} request - The API request object.
 */
function insertRequestIntoQueue(request) {
    const index = apiQueue.findIndex(item => 
        (item.priority === 'low') || 
        (item.priority === 'normal' && request.priority === 'high')
    );
    if (index === -1) {
        apiQueue.push(request);
    } else {
        apiQueue.splice(index, 0, request);
    }
}

/**
 * Processes a single API request.
 * @param {Object} request - The API request object.
 */
async function processSingleRequest({ model, messages, temperature, updateCallback, resolve, reject }) {
    if (!model) {
        reject(new Error('Model parameter is missing or undefined'));
        return;
    }
    
    try {
        if (!availableModels.includes(model)) {
            throw new Error(`Invalid model: ${model}`);
        }

        await refillTokenBuckets();
        
        const estimatedTokens = estimateTokens(messages, model);
        await checkRateLimit(model, estimatedTokens);

        const result = await executeWithRetryAndCircuitBreaker(
            () => enhancedStreamGroqAPI(model, messages, temperature, updateCallback),
            systemSettings.apiRetryAttempts || 3,
            systemSettings.apiRetryDelay || 1000
        );

        await consumeTokens(model, estimatedTokens);
        resolve(result);
    } catch (error) {
        const gracefulResult = await handleGracefulDegradation(error, `processSingleRequest:${model}`);
        if (gracefulResult) {
            resolve(gracefulResult);
        } else {
            reject(error);
        }
    }
}

/**
 * Streams data from the Groq API with proper handling.
 * @param {string} model - The model name.
 * @param {Array<Object>} messages - Array of message objects.
 * @param {number} temperature - Sampling temperature.
 * @param {Function} updateCallback - Callback for partial responses.
 * @returns {Promise<string>} The full response from the API.
 */
async function streamGroqAPI(model, messages, temperature, updateCallback) {
    if (!model) {
        throw new Error('Model parameter is missing or undefined');
    }

    const url = API_ENDPOINT;
    const headers = {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
    };
    const modelTokenLimit = getModelTokenLimit(model);
    const modelContextWindow = getModelContextWindow(model);
    const estimatedInputTokens = estimateTokens(messages, model);
    const maxTokens = Math.min(modelTokenLimit, modelContextWindow - estimatedInputTokens);
    const body = JSON.stringify({
        model,
        messages,
        temperature,
        stream: true,
        max_tokens: maxTokens
    });

    logger.debug(`Sending request for model ${model}:`, { url, headers, body: JSON.parse(body) });

    try {
        const timeoutMs = typeof systemSettings.apiTimeout === 'number' ? systemSettings.apiTimeout : 30000; // Default to 30 seconds
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, { 
            method: 'POST', 
            headers, 
            body,
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorBody = await response.json();
            logger.error(`API request failed for model ${model}. Status: ${response.status}. Response:`, errorBody);
            throw new Error(`API request failed: ${errorBody.error.message} (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, newlineIndex).trim();
                buffer = buffer.slice(newlineIndex + 1);
                if (line.startsWith('data: ')) {
                    const jsonData = line.slice(6);
                    if (jsonData === '[DONE]') break;
                    try {
                        const parsedData = JSON.parse(jsonData);
                        if (parsedData.choices && parsedData.choices.length > 0) {
                            const content = parsedData.choices[0]?.delta?.content || '';
                            fullResponse += content;
                            if (typeof updateCallback === 'function') {
                                updateCallback(content);
                            }
                        } else {
                            logger.warn('Received unexpected data structure:', parsedData);
                        }
                    } catch (error) {
                        logger.error('Error parsing JSON:', error, 'Raw data:', jsonData);
                    }
                }
            }
        }

        return fullResponse;
    } catch (error) {
        if (error.name === 'AbortError') {
            logger.error(`API request timed out after ${systemSettings.apiTimeout || 30000}ms for model ${model}`);
            throw new Error(`API request timed out after ${systemSettings.apiTimeout || 30000}ms for model ${model}`);
        }
        logger.error(`Error in API request for model ${model}:`, error);
        throw error;
    }
}

/**
 * Estimates the number of tokens required for the given messages.
 * @param {Array<Object>} messages - Array of message objects.
 * @param {string} modelName - The model name.
 * @returns {number} Estimated token count.
 */
export function estimateTokens(messages, modelName) {
    const tokenizer = getModelTokenizer(modelName);
    const overheadFactor = 1.1;
    const modelInfo = getModelInfo(modelName);
    const modelSpecificFactor = modelInfo.tokenEstimationFactor || 1.0;

    const estimatedTokens = tokenizer.encode(messages).length;

    return Math.ceil(estimatedTokens * overheadFactor * modelSpecificFactor);
}

/**
 * Processes the API queue by handling batch requests.
 */
export async function processApiQueue() {
    if (isProcessingQueue || apiQueue.length === 0) return;
    
    isProcessingQueue = true;
    const batchSize = systemSettings.apiBatchSize || 5;
    const batch = apiQueue.splice(0, batchSize);

    try {
        await createAndProcessBatch(batch, processSingleRequest, {
            batchSize,
            delay: systemSettings.apiBatchDelay || 100,
            retryAttempts: systemSettings.apiRetryAttempts || 3,
            retryDelay: systemSettings.apiRetryDelay || 1000,
            maxConcurrent: systemSettings.apiMaxConcurrent || 3,
            progressCallback: (progress) => logger.debug(`Batch progress: ${Math.round(progress * 100)}%`)
        });
    } catch (error) {
        await handleGracefulDegradation(error, 'processApiQueue');
    }
    
    isProcessingQueue = false;
    setTimeout(processApiQueue, systemSettings.apiQueueInterval || 100);
}

/**
 * Enhanced streaming API with error handling.
 */
const enhancedStreamGroqAPI = withErrorHandling(
    async (model, messages, temperature, updateCallback) => {
        if (!model) {
            throw new Error('Model parameter is missing or undefined in enhancedStreamGroqAPI');
        }
        return await streamGroqAPI(model, messages, temperature, updateCallback);
    },
    'enhancedStreamGroqAPI'
);

export const safeProcessApiQueue = withErrorHandling(processApiQueue, 'safeProcessApiQueue');

// Initialize token buckets when the module loads
initializeTokenBuckets();

// Periodically refill token buckets and log usage statistics
setInterval(refillTokenBuckets, systemSettings.tokenRefillInterval || 60000); // Every minute by default
setInterval(logApiUsageStats, systemSettings.apiStatsLogInterval || 300000); // Every 5 minutes by default

export { handleApiFailure };