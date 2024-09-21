// js/lib/apiProcessor.js
import { logger } from '../utils/logger.js';
import { executeWithRetryAndCircuitBreaker } from '../utils/retry.js';
import { handleGracefulDegradation } from '../api/error-handling.js';
import { estimateTokens } from '../utils/tokenUtils.js';
import { refillTokenBuckets, checkRateLimit, consumeTokens } from '../api/rate-limiting.js';
import { availableModels } from '../api/modelInfo/model-info.js';
import { enhancedStreamGroqAPI } from './groqAPI.js';
import { systemSettings } from '../config/system-config.js';
import { executeGroqOperation } from './groqExecutor.js'; // Ensure this path is correct
// Access global Groq if needed
// const groqInstance = new window.Groq('your-api-key-here');
/**
 * Processes an API call request.
 * 
 * @param {Object} params - The parameters for processing.
 * @param {string} params.model - The model name.
 * @param {Array<Object>} params.messages - The messages for the API call.
 * @param {number} params.temperature - The temperature setting.
 * @param {Function} params.updateCallback - Callback for updates.
 * @param {Function} params.resolve - Promise resolve function.
 * @param {Function} params.reject - Promise reject function.
 */
export async function processApiCall({ model, messages, temperature, updateCallback, resolve, reject }) {
    if (!model) {
        const error = new Error('Model parameter is missing or undefined');
        logger.error(error.message);
        reject(error);
        return;
    }
    try {
        if (!availableModels.includes(model)) {
            throw new Error(`Invalid model: ${model}`);
        }
        await refillTokenBuckets();
        const estimatedTokens = estimateTokens(messages, model);
        await checkRateLimit(model, estimatedTokens);
        logger.info(`Executing API call for model: ${model} with estimated tokens: ${estimatedTokens}`);
        const result = await executeWithRetryAndCircuitBreaker(
            () => enhancedStreamGroqAPI(model, messages, temperature, updateCallback),
            systemSettings.apiRetryAttempts || 3,
            systemSettings.apiRetryDelay || 1000
        );
        await consumeTokens(model, estimatedTokens);
        resolve(result);
    } catch (error) {
        logger.error(`Error processing API call for model ${model}: ${error.message}`);
        const gracefulResult = await handleGracefulDegradation(error, `processSingleRequest:${model}`);
        if (gracefulResult) {
            resolve(gracefulResult);
        } else {
            reject(error);
        }
    }
}
/**
 * Processes a function call request.
 * 
 * @param {Object} params - The parameters for processing.
 * @param {string} params.functionName - The function name.
 * @param {Object} params.parameters - The function parameters.
 * @param {Function} params.resolve - Promise resolve function.
 * @param {Function} params.reject - Promise reject function.
 */
export async function processFunctionCall({ functionName, parameters, resolve, reject }) {
    try {
        // Assuming FunctionInput and AutonomousQueryHandler are properly defined and accessible
        const functionInput = new window.FunctionInput(functionName, parameters); // Access from global if needed
        logger.info(`Handling function call: ${functionName} with parameters: ${JSON.stringify(parameters)}`);
        // Assuming autonomousQueryHandler is accessible globally or imported appropriately
        const result = await window.autonomousQueryHandler.handleQuery(JSON.stringify(functionInput));
        resolve(result);
    } catch (error) {
        logger.error(`Error processing function call ${functionName}: ${error.message}`);
        const gracefulResult = await handleGracefulDegradation(error, `processFunctionCall:${functionName}`);
        if (gracefulResult) {
            resolve(gracefulResult);
        } else {
            reject(error);
        }
    }
}
