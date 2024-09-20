/**
 * Implements an exponential backoff strategy for retrying asynchronous functions.
 * 
 * This function attempts to execute a given asynchronous function, and if it fails due to rate limiting,
 * it will retry the function with increasing delays between attempts. The delay increases exponentially
 * up to a maximum delay time.
 * 
 * How it works:
 * 1. The function attempts to execute the provided async function.
 * 2. If the function succeeds, it returns the result immediately.
 * 3. If the function fails with a "Rate limit exceeded" error:
 *    a. It increments the retry counter.
 *    b. If the maximum number of retries is reached, it throws the error.
 *    c. Otherwise, it waits for the current delay period.
 *    d. It then doubles the delay period (up to the maximum delay) for the next attempt.
 * 4. If the function fails with any other error, it throws that error immediately.
 * 
 * Usage example:
 * ```
 * const fetchData = async () => {
 *   // API call that might hit rate limits
 * };
 * 
 * try {
 *   const result = await exponentialBackoff(fetchData, {
 *     maxRetries: 5,
 *     initialDelay: 2000,
 *     maxDelay: 60000
 *   });
 *   console.log(result);
 * } catch (error) {
 *   console.error('Failed after multiple retries:', error);
 * }
 * ```
 * 
 * Files that use this function:
 * - js/api/dataFetcher.js
 * - js/services/externalService.js
 * - js/utils/networkRequests.js
 * 
 * Role in overall program logic:
 * This function plays a crucial role in improving the reliability of network requests and API calls
 * throughout the application. It helps manage rate limiting issues gracefully, reducing the likelihood
 * of complete failures due to temporary API restrictions. This is particularly important for maintaining
 * a smooth user experience in features that depend on external data sources or services.
 * 
 * @param {Function} fn - The asynchronous function to be executed with backoff strategy.
 * @param {Object} options - Configuration options for the backoff strategy.
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts.
 * @param {number} [options.initialDelay=1000] - Initial delay in milliseconds before the first retry.
 * @param {number} [options.maxDelay=30000] - Maximum delay in milliseconds between retries.
 * @returns {Promise<*>} - A promise that resolves with the result of the function call, or rejects if all retries fail.
 * @throws {Error} - Throws an error if all retry attempts fail or if a non-rate-limit error occurs.
 */
export async function exponentialBackoff(fn, options) {
    const { maxRetries = 3, initialDelay = 1000, maxDelay = 30000 } = options;
    let retries = 0;
    let delay = initialDelay;

    while (retries < maxRetries) {
        try {
            return await fn();
        } catch (error) {
            if (error.message.includes('Rate limit exceeded')) {
                retries++;
                if (retries >= maxRetries) {
                    throw error;
                }
                console.log(`Rate limit exceeded. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay = Math.min(delay * 2, maxDelay);
            } else {
                throw error;
            }
        }
    }
}