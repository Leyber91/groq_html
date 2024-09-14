import { RATE_LIMITS, AVAILABLE_MODELS, MODEL_INFO } from '../config/model-config.js';

const tokenBuckets = new Map();
const MILLISECONDS_PER_MINUTE = 60000;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function initializeTokenBuckets() {
    const now = Date.now();
    for (const model of AVAILABLE_MODELS) {
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
    }
}

function refillTokenBuckets() {
    const now = Date.now();
    for (const [model, bucket] of tokenBuckets.entries()) {
        const limits = RATE_LIMITS[model];
        if (!limits) {
            console.warn(`No rate limits defined for model: ${model}`);
            continue;
        }

        const timePassed = now - bucket.lastRefill;
        const minutesPassed = timePassed / MILLISECONDS_PER_MINUTE;
        const tokenLimit = limits.tpm;
        const tokensToAdd = minutesPassed * tokenLimit;
        
        bucket.tokens = Math.min(bucket.tokens + tokensToAdd, tokenLimit);
        bucket.lastRefill = now;

        // Reset RPM counter if a minute has passed
        if (timePassed >= MILLISECONDS_PER_MINUTE) {
            bucket.rpm = limits.rpm;
            bucket.requestCount = 0;
        }

        // Handle daily token limit if applicable
        if (limits.dailyTokens) {
            const daysPassed = Math.floor((now - bucket.lastDailyReset) / MILLISECONDS_PER_DAY);
            if (daysPassed > 0) {
                bucket.dailyTokens = limits.dailyTokens;
                bucket.lastDailyReset = now;
            }
        }
    }
}

function logApiUsageStats() {
    const stats = {
        timestamp: new Date().toISOString(),
        modelStats: {}
    };
    for (const [model, bucket] of tokenBuckets.entries()) {
        stats.modelStats[model] = {
            availableTokens: bucket.tokens.toFixed(2),
            requestsPerMinute: bucket.rpm,
            requestsMadeThisMinute: bucket.requestCount,
            dailyTokensRemaining: bucket.dailyTokens.toFixed(2),
            lastRefill: new Date(bucket.lastRefill).toISOString(),
            lastDailyReset: new Date(bucket.lastDailyReset).toISOString()
        };
    }
    console.log('API Usage Stats:', JSON.stringify(stats, null, 2));
    
    // Send stats to a free monitoring service without API requirements
    sendStatsToFreeMonitoringService(stats);
}

function sendStatsToFreeMonitoringService(stats) {
    // Using console.log as a simple, free way to output stats
    console.log('=== API Usage Stats for Free Monitoring ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Environment: ${typeof window !== 'undefined' ? 'browser' : 'node'}`);
    
    for (const [model, modelStats] of Object.entries(stats.modelStats)) {
        console.log(`\nModel: ${model}`);
        console.log(`  Available Tokens: ${modelStats.availableTokens}`);
        console.log(`  Requests Per Minute: ${modelStats.requestsPerMinute}`);
        console.log(`  Requests Made This Minute: ${modelStats.requestsMadeThisMinute}`);
        console.log(`  Daily Tokens Remaining: ${modelStats.dailyTokensRemaining}`);
        console.log(`  Last Refill: ${modelStats.lastRefill}`);
        console.log(`  Last Daily Reset: ${modelStats.lastDailyReset}`);
    }
    
    console.log('=== End of API Usage Stats ===\n');

    // Optionally, you can use a free logging service like Winston
    // which doesn't require an API key for basic logging
    logToWinston(stats);
}

function logToWinston(stats) {
    // Check if we're in a Node.js environment
    if (typeof window === 'undefined') {
        const winston = require('winston');
        
        // Configure Winston logger
        const logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            defaultMeta: { service: 'api-usage-stats' },
            transports: [
                new winston.transports.File({ filename: 'api-usage-stats.log' }),
                new winston.transports.Console()
            ],
        });

        // Log the stats
        logger.info('API Usage Stats', { stats });
    } else {
        console.log('Winston logging is not available in the browser environment');
    }
}

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
