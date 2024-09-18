// batchProcessing.js

import { exponentialBackoff } from '../utils/backoff.js';
import { moaConfig } from '../config/config.js';

/**
 * Splits a long request into smaller batches based on token limits.
 * @param {string} request - The original request.
 * @param {number} maxTokens - Maximum tokens per batch.
 * @returns {string[]} An array of batched requests.
 */
function splitRequestIntoBatches(request, maxTokens) {
    const words = request.split(' ');
    let batches = [];
    let currentBatch = '';

    words.forEach(word => {
        if ((currentBatch + ' ' + word).trim().length <= maxTokens) {
            currentBatch += ' ' + word;
        } else {
            batches.push(currentBatch.trim());
            currentBatch = word;
        }
    });

    if (currentBatch.trim()) {
        batches.push(currentBatch.trim());
    }

    return batches;
}

/**
 * Processes a set of requests in batches using the provided processing function.
 * Enhanced for better concurrency control and error handling.
 * @param {any[]} requests - An array of requests to be processed.
 * @param {function} processingFunction - A function that takes a request and returns a promise.
 * @returns {Promise<any[]>} A promise that resolves to an array of results from the processed requests.
 */
export async function processBatchedRequests(requests, processingFunction) {
    const batchConfig = {
        initialBatchSize: 5,
        minBatchSize: 1,
        maxBatchSize: 20,
        delay: 1000,
        retryAttempts: 3,
        retryDelay: 1000,
        maxConcurrent: 3,
        progressCallback: (progress, result) => {
            console.log(`Batch progress: ${(progress * 100).toFixed(2)}%`);
        },
        adaptiveThreshold: 0.8,
    };

    let results = [];
    let currentIndex = 0;
    const totalRequests = requests.length;

    const executeBatch = async (batch) => {
        const promises = batch.map(request => exponentialBackoff(
            () => processingFunction(request),
            {
                maxRetries: batchConfig.retryAttempts,
                initialDelay: batchConfig.retryDelay,
                maxDelay: batchConfig.retryDelay * 2 ** batchConfig.retryAttempts,
            }
        ).catch(error => {
            console.error('Batch processing error:', error);
            return null; // Continue processing other requests
        }));

        const batchResults = await Promise.all(promises);
        results = results.concat(batchResults);

        currentIndex += batch.length;
        const progress = currentIndex / totalRequests;
        batchConfig.progressCallback(progress, batchResults);
    };

    while (currentIndex < totalRequests) {
        const remaining = totalRequests - currentIndex;
        const batchSize = Math.min(moaConfig.batching.maxBatchSize || batchConfig.maxBatchSize, remaining);
        const batch = splitRequestIntoBatches(requests.slice(currentIndex, currentIndex + batchSize), moaConfig.batching.maxTokensPerBatch);
        await executeBatch(batch);

        // Adaptive batching logic can be implemented here if needed
        await new Promise(resolve => setTimeout(resolve, batchConfig.delay));
    }

    return results;
}
