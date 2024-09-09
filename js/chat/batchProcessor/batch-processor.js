/**
 * Processes a batch of promises with optimized performance and advanced error handling.
 * @param {Promise[]} promises - An array of promises to be processed.
 * @param {number} delay - The delay in milliseconds between processing each promise.
 * @param {function} [progressCallback] - Optional callback function to report progress.
 * @param {number} [retryAttempts=3] - Number of retry attempts for failed promises.
 * @param {number} [retryDelay=1000] - Initial delay between retry attempts in milliseconds.
 * @param {number} [maxConcurrent=Infinity] - Maximum number of promises to process concurrently.
 * @returns {Promise<any[]>} A promise that resolves to an array of results from the processed promises.
 */
export async function batchProcess(promises, delay, progressCallback, retryAttempts = 3, retryDelay = 1000, maxConcurrent = Infinity) {
    const results = new Array(promises.length);
    const totalPromises = promises.length;
    const errors = [];

    const processPromise = async (promise, index) => {
        let attempts = 0;
        while (attempts < retryAttempts) {
            try {
                const result = await promise;
                results[index] = result;
                if (progressCallback) {
                    progressCallback((index + 1) / totalPromises, result);
                }
                return;
            } catch (error) {
                attempts++;
                console.error(`Error processing batch item ${index} (Attempt ${attempts}/${retryAttempts}):`, error);
                if (attempts < retryAttempts) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempts - 1)));
                } else {
                    errors.push({ index, error });
                }
            }
        }
        results[index] = null;
        if (progressCallback) {
            progressCallback((index + 1) / totalPromises, null);
        }
    };

    const throttle = (promiseFns) => {
        const executing = new Set();
        return promiseFns.map((promiseFn, index) => {
            return {
                execute: async () => {
                    while (executing.size >= maxConcurrent) {
                        await Promise.race(executing);
                    }
                    const promise = promiseFn();
                    executing.add(promise);
                    try {
                        await promise;
                    } finally {
                        executing.delete(promise);
                    }
                },
                index
            };
        });
    };

    const throttledPromises = throttle(promises.map((promise, index) => () => processPromise(promise, index)));

    for (const { execute } of throttledPromises) {
        await execute();
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    if (errors.length > 0) {
        console.warn(`${errors.length} promises failed after all retry attempts.`);
        throw new Error(`Batch processing failed: ${errors.length} promises failed after all retry attempts.`);
    }

    return results;
}

/**
 * Creates and processes batches of promises from an array of items with advanced options.
 * @param {any[]} items - An array of items to be processed.
 * @param {function} processingFunction - A function that takes an item and returns a promise.
 * @param {Object} options - Configuration options for batch processing.
 * @param {number} [options.batchSize=10] - The maximum number of items to process in each batch.
 * @param {number} [options.delay=0] - Delay between processing each item in milliseconds.
 * @param {number} [options.retryAttempts=3] - Number of retry attempts for failed promises.
 * @param {number} [options.retryDelay=1000] - Initial delay between retry attempts in milliseconds.
 * @param {number} [options.maxConcurrent=Infinity] - Maximum number of promises to process concurrently.
 * @param {function} [options.progressCallback] - Optional callback function to report overall progress.
 * @returns {Promise<any[]>} A promise that resolves to an array of results from the processed items.
 */
export async function createAndProcessBatch(items, processingFunction, options = {}) {
    const {
        batchSize = 10,
        delay = 0,
        retryAttempts = 3,
        retryDelay = 1000,
        maxConcurrent = Infinity,
        progressCallback
    } = options;

    const results = [];
    const totalItems = items.length;
    let processedItems = 0;

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchPromises = batch.map(item => async () => {
            try {
                return await processingFunction(item);
            } catch (error) {
                console.error(`Error in processing function: ${error.message}`);
                throw error;
            }
        });
        try {
            const batchResults = await batchProcess(
                batchPromises.map(fn => fn()),
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
    }

    return results;
}

// Add a new function to use batch processing in the main workflow
export async function processBatchedRequests(requests, processingFunction) {
    return createAndProcessBatch(requests, processingFunction, {
        batchSize: 5,
        delay: 1000,
        retryAttempts: 3,
        retryDelay: 1000,
        maxConcurrent: 3,
        progressCallback: (progress) => console.log(`Batch progress: ${(progress * 100).toFixed(2)}%`)
    });
}
