// js/utils/retryHandler.js
/**
 * Retries an asynchronous operation with a specified delay and number of retries.
 * 
 * This function attempts to execute the provided operation. If it fails, it will
 * retry the operation after a specified delay, for a maximum number of retries.
 * 
 * @param {Function} operation - An async function to be executed and potentially retried.
 * @param {number} delay - The delay in milliseconds between retry attempts.
 * @param {number} retries - The maximum number of retry attempts.
 * @returns {Promise<any>} - The result of the successful operation.
 * @throws {Error} - If all retry attempts fail, the last error is thrown.
 * 
 * @example
 * // Example usage:
 * const fetchData = async () => {
 *   const response = await fetch('https://api.example.com/data');
 *   if (!response.ok) throw new Error('Failed to fetch data');
 *   return response.json();
 * };
 * 
 * try {
 *   const data = await retryOperation(fetchData, 1000, 3);
 *   console.log('Data fetched successfully:', data);
 * } catch (error) {
 *   console.error('Failed to fetch data after multiple attempts:', error);
 * }
 * 
 * @fileUsage
 * This function is used in the following files:
 * - js/api/dataFetcher.js
 * - js/services/authService.js
 * - js/components/DataLoader.js
 * 
 * @programLogic
 * This function plays a crucial role in improving the reliability of network
 * requests and other potentially unreliable operations. It's particularly
 * useful for handling temporary network issues or API rate limiting.
 * 
 * @see {@link https://example.com/docs/retry-strategies|Retry Strategies Documentation}
 * @see {@link https://example.com/docs/error-handling|Error Handling Best Practices}
 */
export async function retryOperation(operation, delay, retries) {
    try {
        // Attempt to execute the provided operation
        return await operation();
    } catch (error) {
        // If there are remaining retries, wait and then retry the operation
        if (retries > 0) {
            // Wait for the specified delay
            await new Promise(res => setTimeout(res, delay));
            // Recursively call retryOperation with one less retry
            return retryOperation(operation, delay, retries - 1);
        } else {
            // If no more retries left, throw the last error
            throw error;
        }
    }
}