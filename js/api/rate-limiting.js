import { RATE_LIMITS, AVAILABLE_MODELS } from '../config/model-config.js';

/**
 * @typedef {Object} TokenBucket
 * @property {number} tokens - Available tokens.
 * @property {number} lastRefill - Timestamp of the last refill.
 * @property {number} rpm - Requests per minute limit.
 * @property {number} requestCount - Number of requests made in the current minute.
 * @property {number} dailyTokens - Remaining daily tokens.
 * @property {number} lastDailyReset - Timestamp of the last daily reset.
 */

const tokenBuckets = new Map();
const MILLISECONDS_PER_MINUTE = 60000;
const MILLISECONDS_PER_DAY = 86400000;

/**
 * Initializes token buckets for all available models.
 */
function initializeTokenBuckets() {
    const now = Date.now();
    AVAILABLE_MODELS.forEach(model => {
        const limits = RATE_LIMITS[model];
        if (limits) {
            tokenBuckets.set(model, {
                tokens: limits.tpm,
                lastRefill: now,
                rpm: limits.rpm,
                requestCount: 0,
                dailyTokens: limits.dailyTokens || Infinity,
                lastDailyReset: now
            });
        } else {
            console.warn(`No rate limits defined for model: ${model}`);
        }
    });
}

/**
 * Refills tokens in all token buckets based on elapsed time.
 */
function refillTokenBuckets() {
    const now = Date.now();
    tokenBuckets.forEach((bucket, model) => {
        const limits = RATE_LIMITS[model];
        if (!limits) {
            console.warn(`No rate limits defined for model: ${model}`);
            return;
        }

        const timePassed = now - bucket.lastRefill;
        const minutesPassed = timePassed / MILLISECONDS_PER_MINUTE;
        const tokensToAdd = minutesPassed * limits.tpm;

        bucket.tokens = Math.min(bucket.tokens + tokensToAdd, limits.tpm);
        bucket.lastRefill = now;

        // Reset RPM counter if a minute has passed
        if (timePassed >= MILLISECONDS_PER_MINUTE) {
            bucket.requestCount = 0;
        }

        // Handle daily token limit reset
        if (limits.dailyTokens !== Infinity) {
            const daysPassed = Math.floor((now - bucket.lastDailyReset) / MILLISECONDS_PER_DAY);
            if (daysPassed > 0) {
                bucket.dailyTokens = limits.dailyTokens;
                bucket.lastDailyReset = now;
            }
        }
    });
}

/**
 * Logs API usage statistics.
 */
function logApiUsageStats() {
    const stats = {
        timestamp: new Date().toISOString(),
        modelStats: {}
    };
    tokenBuckets.forEach((bucket, model) => {
        stats.modelStats[model] = {
            availableTokens: bucket.tokens.toFixed(2),
            requestsRemaining: bucket.rpm - bucket.requestCount,
            dailyTokensRemaining: bucket.dailyTokens.toFixed(2),
            lastRefill: new Date(bucket.lastRefill).toISOString(),
            lastDailyReset: new Date(bucket.lastDailyReset).toISOString()
        };
    });
    console.log('API Usage Stats:', JSON.stringify(stats, null, 2));
    sendStatsToMonitoringService(stats);
}

/**
 * Sends API usage statistics to a monitoring service.
 * @param {Object} stats - The statistics to send.
 */
function sendStatsToMonitoringService(stats) {
    // Placeholder for integrating with an actual monitoring service
    console.log('=== API Usage Stats for Monitoring ===');
    console.log(`Timestamp: ${stats.timestamp}`);
    Object.entries(stats.modelStats).forEach(([model, modelStats]) => {
        console.log(`\nModel: ${model}`);
        console.log(`  Available Tokens: ${modelStats.availableTokens}`);
        console.log(`  Requests Remaining This Minute: ${modelStats.requestsRemaining}`);
        console.log(`  Daily Tokens Remaining: ${modelStats.dailyTokensRemaining}`);
        console.log(`  Last Refill: ${modelStats.lastRefill}`);
        console.log(`  Last Daily Reset: ${modelStats.lastDailyReset}`);
    });
    console.log('=== End of API Usage Stats ===\n');
}

/**
 * Checks if the rate limit is exceeded for a model.
 * @param {string} model - The model name.
 * @param {number} estimatedTokens - Estimated tokens for the request.
 * @returns {boolean} True if within limits.
 * @throws Will throw an error if any limit is exceeded.
 */
function checkRateLimit(model, estimatedTokens) {
    const bucket = tokenBuckets.get(model);
    if (!bucket) {
        throw new Error(`Rate limit information not available for model ${model}`);
    }

    if (bucket.requestCount >= bucket.rpm) {
        throw new Error(`Rate limit exceeded for model ${model}. Max requests per minute: ${bucket.rpm}`);
    }

    if (bucket.tokens < estimatedTokens) {
        throw new Error(`Token limit exceeded for model ${model}. Available tokens: ${bucket.tokens.toFixed(2)}, Required: ${estimatedTokens}`);
    }

    if (bucket.dailyTokens < estimatedTokens) {
        throw new Error(`Daily token limit exceeded for model ${model}. Remaining daily tokens: ${bucket.dailyTokens.toFixed(2)}, Required: ${estimatedTokens}`);
    }

    return true;
}

/**
 * Consumes tokens and increments request count.
 * @param {string} model - The model name.
 * @param {number} tokensUsed - Tokens to consume.
 */
function consumeTokens(model, tokensUsed) {
    const bucket = tokenBuckets.get(model);
    if (!bucket) {
        throw new Error(`Rate limit information not available for model ${model}`);
    }

    bucket.tokens -= tokensUsed;
    bucket.dailyTokens -= tokensUsed;
    bucket.requestCount++;
}

export {
    initializeTokenBuckets,
    refillTokenBuckets,
    tokenBuckets,
    RATE_LIMITS,
    logApiUsageStats,
    checkRateLimit,
    consumeTokens
};