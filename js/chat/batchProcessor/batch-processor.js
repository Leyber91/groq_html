import { handleGracefulDegradation } from '../../api/error-handling.js';
import { queueApiRequest } from '../../api/api-core.js';
import { AVAILABLE_MODELS, MODEL_INFO, getModelInfo, selectAlternativeModel } from '../../config/model-config.js';
import { getModelContextWindow, getModelTokenLimit } from '../../api/modelInfo/model-info.js';

/**
 * Processes a batch of asynchronous tasks with optimized performance and advanced error handling.
 * 
 * How it works:
 * 1. Initializes an array to store results and errors
 * 2. Defines a processTask function to handle individual tasks with retry logic
 * 3. Implements a throttle function to control concurrency
 * 4. Executes tasks with optional delay between each
 * 5. Throws an error if any tasks fail after all retry attempts
 * 
 * Usage example:
 * const tasks = [
 *   async () => await fetchData(1),
 *   async () => await fetchData(2),
 *   async () => await fetchData(3)
 * ];
 * const results = await batchProcess(tasks, 1000, (progress) => console.log(`Progress: ${progress * 100}%`));
 * 
 * Files that use this function:
 * - js/chat/batchProcessor/batch-processor.js (internal use)
 * - js/services/dataFetchService.js
 * - js/components/batchOperationManager.js
 * 
 * Role in overall program logic:
 * This function is crucial for efficiently processing large numbers of asynchronous tasks.
 * It's used in various parts of the application where multiple API calls or data processing
 * operations need to be performed in a controlled, optimized manner.
 * 
 * @param {Function[]} taskFns - An array of functions that return promises to be processed.
 * @param {number} delay - The delay in milliseconds between processing each task.
 * @param {function} [progressCallback] - Optional callback function to report progress.
 * @param {number} [retryAttempts=3] - Number of retry attempts for failed tasks.
 * @param {number} [retryDelay=1000] - Initial delay between retry attempts in milliseconds.
 * @param {number} [maxConcurrent=Infinity] - Maximum number of tasks to process concurrently.
 * @returns {Promise<any[]>} A promise that resolves to an array of results from the processed tasks.
 * @throws {Error} If one or more tasks fail after all retry attempts.
 */
