// File: js/api/rate-limiting.js

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
 * 
 * How it works:
 * 1. Gets the current timestamp.
 * 2. Iterates through all available models.
 * 3. For each model, creates a token bucket with initial values based on rate limits.
 * 4. If no rate limits are defined for a model, logs a warning.
 * 
 * Usage example:
 * initializeTokenBuckets();
 * 
 * Used in:
 * - This file (js/api/rate-limiting.js)
 * 
 * Role in program logic:
 * This function sets up the initial state for rate limiting. It's crucial for
 * ensuring that each model has its own token bucket with appropriate limits
 * before any API requests are made.
 */
export function initializeTokenBuckets() {
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
 * 
 * How it works:
 * 1. Gets the current timestamp.
 * 2. Iterates through all token buckets.
 * 3. Calculates time passed since last refill.
 * 4. Adds tokens based on time passed and token-per-minute (tpm) rate.
 * 5. Resets request count if a minute has passed.
 * 6. Resets daily tokens if a day has passed.
 * 
 * Usage example:
 * refillTokenBuckets();
 * 
 * Used in:
 * - This file (js/api/rate-limiting.js)
 * - Potentially in other files that manage API request scheduling
 * 
 * Role in program logic:
 * This function ensures that token buckets are regularly updated, allowing for
 * new API requests as time passes. It's essential for maintaining the rate
 * limiting system's accuracy over time.
 */
export function refillTokenBuckets() {
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
 * 
 * How it works:
 * 1. Creates a stats object with current timestamp.
 * 2. Iterates through all token buckets.
 * 3. Collects usage statistics for each model.
 * 4. Logs the collected stats to console.
 * 5. Sends stats to a monitoring service.
 * 
 * Usage example:
 * logApiUsageStats();
 * 
 * Used in:
 * - This file (js/api/rate-limiting.js)
 * - Potentially in monitoring or dashboard components
 * 
 * Role in program logic:
 * This function provides visibility into the current state of API usage across
 * all models. It's crucial for monitoring, debugging, and ensuring the system
 * is operating within expected parameters.
 */
export function logApiUsageStats() {
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
 * 
 * How it works:
 * 1. Receives stats object as parameter.
 * 2. Logs the stats in a formatted manner to console.
 * 3. In a real implementation, would send these stats to an external monitoring service.
 * 
 * Usage example:
 * sendStatsToMonitoringService(stats);
 * 
 * Used in:
 * - This file (js/api/rate-limiting.js)
 * 
 * Role in program logic:
 * This function acts as a bridge between the rate limiting system and external
 * monitoring tools. It's crucial for long-term tracking and analysis of API usage patterns.
 * 
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
 * 
 * How it works:
 * 1. Retrieves the token bucket for the specified model.
 * 2. Checks if the request count has exceeded the requests per minute limit.
 * 3. Checks if there are enough tokens available for the estimated request.
 * 4. Checks if there are enough daily tokens available.
 * 5. Throws an error if any limit is exceeded, otherwise returns true.
 * 
 * Usage example:
 * try {
 *   checkRateLimit('gpt-3.5-turbo', 100);
 *   // Proceed with API request
 * } catch (error) {
 *   console.error(error.message);
 *   // Handle rate limit exceeded
 * }
 * 
 * Used in:
 * - This file (js/api/rate-limiting.js)
 * - API request handling components
 * - Request queueing systems
 * 
 * Role in program logic:
 * This function is the gatekeeper for API requests. It ensures that all requests
 * adhere to the defined rate limits, preventing overuse and potential API lockouts.
 * 
 * @param {string} model - The model name.
 * @param {number} estimatedTokens - Estimated tokens for the request.
 * @returns {boolean} True if within limits.
 * @throws Will throw an error if any limit is exceeded.
 */
export function checkRateLimit(model, estimatedTokens) {
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
 * 
 * How it works:
 * 1. Retrieves the token bucket for the specified model.
 * 2. Subtracts the used tokens from the available tokens and daily tokens.
 * 3. Increments the request count.
 * 
 * Usage example:
 * consumeTokens('gpt-3.5-turbo', 50);
 * 
 * Used in:
 * - This file (js/api/rate-limiting.js)
 * - API request handling components
 * 
 * Role in program logic:
 * This function is called after a successful API request to update the token bucket.
 * It's crucial for maintaining accurate token counts and request limits.
 * 
 * @param {string} model - The model name.
 * @param {number} tokensUsed - Tokens to consume.
 */
export function consumeTokens(model, tokensUsed) {
  const bucket = tokenBuckets.get(model);
  if (!bucket) {
    throw new Error(`Rate limit information not available for model ${model}`);
  }

  bucket.tokens -= tokensUsed;
  bucket.dailyTokens -= tokensUsed;
  bucket.requestCount++;
}

/**
 * Determines if an operation can be performed based on rate limits.
 * 
 * How it works:
 * 1. Calls checkRateLimit to verify if the operation is within limits.
 * 2. Returns true if the operation can be performed.
 * 3. Throws an error if the operation cannot be performed due to rate limits.
 * 
 * Usage example:
 * try {
 *   await canPerformOperation('gpt-3.5-turbo', 100);
 *   // Proceed with operation
 * } catch (error) {
 *   console.error(error.message);
 *   // Handle operation rejection
 * }
 * 
 * Used in:
 * - API request handling components
 * - Task scheduling systems
 * - User-facing interfaces that need to check operation feasibility
 * 
 * Role in program logic:
 * This function serves as a high-level check before attempting any operation
 * that consumes API resources. It helps prevent failed API calls and provides
 * a way to gracefully handle situations where operations cannot be performed.
 * 
 * @param {string} model - The model name.
 * @param {number} estimatedTokens - Tokens required for the operation.
 * @returns {Promise<boolean>} True if operation can be performed.
 * @throws Will throw an error if operation cannot be performed.
 */
export async function canPerformOperation(model, estimatedTokens) {
  try {
    await checkRateLimit(model, estimatedTokens);
    return true;
  } catch (error) {
    console.warn(`Operation cannot be performed: ${error.message}`);
    throw error;
  }
}

/**
 * Handles rate limit exceeded scenarios with random wait times.
 * 
 * How it works:
 * 1. Logs the context where the rate limit was exceeded.
 * 2. Calculates a random wait time between 5-10 seconds.
 * 3. Waits for the calculated time.
 * 4. Refills token buckets after waiting.
 * 5. Returns a status object indicating a retry should be attempted.
 * 
 * Usage example:
 * const result = await handleRateLimitExceeded('API:gpt-3.5-turbo');
 * if (result.status === 'retry') {
 *   // Attempt the operation again
 * }
 * 
 * Used in:
 * - API request handling components
 * - Retry logic in task scheduling systems
 * 
 * Role in program logic:
 * This function provides a mechanism to handle rate limit exceedances gracefully.
 * It introduces a delay to allow for token bucket refills, potentially allowing
 * the operation to succeed on a subsequent attempt.
 * 
 * @param {string} context - The context where the limit was exceeded.
 * @returns {Object} Degradation result.
 */
export async function handleRateLimitExceeded(context) {
  console.info(`Handling rate limit exceeded in ${context}`);
  const waitTime = 5000 + Math.random() * 5000; // Wait between 5-10 seconds
  console.log(`Waiting for ${waitTime}ms before retrying...`);
  await delay(waitTime);
  refillTokenBuckets();
  return { status: 'retry', message: 'Rate limit exceeded, retrying after wait' };
}

/**
 * Handles token limit exceeded scenarios by selecting larger models or chunking input.
 * 
 * How it works:
 * 1. Logs the context where the token limit was exceeded.
 * 2. Extracts the current model from the context.
 * 3. Sorts available models by context window size.
 * 4. Attempts to find a larger model that can handle the required tokens.
 * 5. If a larger model is found, returns a status object to use that model.
 * 6. If no larger model is found, chunks the input based on the current model's limits.
 * 
 * Usage example:
 * const result = await handleTokenLimitExceeded('API:gpt-3.5-turbo', 5000);
 * if (result.status === 'use_larger_model') {
 *   // Use the suggested larger model
 * } else if (result.status === 'chunk_input') {
 *   // Process the input in chunks
 * }
 * 
 * Used in:
 * - API request handling components
 * - Input processing systems
 * - Model selection logic
 * 
 * Role in program logic:
 * This function provides strategies to handle scenarios where the input exceeds
 * the token limit of the current model. It enables the system to adaptively use
 * larger models or break down inputs, ensuring that operations can proceed even
 * with large inputs.
 * 
 * @param {string} context - The context where the limit was exceeded.
 * @param {number} [requiredTokens=1000] - Tokens required for the operation.
 * @returns {Object} Degradation result.
 */
export async function handleTokenLimitExceeded(context, requiredTokens = 1000) {
  console.info(`Handling token limit exceeded in ${context}`);
  const currentModel = context.split(':')[1];

  const availableModels = AVAILABLE_MODELS.sort(
    (a, b) => getModelInfo(b).contextWindow - getModelInfo(a).contextWindow
  );

  for (const model of availableModels) {
    if (getModelInfo(model).contextWindow >= requiredTokens) {
      console.log(`Switching to larger model: ${model}`);
      return { status: 'use_larger_model', message: `Using larger model: ${model}`, model };
    }
  }

  const maxTokens = getModelInfo(currentModel).contextWindow;
  const chunks = partitionInput(context, maxTokens);
  return {
    status: 'chunk_input',
    message: `Input needs to be chunked. Divided into ${chunks.length} parts.`,
    model: currentModel,
    chunks
  };
}

/**
 * Partitions input text into chunks based on token limits.
 * 
 * How it works:
 * 1. Initializes empty arrays and variables to track partitions and tokens.
 * 2. Splits the input into words.
 * 3. Iterates through words, estimating tokens for each.
 * 4. Creates new partitions when the token limit is reached.
 * 5. Returns an array of partitioned chunks.
 * 
 * Usage example:
 * const chunks = partitionInput(longText, 1000);
 * chunks.forEach(chunk => processChunk(chunk));
 * 
 * Used in:
 * - This file (js/api/rate-limiting.js)
 * - Potentially in input processing components
 * 
 * Role in program logic:
 * This function is crucial for handling large inputs that exceed model token limits.
 * It enables the system to break down large inputs into manageable chunks,
 * allowing for processing of extensive content across multiple API calls.
 * 
 * @param {string} input - The input text.
 * @param {number} maxTokens - Maximum tokens per chunk.
 * @returns {Array<string>} Chunks of input.
 */
function partitionInput(input, maxTokens) {
  const partitions = [];
  let currentPartition = '';
  let currentTokens = 0;

  const words = input.split(' ');
  for (const word of words) {
    const wordTokens = estimateTokens([{ content: word }], 'default');
    if (currentTokens + wordTokens > maxTokens) {
      partitions.push(currentPartition.trim());
      currentPartition = '';
      currentTokens = 0;
    }
    currentPartition += `${word} `;
    currentTokens += wordTokens;
  }

  if (currentPartition) {
    partitions.push(currentPartition.trim());
  }

  return partitions;
}

/**
 * Delays execution for a specified duration.
 * 
 * How it works:
 * Creates a Promise that resolves after the specified number of milliseconds.
 * 
 * Usage example:
 * await delay(1000); // Waits for 1 second
 * 
 * Used in:
 * - This file (js/api/rate-limiting.js)
 * - Potentially in other parts of the application for introducing delays
 * 
 * Role in program logic:
 * This utility function is used to create deliberate pauses in execution,
 * which is particularly useful for rate limiting, backoff strategies,
 * and other scenarios where controlled delays are necessary.
 * 
 * @param {number} ms - Milliseconds to delay.
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize token buckets when the module loads
initializeTokenBuckets();

// Periodically refill token buckets and log usage statistics
setInterval(refillTokenBuckets, 60000); // Every minute by default
setInterval(logApiUsageStats, 300000); // Every 5 minutes by default

export {

  tokenBuckets

};
