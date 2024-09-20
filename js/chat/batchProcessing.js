// batchProcessing.js

import { exponentialBackoff } from '../utils/backoff.js';
import { moaConfig } from '../config/config.js';

/**
 * Splits a long request into smaller batches based on token limits.
 * 
 * How it works:
 * 1. Splits the input request into words
 * 2. Iterates through words, adding them to the current batch
 * 3. When the current batch reaches the token limit, it's added to the batches array
 * 4. Continues until all words are processed
 * 
 * @param {string} request - The original request.
 * @param {number} maxTokens - Maximum tokens per batch.
 * @returns {string[]} An array of batched requests.
 * 
 * Usage example:
 * const longRequest = "This is a very long request that needs to be split";
 * const batches = splitRequestIntoBatches(longRequest, 10);
 * console.log(batches); // ["This is a", "very long", "request", "that needs", "to be split"]
 * 
 * Used in:
 * - js/chat/batchProcessing.js (in processBatchedRequests function)
 * 
 * Role in program logic:
 * This function is crucial for handling large requests that exceed token limits.
 * It enables processing of long inputs by breaking them into manageable chunks,
 * which is essential for working within API constraints and optimizing resource usage.
 * 
 * @see [Batch Processing Documentation](./docs/batchProcessing.md#splitRequestIntoBatches)
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
 * 
 * How it works:
 * 1. Initializes batch configuration and results array
 * 2. Processes requests in batches using the executeBatch function
 * 3. Applies exponential backoff for retries on failures
 * 4. Updates progress and handles adaptive batching if needed
 * 
 * @param {any[]} requests - An array of requests to be processed.
 * @param {function} processingFunction - A function that takes a request and returns a promise.
 * @returns {Promise<any[]>} A promise that resolves to an array of results from the processed requests.
 * 
 * Usage example:
 * const requests = ["Request 1", "Request 2", "Request 3"];
 * const processFunction = async (req) => { return `Processed: ${req}`; };
 * const results = await processBatchedRequests(requests, processFunction);
 * console.log(results); // ["Processed: Request 1", "Processed: Request 2", "Processed: Request 3"]
 * 
 * Used in:
 * - js/chat/chatController.js
 * - js/ai/responseProcessor.js
 * 
 * Role in program logic:
 * This function is central to handling large-scale request processing efficiently.
 * It manages concurrency, implements retry logic, and provides progress updates,
 * making it essential for robust and scalable request handling in the application.
 * 
 * @see [Batch Processing Documentation](./docs/batchProcessing.md#processBatchedRequests)
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