export async function batchProcess(
    taskFns,
    delay,
    progressCallback,
    retryAttempts = 3,
    retryDelay = 1000,
    maxConcurrent = Infinity
) {
    const results = new Array(taskFns.length);
    const totalTasks = taskFns.length;
    const errors = [];

    // Processes a single task with retry logic
    const processTask = async (taskFn, index) => {
        let attempts = 0;
        while (attempts < retryAttempts) {
            try {
                const result = await taskFn();
                results[index] = result;
                if (progressCallback) {
                    progressCallback((index + 1) / totalTasks, result);
                }
                return;
            } catch (error) {
                attempts++;
                console.error(`Error processing task ${index} (Attempt ${attempts}/${retryAttempts}):`, error);
                if (attempts < retryAttempts) {
                    const backoffDelay = retryDelay * 2 ** (attempts - 1);
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                } else {
                    errors.push({ index, error });
                }
            }
        }
        // If all attempts fail, set the result to null
        results[index] = null;
        if (progressCallback) {
            progressCallback((index + 1) / totalTasks, null);
        }
    };

    // Controls the concurrency of task execution
    const throttle = (taskFunctions) => {
        const executing = new Set();
        return taskFunctions.map((taskFn, index) => ({
            execute: async () => {
                while (executing.size >= maxConcurrent) {
                    await Promise.race(executing);
                }
                const promise = taskFn().finally(() => executing.delete(promise));
                executing.add(promise);
                await promise;
            },
            index
        }));
    };

    // Wrap each task with the processTask function
    const throttledTasks = throttle(
        taskFns.map((taskFn, index) => async () => processTask(taskFn, index))
    );

    // Execute tasks with optional delay between each
    for (const { execute } of throttledTasks) {
        await execute();
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    if (errors.length > 0) {
        console.warn(`${errors.length} tasks failed after all retry attempts.`);
        const errorDetails = errors.map(e => `Task ${e.index}: ${e.error.message}`).join('; ');
        throw new Error(`Batch processing failed: ${errors.length} tasks failed after all retry attempts. Details: ${errorDetails}`);
    }

    return results;
}

/**
 * Creates and processes batches of asynchronous tasks from an array of items with advanced options.
 * 
 * How it works:
 * 1. Initializes processing parameters based on provided options
 * 2. Iterates through the items, creating batches of appropriate size
 * 3. Processes each batch using the batchProcess function
 * 4. Adjusts batch size dynamically based on processing time
 * 5. Collects and returns results from all processed batches
 * 
 * Usage example:
 * const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
 * const processingFunction = async (item) => await someAsyncOperation(item);
 * const results = await createAndProcessBatch(items, processingFunction, {
 *   initialBatchSize: 3,
 *   progressCallback: (progress) => console.log(`Overall progress: ${progress * 100}%`)
 * });
 * 
 * Files that use this function:
 * - js/chat/batchProcessor/batch-processor.js (internal use)
 * - js/services/dataProcessingService.js
 * - js/components/largeDatasetHandler.js
 * 
 * Role in overall program logic:
 * This function is essential for processing large datasets or performing numerous
 * asynchronous operations efficiently. It provides a high-level interface for
 * batch processing with adaptive sizing, making it useful in scenarios like
 * bulk data updates, large-scale API interactions, or any situation where
 * processing needs to be done in optimized batches.
 * 
 * @param {any[]} items - An array of items to be processed.
 * @param {function} processingFunction - A function that takes an item and returns a promise.
 * @param {Object} [options={}] - Configuration options for batch processing.
 * @param {number} [options.initialBatchSize=10] - The initial number of items to process in each batch.
 * @param {number} [options.minBatchSize=1] - The minimum number of items to process in a batch.
 * @param {number} [options.maxBatchSize=50] - The maximum number of items to process in a batch.
 * @param {number} [options.delay=0] - Delay between processing each item in milliseconds.
 * @param {number} [options.retryAttempts=3] - Number of retry attempts for failed tasks.
 * @param {number} [options.retryDelay=1000] - Initial delay between retry attempts in milliseconds.
 * @param {number} [options.maxConcurrent=Infinity] - Maximum number of tasks to process concurrently.
 * @param {function} [options.progressCallback] - Optional callback function to report overall progress.
 * @param {number} [options.adaptiveThreshold=0.8] - Threshold for adjusting batch size based on processing time.
 * @returns {Promise<any[]>} A promise that resolves to an array of results from the processed items.
 * @throws {Error} If batch processing fails.
 */
export async function createAndProcessBatch(items, processingFunction, options = {}) {
    const {
        initialBatchSize = 10,
        minBatchSize = 1,
        maxBatchSize = 50,
        delay = 0,
        retryAttempts = 3,
        retryDelay = 1000,
        maxConcurrent = Infinity,
        progressCallback,
        adaptiveThreshold = 0.8
    } = options;

    const results = [];
    const totalItems = items.length;
    let processedItems = 0;
    let currentBatchSize = initialBatchSize;
    let lastBatchDuration = 0;

    for (let i = 0; i < items.length;) {
        const batch = items.slice(i, i + currentBatchSize);
        const taskFns = batch.map(item => async () => {
            try {
                return await processingFunction(item);
            } catch (error) {
                console.error(`Error in processing function for item at index ${i}: ${error.message}`);
                throw error;
            }
        });

        const batchStartTime = Date.now();
        try {
            const batchResults = await batchProcess(
                taskFns,
                delay,
                (progress, result) => {
                    processedItems++;
                    if (progressCallback) {
                        progressCallback(processedItems / totalItems, result);
                    }
                },
                retryAttempts,
                retryDelay,
                maxConcurrent
            );
            results.push(...batchResults);
        } catch (error) {
            console.error(`Batch processing failed: ${error.message}`);
            throw error;
        }

        const batchEndTime = Date.now();
        lastBatchDuration = batchEndTime - batchStartTime;

        // Adaptive batch sizing logic based on processing time
        const expectedDuration = adaptiveThreshold * delay * currentBatchSize;
        if (lastBatchDuration < expectedDuration) {
            currentBatchSize = Math.min(currentBatchSize * 2, maxBatchSize);
        } else if (lastBatchDuration > delay * currentBatchSize) {
            currentBatchSize = Math.max(Math.floor(currentBatchSize / 2), minBatchSize);
        }

        i += batch.length;
    }

    return results;
}

/**
 * Processes a set of requests in batches using the provided processing function.
 * 
 * How it works:
 * 1. Calls createAndProcessBatch with a set of predefined options
 * 2. Uses a custom progress callback to log batch progress
 * 3. Returns the results from createAndProcessBatch
 * 
 * Usage example:
 * const requests = [
 *   { id: 1, data: 'request1' },
 *   { id: 2, data: 'request2' },
 *   { id: 3, data: 'request3' }
 * ];
 * const processingFunction = async (request) => await processRequest(request);
 * const results = await processBatchedRequests(requests, processingFunction);
 * 
 * Files that use this function:
 * - js/chat/batchProcessor/batch-processor.js (internal use)
 * - js/services/requestHandler.js
 * - js/components/bulkOperationManager.js
 * 
 * Role in overall program logic:
 * This function serves as a high-level interface for batch processing requests.
 * It's particularly useful in scenarios where multiple API requests or data
 * processing operations need to be performed in batches, such as bulk updates,
 * data synchronization, or any operation involving multiple similar requests.
 * The function abstracts away the complexity of batch processing, providing
 * a simple interface with predefined optimal settings.
 * 
 * @param {any[]} requests - An array of requests to be processed.
 * @param {function} processingFunction - A function that takes a request and returns a promise.
 * @returns {Promise<any[]>} A promise that resolves to an array of results from the processed requests.
 */
export async function processBatchedRequests(requests, processingFunction) {
    return createAndProcessBatch(requests, processingFunction, {
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
        adaptiveThreshold: 0.8
    });
}
