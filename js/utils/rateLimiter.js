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

function isModelAvailable(model) {
    return model in RATE_LIMITS;
}

class ModelRateLimiter {
    constructor(model) {
        this.limits = RATE_LIMITS[model] || { rpm: 10, tpm: 5000 }; // Default limits
        this.lastRequestTime = 0;
        this.requestCount = 0;
        this.tokenCount = 0;
        this.requestQueue = [];
    }

    async scheduleRequest(tokens) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ tokens, resolve, reject });
            this.processQueue();
        });
    }

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

export function getRateLimiter(model) {
    if (!rateLimiters[model]) {
        rateLimiters[model] = new ModelRateLimiter(model);
    }
    return rateLimiters[model];
}

export async function scheduleRequest(model, messages) {
    if (typeof model !== 'string' || !model) {
        logger.error(`Invalid model parameter in scheduleRequest: ${model}`);
        throw new Error('Invalid input: model must be a string');
    }
    const tokens = await getTokenCount(messages);
    const limiter = getRateLimiter(model);
    await limiter.scheduleRequest(tokens);
}

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

export function resetRateLimits(model) {
    if (!isModelAvailable(model)) {
        logger.warn(`No rate limiter found for model: ${model}`);
        return;
    }
    const originalLimits = RATE_LIMITS[model];
    rateLimiters[model] = new ModelRateLimiter(model);
    logger.info(`Rate limits reset to original values for model: ${model}`);
}

export function getAvailableModels() {
    return Object.keys(RATE_LIMITS);
}

export function updateRateLimits(model, newLimits) {
    if (!isModelAvailable(model)) {
        logger.warn(`No rate limiter found for model: ${model}`);
        return;
    }
    const limiter = getRateLimiter(model);
    limiter.limits = { ...limiter.limits, ...newLimits };
    logger.info(`Updated rate limits for model: ${model}`, limiter.limits);
}