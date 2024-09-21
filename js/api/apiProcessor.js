//File: ./js/api/apiProcessor.js

// apiProcessor.js
import { logger } from '../utils/logger.js';
import { executeWithRetryAndCircuitBreaker } from '../utils/retry.js';
import { enhancedStreamGroqAPI } from './enhancedGroqAPI.js'; // Assume this is refactored separately
import { consumeTokens } from './rate-limiting.js';
import { withErrorHandling, handleGracefulDegradation } from './error-handling.js';
/**
 * Processes API call requests.
 * @param {Object} request - The API call request.
 * @returns {Promise<any>} - The API call result.
 */
const processApiCall = withErrorHandling(async (request) => {
  const { model, messages, temperature, updateCallback, resolve, reject } = request;
  if (!model) {
    const error = new Error('Model parameter is missing or undefined');
    logger.error(error.message);
    reject(error);
    return;
  }
  try {
    // Validate model
    if (!availableModels.includes(model)) {
      throw new Error(`Invalid model: ${model}`);
    }
    // Refill tokens and check rate limits
    await refillTokenBuckets();
    const estimatedTokens = estimateTokens(messages, model);
    await checkRateLimit(model, estimatedTokens);
    logger.info(`Executing API call for model: ${model} with estimated tokens: ${estimatedTokens}`);
    const result = await executeWithRetryAndCircuitBreaker(
      () => enhancedStreamGroqAPI(model, messages, temperature, updateCallback),
      systemSettings.apiRetryAttempts || 3,
      systemSettings.apiRetryDelay || 1000
    );
    // Consume tokens
    consumeTokens(model, estimatedTokens);
    resolve(result);
  } catch (error) {
    logger.error(`Error processing API call for model ${model}: ${error.message}`);
    const gracefulResult = await handleGracefulDegradation(error, `processApiCall:${model}`);
    if (gracefulResult) {
      resolve(gracefulResult);
    } else {
      reject(error);
    }
  }
}, 'processApiCall');
export { processApiCall };
