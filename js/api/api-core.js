// js/api/api-core.js

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
import { FunctionInput, GroqPrompt, FunctionChain, AutonomousQueryHandler } from './functionCalling.js';

const apiQueue = [];
let isProcessingQueue = false;
const autonomousQueryHandler = new AutonomousQueryHandler();

/**
 * Queues an API request for processing.
 * @param {string} model - The model name.
 * @param {Array<Object>} messages - Array of message objects.
 * @param {number} temperature - Sampling temperature.
 * @param {Function} updateCallback - Callback for partial responses.
 * @param {string} [priority='normal'] - Priority of the request.
 * @returns {Promise<string|Object>} Result of the API call.
 */
export function queueApiRequest(model, messages, temperature, updateCallback, priority = 'normal') {
    return new Promise((resolve, reject) => {
        const request = { model, messages, temperature, updateCallback, resolve, reject, priority, timestamp: Date.now() };
        insertRequestIntoQueue(request);
        processApiQueue();
    });
}

/**
 * Queues a function calling request for processing.
 * @param {string} functionName - The name of the function to be called.
 * @param {Object} parameters - The parameters for the function call.
 * @param {string} [priority='normal'] - Priority of the request.
 * @returns {Promise<Object>} Result of the function call.
 */
export function queueFunctionCall(functionName, parameters, priority = 'normal') {
    return new Promise((resolve, reject) => {
        const request = { type: 'function', functionName, parameters, resolve, reject, priority, timestamp: Date.now() };
        insertRequestIntoQueue(request);
        processApiQueue();
    });
}

/**
 * Inserts a request into the API queue based on priority.
 * @param {Object} request - The API request object.
 */
function insertRequestIntoQueue(request) {
    if (request.priority === 'high') {
        apiQueue.unshift(request);
    } else if (request.priority === 'low') {
        apiQueue.push(request);
    } else {
        // Default to normal priority
        const normalIndex = apiQueue.findIndex(item => item.priority === 'low');
        if (normalIndex === -1) {
            apiQueue.push(request);
        } else {
            apiQueue.splice(normalIndex, 0, request);
        }
    }
    logger.debug(`Inserted request into queue: ${JSON.stringify(request)}`);
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
        logger.info(`Processing batch of size: ${batch.length}`);
        await createAndProcessBatch(batch, processSingleRequest, {
            batchSize,
            delay: systemSettings.apiBatchDelay || 100,
            retryAttempts: systemSettings.apiRetryAttempts || 3,
            retryDelay: systemSettings.apiRetryDelay || 1000,
            maxConcurrent: systemSettings.apiMaxConcurrent || 3,
            progressCallback: (progress) => logger.debug(`Batch progress: ${Math.round(progress * 100)}%`)
        });
        logger.info(`Batch processed successfully.`);
    } catch (error) {
        logger.error(`Error processing batch: ${error.message}`);
        await handleGracefulDegradation(error, 'processApiQueue');
    }
    
    isProcessingQueue = false;
    setTimeout(processApiQueue, systemSettings.apiQueueInterval || 100);
}

/**
 * Processes a single API request.
 * @param {Object} request - The API request object.
 */
async function processSingleRequest(request) {
    if (request.type === 'function') {
        await processFunctionCall(request);
    } else {
        await processApiCall(request);
    }
}

/**
 * Processes a single API call request.
 * @param {Object} request - The API request object.
 */
async function processApiCall({ model, messages, temperature, updateCallback, resolve, reject }) {
    if (!model) {
        const error = new Error('Model parameter is missing or undefined');
        logger.error(error.message);
        reject(error);
        return;
    }
    
    try {
        if (!availableModels.includes(model)) {
            throw new Error(`Invalid model: ${model}`);
        }

        await refillTokenBuckets();
        
        const estimatedTokens = estimateTokens(messages, model);
        await checkRateLimit(model, estimatedTokens);

        logger.info(`Executing API call for model: ${model} with estimated tokens: ${estimatedTokens}`);
        const result = await executeWithRetryAndCircuitBreaker(
            () => enhancedStreamGroqAPI(model, messages, temperature, updateCallback),
            systemSettings.apiRetryAttempts || 3,
            systemSettings.apiRetryDelay || 1000
        );

        await consumeTokens(model, estimatedTokens);
        resolve(result);
    } catch (error) {
        logger.error(`Error processing API call for model ${model}: ${error.message}`);
        const gracefulResult = await handleGracefulDegradation(error, `processSingleRequest:${model}`);
        if (gracefulResult) {
            resolve(gracefulResult);
        } else {
            reject(error);
        }
    }
}

/**
 * Processes a single function call request.
 * @param {Object} request - The function call request object.
 */
async function processFunctionCall({ functionName, parameters, resolve, reject }) {
    try {
        const functionInput = new FunctionInput(functionName, parameters);
        logger.info(`Handling function call: ${functionName} with parameters: ${JSON.stringify(parameters)}`);
        const result = await autonomousQueryHandler.handleQuery(JSON.stringify(functionInput));
        resolve(result);
    } catch (error) {
        logger.error(`Error processing function call ${functionName}: ${error.message}`);
        const gracefulResult = await handleGracefulDegradation(error, `processFunctionCall:${functionName}`);
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
    // Placeholder implementation
    // Replace with actual streaming logic as per your Groq API integration
    try {
        // Example: Use fetch or another HTTP client to stream responses
        // This is highly dependent on the Groq API's capabilities
        const response = await fetch(`${API_ENDPOINT}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model, messages, temperature })
        });

        if (!response.ok) {
            throw new Error(`Groq API error: ${response.statusText}`);
        }

        const data = await response.json();
        updateCallback(data);
        return data.choices[0].message.content;
    } catch (error) {
        logger.error(`Error in streamGroqAPI: ${error.message}`);
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
    if (!tokenizer) {
        logger.warn(`No tokenizer available for model ${modelName}. Using default estimation.`);
        return messages.reduce((acc, msg) => acc + msg.content.split(/\s+/).length, 0);
    }

    let totalTokens = 0;
    messages.forEach(msg => {
        totalTokens += tokenizer.encode(msg.content).length;
    });

    return totalTokens;
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
