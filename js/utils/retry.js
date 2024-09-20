import { logger } from './logger.js';

/**
 * Implements an exponential backoff retry strategy with jitter and enhanced logging.
 * 
 * How it works:
 * 1. Attempts to execute the provided function.
 * 2. If successful, returns the result.
 * 3. If an error occurs, it waits for a calculated delay and retries.
 * 4. The delay increases exponentially with each retry attempt.
 * 5. Adds a small random jitter to the delay to prevent synchronized retries.
 * 6. Logs warnings and errors for each retry and failure.
 * 
 * Usage examples:
 * const fetchData = async () => {
 *   const response = await fetch('https://api.example.com/data');
 *   if (!response.ok) throw new Error('API request failed');
 *   return response.json();
 * };
 * 
 * try {
 *   const data = await retryWithExponentialBackoff(fetchData);
 *   console.log('Data fetched successfully:', data);
 * } catch (error) {
 *   console.error('Failed to fetch data after multiple retries:', error);
 * }
 * 
 * Files using this function:
 * - js/services/apiService.js
 * - js/utils/dataFetcher.js
 * - js/components/DataLoader.js
 * 
 * Role in program logic:
 * This function is crucial for improving the reliability of network requests and other
 * potentially failing operations. It helps the application gracefully handle temporary
 * failures and network issues, enhancing overall robustness and user experience.
 * 
 * For more detailed documentation, see:
 * [Retry Strategies](docs/error-handling/retry-strategies.md)
 * [API Request Best Practices](docs/api/best-practices.md#retrying-failed-requests)
 * 
 * @param {Function} fn - The asynchronous function to retry.
 * @param {number} [maxRetries=5] - Maximum number of retries.
 * @param {number} [baseDelay=1000] - Initial delay in milliseconds.
 * @param {number} [factor=2] - Exponential growth factor.
 * @returns {Promise<any>}
 */
