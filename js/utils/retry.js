import { logger } from './logger.js';

/**
 * Implements an exponential backoff retry strategy with jitter and enhanced logging.
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
 * @param {number} ms - Duration to wait in milliseconds.
 * @returns {Promise<void>}
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Implements a sophisticated circuit breaker pattern with half-open state.
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
 * @param {Function} fn - The function to execute with retry and circuit breaker protection.
 * @param {number} [retries=5] - Maximum number of retries.
 * @param {number} [delay=1000] - Initial delay for retry in milliseconds.
 * @param {number} [factor=2] - Exponential backoff factor.
 * @returns {Promise<any>}
 */
export const executeWithRetryAndCircuitBreaker = async (fn, retries = 5, delay = 1000, factor = 2) => {
    return circuitBreaker.call(() => retryWithExponentialBackoff(fn, retries, delay, factor));
};