import { rateLimits } from '../config/config.js';
import { availableModels } from './model-info.js';

const tokenBuckets = new Map();

function initializeTokenBuckets() {
    for (const model of availableModels) {
        const limits = rateLimits[model];
        if (limits) {
            tokenBuckets.set(model, {
                tokens: limits.tpm,
                lastRefill: Date.now(),
                rpm: limits.rpm,
                requestCount: 0,
                dailyTokens: limits.dailyTokens || Infinity,
                lastDailyReset: Date.now()
            });
        } else {
            console.warn(`No rate limits defined for model: ${model}`);
        }
    }
}

function refillTokenBuckets() {
    const now = Date.now();
    for (const [model, bucket] of tokenBuckets.entries()) {
        const limits = rateLimits[model];
        if (!limits) {
            console.warn(`No rate limits defined for model: ${model}`);
            continue;
        }
        const timePassed = now - bucket.lastRefill;
        const minutesPassed = timePassed / 60000;
        const tokensToAdd = minutesPassed * limits.tpm;
        
        bucket.tokens = Math.min(bucket.tokens + tokensToAdd, limits.tpm);
        bucket.lastRefill = now;

        // Reset RPM counter if a minute has passed
        if (timePassed >= 60000) {
            bucket.rpm = limits.rpm;
            bucket.requestCount = 0;
        }

        // Handle daily token limit if applicable
        if (limits.dailyTokens) {
            const daysPassed = Math.floor((now - bucket.lastDailyReset) / (24 * 60 * 60 * 1000));
            if (daysPassed > 0) {
                bucket.dailyTokens = limits.dailyTokens;
                bucket.lastDailyReset = now;
            }
        }
    }
}

function logApiUsageStats() {
    const stats = {
        modelStats: {}
    };
    for (const [model, bucket] of tokenBuckets.entries()) {
        stats.modelStats[model] = {
            tokens: bucket.tokens.toFixed(2),
            rpm: bucket.rpm,
            requestCount: bucket.requestCount,
            dailyTokens: bucket.dailyTokens
        };
    }
    console.log('API Usage Stats:', JSON.stringify(stats, null, 2));
    // You could send these stats to a monitoring service here
}

export { initializeTokenBuckets, refillTokenBuckets, tokenBuckets, rateLimits, logApiUsageStats };
