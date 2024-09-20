import { getTokenCount } from './tokenUtils.js';
import { logger } from './logger.js';

const RATE_LIMITS = {
    "llama3-groq-8b-8192-tool-use-preview": { rpm: 60, tpm: 100000 },
    "llama3-8b-8192": { rpm: 60, tpm: 100000 },
    "llama3-70b-8192": { rpm: 30, tpm: 6000 },
    "gemma-7b-it": { rpm: 30, tpm: 15000 },
    "gemma2-9b-it": { rpm: 30, tpm: 15000 },
    "llama-3.1-70b-versatile": { rpm: 30, tpm: 20000, dailyTokens: 1000000 },
    "llama-3.1-8b-instant": { rpm: 30, tpm: 20000, dailyTokens: 1000000 },
    "llama3-groq-70b-8192-tool-use-preview": { rpm: 30, tpm: 15000 },
    "mixtral-8x7b-32768": { rpm: 30, tpm: 5000 }
};

/**
 * Checks if a given model is available in the RATE_LIMITS object.
 * @param {string} model - The name of the model to check.
 * @returns {boolean} True if the model is available, false otherwise.
 */
function isModelAvailable(model) {
    return model in RATE_LIMITS;
}

/**
 * ModelRateLimiter class manages rate limiting for specific AI models.
 * It ensures that requests to the model don't exceed the defined rate limits.
 */
class ModelRateLimiter {
    /**
     * Creates a new ModelRateLimiter instance.
     * @param {string} model - The name of the AI model.
     */
    constructor(model) {
        this.limits = RATE_LIMITS[model] || { rpm: 10, tpm: 5000 }; // Default limits
        this.lastRequestTime = 0;
        this.requestCount = 0;
        this.tokenCount = 0;
        this.requestQueue = [];
    }

    /**
     * Schedules a request to be processed when rate limits allow.
     * @param {number} tokens - The number of tokens in the request.
     * @returns {Promise} Resolves when the request can be processed.
     */
    async scheduleRequest(tokens) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ tokens, resolve, reject });
            this.processQueue();
        });
    }

    /**
     * Processes the queue of requests, respecting rate limits.
     * This method is called internally and manages the timing of requests.
     */
    async processQueue() {
        if (this.requestQueue.length === 0) return;

        const now = Date.now();
        const elapsedMinutes = (now - this.lastRequestTime) / 60000;

        if (elapsedMinutes >= 1) {
            // Reset counters if a minute has passed
            this.requestCount = 0;
            this.tokenCount = 0;
            this.lastRequestTime = now;
        }

        const { tokens, resolve, reject } = this.requestQueue[0];

        if (this.requestCount >= this.limits.rpm || this.tokenCount + tokens > this.limits.tpm) {
            const delay = Math.max(60000 - (now - this.lastRequestTime), 1000); // At least 1 second delay
            setTimeout(() => this.processQueue(), delay);
            return;
        }

        this.requestCount++;
        this.tokenCount += tokens;
        this.requestQueue.shift();
        resolve();

        // Process next request in queue
        if (this.requestQueue.length > 0) {
            setImmediate(() => this.processQueue());
        }
    }
}

const rateLimiters = {};

/**
 * Gets or creates a rate limiter for a specific model.
 * @param {string} model - The name of the AI model.
 * @returns {ModelRateLimiter} The rate limiter for the specified model.
 */
export function getRateLimiter(model) {
    if (!rateLimiters[model]) {
        rateLimiters[model] = new ModelRateLimiter(model);
    }
    return rateLimiters[model];
}

/**
 * Schedules a request for a specific model, respecting rate limits.
 * 
 * @param {string} model - The name of the AI model.
 * @param {Array} messages - The messages to be processed by the model.
 * @throws {Error} If the model parameter is invalid.
 * 
 * Usage example:
 * ```javascript
 * try {
 *   await scheduleRequest('llama3-8b-8192', [{ role: 'user', content: 'Hello, AI!' }]);
 *   // Proceed with the API call to the AI model
 * } catch (error) {
 *   console.error('Failed to schedule request:', error);
 * }
 * ```
 * 
 * This function is used in:
 * - src/services/aiService.js
 * - src/controllers/chatController.js
 * - src/workers/batchProcessor.js
 * 
 * Role in program logic:
 * This function acts as a gatekeeper for all AI model requests, ensuring that
 * the application respects the rate limits for each model. It's a crucial part
 * of the request pipeline, sitting between the application logic and the actual
 * API calls to the AI models.
 */
export async function scheduleRequest(model, messages) {
    if (typeof model !== 'string' || !model) {
        logger.error(`Invalid model parameter in scheduleRequest: ${model}`);
        throw new Error('Invalid input: model must be a string');
    }
    const tokens = await getTokenCount(messages);
    const limiter = getRateLimiter(model);
    await limiter.scheduleRequest(tokens);
}

/**
 * Retrieves the current rate limit status for a specific model.
 * @param {string} model - The name of the AI model.
 * @returns {Object|null} The rate limit status or null if the model is not available.
 */
export function getRateLimitStatus(model) {
    if (!isModelAvailable(model)) {
        logger.warn(`No rate limiter found for model: ${model}`);
        return null;
    }
    const limiter = getRateLimiter(model);
    return {
        model: model,
        currentRPM: limiter.limits.rpm,
        currentTPM: limiter.limits.tpm,
        queueLength: limiter.requestQueue.length,
        currentRequestCount: limiter.requestCount,
        currentTokenCount: limiter.tokenCount
    };
}

/**
 * Resets the rate limits for a specific model to its original values.
 * @param {string} model - The name of the AI model.
 */
export function resetRateLimits(model) {
    if (!isModelAvailable(model)) {
        logger.warn(`No rate limiter found for model: ${model}`);
        return;
    }
    const originalLimits = RATE_LIMITS[model];
    rateLimiters[model] = new ModelRateLimiter(model);
    logger.info(`Rate limits reset to original values for model: ${model}`);
}

/**
 * Returns an array of all available AI model names.
 * @returns {Array<string>} An array of model names.
 */
export function getAvailableModels() {
    return Object.keys(RATE_LIMITS);
}

/**
 * Updates the rate limits for a specific model.
 * @param {string} model - The name of the AI model.
 * @param {Object} newLimits - The new limits to set.
 */
export function updateRateLimits(model, newLimits) {
    if (!isModelAvailable(model)) {
        logger.warn(`No rate limiter found for model: ${model}`);
        return;
    }
    const limiter = getRateLimiter(model);
    limiter.limits = { ...limiter.limits, ...newLimits };
    logger.info(`Updated rate limits for model: ${model}`, limiter.limits);
}