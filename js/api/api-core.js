import { API_ENDPOINT, API_KEY } from '../config/config.js';
import { createAndProcessBatch } from '../chat/batch-processor.js';
import { compressMessage, decompressMessage } from '../compression.js';
import { availableModels, getModelInfo } from './model-info.js';
import { initializeTokenBuckets, refillTokenBuckets, tokenBuckets, rateLimits } from './rate-limiting.js';
import { logError, withErrorHandling } from './error-handling.js';

const apiQueue = [];
let isProcessingQueue = false;
let globalTokenCount = 0;

export async function queueApiRequest(model, messages, temperature, updateCallback) {
    return new Promise((resolve, reject) => {
        apiQueue.push({ model, messages, temperature, updateCallback, resolve, reject });
        processApiQueue();
    });
}

async function processSingleRequest({ model, messages, temperature, updateCallback, resolve, reject }) {
    try {
        if (!availableModels.includes(model)) {
            throw new Error(`Invalid model: ${model}`);
        }

        refillTokenBuckets();
        const bucket = tokenBuckets.get(model);
        const limits = rateLimits[model];
        
        if (!bucket || !limits) {
            throw new Error(`Rate limit information not available for model ${model}`);
        }

        if (bucket.requestCount >= limits.rpm) {
            throw new Error(`Rate limit exceeded for model ${model}`);
        }

        const estimatedTokens = estimateTokens(messages, model);
        if (bucket.tokens < estimatedTokens) {
            throw new Error(`Token limit exceeded for model ${model}`);
        }

        if (limits.dailyTokens && bucket.dailyTokens < estimatedTokens) {
            throw new Error(`Daily token limit exceeded for model ${model}`);
        }

        bucket.requestCount++;
        bucket.tokens -= estimatedTokens;
        if (limits.dailyTokens) {
            bucket.dailyTokens -= estimatedTokens;
        }

        const result = await enhancedStreamGroqAPI(model, messages, temperature, updateCallback);
        resolve(result);
    } catch (error) {
        logError(error, `processSingleRequest:${model}`);
        reject(error);
    }
}

async function streamGroqAPI(model, messages, temperature, updateCallback) {
    const rateLimit = rateLimits[model] || { rpm: 30, tpm: 15000 }; // Default rate limit
    await waitForRateLimit(model, rateLimit);

    const url = API_ENDPOINT;
    const headers = {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
    };
    const body = JSON.stringify({
        model,
        messages,
        temperature,
        stream: true
    });

    console.log(`Sending request for model ${model}:`, { url, headers, body: JSON.parse(body) });

    try {
        const response = await fetch(url, { method: 'POST', headers, body });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API request failed for model ${model}. Status: ${response.status}. Response:`, errorBody);
            throw new Error(`API request failed with status ${response.status} for model ${model}. Response: ${errorBody}`);
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
                        const content = parsedData.choices[0]?.delta?.content || '';
                        fullResponse += content;
                        if (typeof updateCallback === 'function') {
                            updateCallback(content);
                        }
                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                    }
                }
            }
        }

        return fullResponse;
    } catch (error) {
        logError(error, `streamGroqAPI:${model}`);
        throw error;
    }
}

function waitForRateLimit(model, rateLimit) {
    return new Promise(resolve => {
        const now = Date.now();
        const lastRequestTime = tokenBuckets.get(model)?.lastRequestTime || 0;
        const timeToWait = Math.max(0, (60000 / rateLimit.rpm) - (now - lastRequestTime));

        setTimeout(() => {
            tokenBuckets.set(model, { lastRequestTime: Date.now(), tokens: rateLimit.tpm });
            resolve();
        }, timeToWait);
    });
}

function estimateTokens(messages, model) {
    const averageTokenLength = 4;
    const overheadFactor = 1.1;
    const modelSpecificFactors = {
        'gemma-7b-it': 1.05,
        'gemma2-9b-it': 1.1,
        'llama-3.1-70b-versatile': 1.2,
        'llama-3.1-8b-instant': 1.1,
        'llama-guard-3-8b': 1.05,
        'llama3-70b-8192': 1.25,
        'llama3-8b-8192': 1.15,
        'llama3-groq-70b-8192-tool-use-preview': 1.3,
        'llama3-groq-8b-8192-tool-use-preview': 1.2,
        'mixtral-8x7b-32768': 1.15
    };

    return messages.reduce((sum, msg) => {
        const charCount = msg.content.length;
        const estimatedTokens = Math.ceil(charCount / averageTokenLength);
        return sum + (estimatedTokens * overheadFactor * (modelSpecificFactors[model] || 1.0));
    }, 0);
}

export async function processApiQueue() {
    if (isProcessingQueue || apiQueue.length === 0) return;
    
    isProcessingQueue = true;
    const batchSize = 5;
    const batch = apiQueue.splice(0, batchSize);

    try {
        await createAndProcessBatch(batch, processSingleRequest, {
            batchSize,
            delay: 100,
            retryAttempts: 3,
            retryDelay: 1000,
            maxConcurrent: 3,
            progressCallback: (progress) => console.log(`Batch progress: ${progress * 100}%`)
        });
    } catch (error) {
        logError(error, 'processApiQueue');
    }
    
    isProcessingQueue = false;
    setTimeout(processApiQueue, 100);
}

export const safeProcessApiQueue = withErrorHandling(processApiQueue, 'safeProcessApiQueue');

const enhancedStreamGroqAPI = (model, messages, temperature, updateCallback) => 
    withErrorHandling(() => streamGroqAPI(model, messages, temperature, updateCallback), `streamGroqAPI:${model}`);

export function logApiUsageStats() {
    const stats = {
        globalTokenCount,
        modelStats: {}
    };
    for (const [model, bucket] of tokenBuckets.entries()) {
        stats.modelStats[model] = {
            tokens: bucket.tokens.toFixed(2),
            rpm: bucket.rpm,
            requestCount: bucket.requestCount
        };
    }
    console.log('API Usage Stats:', JSON.stringify(stats, null, 2));
}

// Initialize token buckets when the module loads
initializeTokenBuckets();

// Periodically refill token buckets and log usage statistics
setInterval(refillTokenBuckets, 60000); // Run every minute
setInterval(logApiUsageStats, 300000); // Log stats every 5 minutes