export const retryWithExponentialBackoff = async (fn, maxRetries = 5, baseDelay = 1000, factor = 2) => {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            return await fn();
        } catch (error) {
            retries++;
            if (retries >= maxRetries) {
                logger.error(`Operation failed after ${maxRetries} retries. Last error:`, error);
                throw error;
            }

            const delay = baseDelay * (factor ** (retries - 1));
            logger.warn(`Request failed. Retrying in ${delay} ms... (${maxRetries - retries} retries left). Error: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

/**
 * Calculates the delay for the next retry attempt with jitter.
 * 
 * How it works:
 * 1. Calculates the base exponential delay.
 * 2. Adds a random jitter of up to 10% of the base delay.
 * 3. Returns the final delay value.
 * 
 * Usage example:
 * const delay = calculateDelay(1000, 2, 3);
 * console.log(`Waiting for ${delay} ms before next retry`);
 * 
 * Files using this function:
 * - This function is used internally by retryWithExponentialBackoff
 * 
 * Role in program logic:
 * This function helps prevent the "thundering herd" problem by adding randomness
 * to retry delays, reducing the likelihood of multiple clients retrying simultaneously.
 * 
 * For more information on jitter in retry strategies, see:
 * [Jitter in Retry Algorithms](docs/error-handling/jitter-explanation.md)
 * 
 * @param {number} baseDelay - The base delay in milliseconds.
 * @param {number} factor - The exponential factor.
 * @param {number} attempt - The current attempt number.
 * @returns {number} The calculated delay with jitter.
 */
const calculateDelay = (baseDelay, factor, attempt) => {
    const exponentialDelay = baseDelay * Math.pow(factor, attempt - 1);
    const jitter = Math.random() * exponentialDelay * 0.1; // 10% jitter
    return exponentialDelay + jitter;
};

/**
 * Waits for the specified duration.
 * 
 * How it works:
 * Creates a Promise that resolves after the specified time using setTimeout.
 * 
 * Usage example:
 * console.log('Starting wait');
 * await wait(2000);
 * console.log('Finished waiting after 2 seconds');
 * 
 * Files using this function:
 * - js/utils/asyncUtils.js
 * - js/components/LoadingIndicator.js
 * 
 * Role in program logic:
 * This utility function is used to create delays in asynchronous operations,
 * useful for timeouts, animations, or simulating network latency in tests.
 * 
 * For more async utility functions, see:
 * [Async Utilities Documentation](docs/utils/async-utils.md)
 * 
 * @param {number} ms - Duration to wait in milliseconds.
 * @returns {Promise<void>}
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Implements a sophisticated circuit breaker pattern with half-open state.
 * 
 * How it works:
 * 1. Tracks the number of consecutive failures.
 * 2. When failures exceed a threshold, it "opens" the circuit, preventing further calls.
 * 3. After a timeout, it enters a "half-open" state, allowing a test call.
 * 4. If the test call succeeds, it "closes" the circuit; if it fails, it reopens.
 * 
 * Usage example:
 * const breaker = new CircuitBreaker();
 * try {
 *   const result = await breaker.call(() => fetchDataFromAPI());
 *   console.log('API call successful:', result);
 * } catch (error) {
 *   console.error('API call failed or circuit is open:', error);
 * }
 * 
 * Files using this class:
 * - js/services/apiService.js
 * - js/utils/networkManager.js
 * 
 * Role in program logic:
 * The CircuitBreaker helps prevent cascading failures in distributed systems
 * by quickly failing calls to services that are likely to fail, allowing them
 * time to recover.
 * 
 * For more on the Circuit Breaker pattern, see:
 * [Circuit Breaker Pattern](docs/design-patterns/circuit-breaker.md)
 * [Resilience in Distributed Systems](docs/architecture/resilience.md)
 */
class CircuitBreaker {
    /**
     * @param {number} [failureThreshold=3] - Number of failures before opening the circuit.
     * @param {number} [resetTimeout=30000] - Time in milliseconds before attempting to close the circuit.
     * @param {number} [halfOpenTimeout=5000] - Time in milliseconds to wait in half-open state.
     */
    constructor(failureThreshold = 3, resetTimeout = 30000, halfOpenTimeout = 5000) {
        this.failureThreshold = failureThreshold;
        this.resetTimeout = resetTimeout;
        this.halfOpenTimeout = halfOpenTimeout;
        this.failures = 0;
        this.state = 'CLOSED';
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
    }

    /**
     * Executes the provided function based on the current state of the circuit breaker.
     * @param {Function} fn - The function to execute.
     * @returns {Promise<any>}
     * @throws {Error} If the circuit is open or the function execution fails.
     */
    async call(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() >= this.nextAttemptTime) {
                return this.attemptHalfOpen(fn);
            }
            logger.warn('Circuit breaker is open. Rejecting call.');
            throw new Error('Circuit breaker is open');
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error);
            throw error;
        }
    }

    /**
     * Attempts to execute the function in a half-open state.
     * @param {Function} fn - The function to execute.
     * @returns {Promise<any>}
     */
    async attemptHalfOpen(fn) {
        this.state = 'HALF-OPEN';
        logger.info('Circuit breaker entering HALF-OPEN state');

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error);
            throw error;
        }
    }

    /**
     * Handles successful function execution.
     */
    onSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
        logger.info('Circuit breaker closed after successful operation');
    }

    /**
     * Handles function execution failure.
     * @param {Error} error - The error that occurred.
     */
    onFailure(error) {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttemptTime = Date.now() + this.resetTimeout;
            logger.warn(`Circuit breaker opened. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`);
        } else if (this.state === 'HALF-OPEN') {
            this.state = 'OPEN';
            this.nextAttemptTime = Date.now() + this.halfOpenTimeout;
            logger.warn(`Circuit breaker reopened from HALF-OPEN state. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`);
        }

        logger.error(`Operation failed. Total failures: ${this.failures}`, error);
    }

    /**
     * Resets the circuit breaker to its initial state.
     */
    reset() {
        this.failures = 0;
        this.state = 'CLOSED';
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
        logger.info('Circuit breaker has been reset');
    }
}

export const circuitBreaker = new CircuitBreaker();

/**
 * Combines the circuit breaker and retry mechanism for robust error handling.
 * 
 * How it works:
 * 1. Attempts to execute the function using the circuit breaker.
 * 2. If the circuit is closed, it uses the retry mechanism for the function call.
 * 3. If the circuit opens during retries, it will stop further attempts.
 * 
 * Usage example:
 * const fetchData = async () => {
 *   const response = await fetch('https://api.example.com/data');
 *   if (!response.ok) throw new Error('API request failed');
 *   return response.json();
 * };
 * 
 * try {
 *   const data = await executeWithRetryAndCircuitBreaker(fetchData);
 *   console.log('Data fetched successfully:', data);
 * } catch (error) {
 *   console.error('Failed to fetch data:', error);
 * }
 * 
 * Files using this function:
 * - js/services/dataService.js
 * - js/components/DataFetcher.js
 * - js/utils/apiWrapper.js
 * 
 * Role in program logic:
 * This function combines two powerful error handling strategies to create a robust
 * mechanism for dealing with unreliable services or network conditions. It's particularly
 * useful for critical API calls or operations that need to be resilient against transient failures.
 * 
 * For more on combining retry and circuit breaker patterns, see:
 * [Advanced Error Handling Strategies](docs/error-handling/advanced-strategies.md)
 * [Resilient API Calls](docs/api/resilient-calls.md)
 * 
 * @param {Function} fn - The function to execute with retry and circuit breaker protection.
 * @param {number} [retries=5] - Maximum number of retries.
 * @param {number} [delay=1000] - Initial delay for retry in milliseconds.
 * @param {number} [factor=2] - Exponential backoff factor.
 * @returns {Promise<any>}
 */
export const executeWithRetryAndCircuitBreaker = async (fn, retries = 5, delay = 1000, factor = 2) => {
    return circuitBreaker.call(() => retryWithExponentialBackoff(fn, retries, delay, factor));
};