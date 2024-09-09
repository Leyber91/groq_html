import { API_ENDPOINT, API_KEY, systemSettings } from '../config/config.js';
import { createAndProcessBatch } from '../chat/batchProcessor/batch-processor.js';
import { availableModels, getModelInfo, getModelContextWindow, getModelTokenLimit } from './model-info.js';
import { initializeTokenBuckets, refillTokenBuckets, tokenBuckets, rateLimits, checkRateLimit, consumeTokens, logApiUsageStats } from './rate-limiting.js';
import { logError, withErrorHandling, handleGracefulDegradation, handleApiFailure } from './error-handling.js';

const apiQueue = [];
let isProcessingQueue = false;

export async function queueApiRequest(model, messages, temperature, updateCallback, priority = 'normal') {
    return new Promise((resolve, reject) => {
        const request = { model, messages, temperature, updateCallback, resolve, reject, priority, timestamp: Date.now() };
        insertRequestIntoQueue(request);
        processApiQueue();
    });
}

function insertRequestIntoQueue(request) {
    const index = apiQueue.findIndex(item => item.priority === 'low' || (item.priority === 'normal' && request.priority === 'high'));
    if (index === -1) {
        apiQueue.push(request);
    } else {
        apiQueue.splice(index, 0, request);
    }
}

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

        const result = await enhancedStreamGroqAPI(model, messages, temperature, updateCallback);

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

    console.log(`Sending request for model ${model}:`, { url, headers, body: JSON.parse(body) });

    try {
        const timeoutMs = typeof systemSettings.apiTimeout === 'number' ? systemSettings.apiTimeout : 30000; // Default to 30 seconds
        const response = await fetch(url, { 
            method: 'POST', 
            headers, 
            body,
            signal: AbortSignal.timeout(timeoutMs)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error(`API request failed for model ${model}. Status: ${response.status}. Response:`, errorBody);
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
                const line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);
                if (line.startsWith('data: ')) {
                    const jsonData = line.slice(6);
                    if (jsonData.trim() === '[DONE]') break;
                    try {
                        const parsedData = JSON.parse(jsonData);
                        if (parsedData.choices && parsedData.choices.length > 0) {
                            const content = parsedData.choices[0]?.delta?.content || '';
                            fullResponse += content;
                            if (typeof updateCallback === 'function') {
                                updateCallback(content);
                            }
                        } else {
                            console.warn('Received unexpected data structure:', parsedData);
                        }
                    } catch (error) {
                        console.error('Error parsing JSON:', error, 'Raw data:', jsonData);
                    }
                }
            }
        }

        return fullResponse;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error(`API request timed out after ${timeoutMs}ms for model ${model}`);
            throw new Error(`API request timed out after ${timeoutMs}ms for model ${model}`);
        }
        console.error(`Error in API request for model ${model}:`, error);
        throw error;
    }
}

function estimateTokens(messages, model) {
    const averageTokenLength = 4;
    const overheadFactor = 1.1;
    const modelSpecificFactor = getModelInfo(model).tokenEstimationFactor || 1.0;

    const estimatedTokens = messages.reduce((sum, msg) => {
        const charCount = msg.content.length;
        const estimatedTokens = Math.ceil(charCount / averageTokenLength);
        return sum + estimatedTokens;
    }, 0);

    return Math.ceil(estimatedTokens * overheadFactor * modelSpecificFactor);
}

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
            progressCallback: (progress) => console.log(`Batch progress: ${progress * 100}%`)
        });
    } catch (error) {
        await handleGracefulDegradation(error, 'processApiQueue');
    }
    
    isProcessingQueue = false;
    setTimeout(processApiQueue, systemSettings.apiQueueInterval || 100);
}

export const safeProcessApiQueue = withErrorHandling(processApiQueue, 'safeProcessApiQueue');

const enhancedStreamGroqAPI = withErrorHandling(
    async (model, messages, temperature, updateCallback) => {
        if (!model) {
            throw new Error('Model parameter is missing or undefined in enhancedStreamGroqAPI');
        }
        return await streamGroqAPI(model, messages, temperature, updateCallback);
    },
    'enhancedStreamGroqAPI'
);



// Initialize token buckets when the module loads
initializeTokenBuckets();

// Periodically refill token buckets and log usage statistics
setInterval(refillTokenBuckets, systemSettings.tokenRefillInterval || 60000); // Run every minute by default
setInterval(logApiUsageStats, systemSettings.apiStatsLogInterval || 300000); // Log stats every 5 minutes by default

export { logApiUsageStats, handleApiFailure };
