import { MODEL_INFO, AVAILABLE_MODELS } from '../../config/model-config.js';
import { logger } from '../../utils/logger.js';

/**
 * @typedef {Object} ModelInfo
 * @property {number} contextWindow - The context window size.
 * @property {number} tokenLimit - Maximum tokens allowed.
 * @property {Array<string>} bestFor - Use cases suited for the model.
 * @property {number} [tokenEstimationFactor] - Factor for token estimation.
 */

/**
 * Retrieves information for a specific model.
 * 
 * How it works:
 * 1. Validates the input model name
 * 2. Retrieves model information from MODEL_INFO object
 * 3. Logs a warning if model information is not found
 * 4. Returns the model information or null
 * 
 * Usage example:
 * const gpt3Info = getModelInfo('gpt-3.5-turbo');
 * if (gpt3Info) {
 *   console.log(`GPT-3.5 Turbo context window: ${gpt3Info.contextWindow}`);
 * }
 * 
 * Used in:
 * - js/api/chat/chat-api.js
 * - js/components/ModelSelector.js
 * - js/utils/tokenCounter.js
 * 
 * Role in program logic:
 * This function is crucial for retrieving model-specific information used throughout the application,
 * enabling features like context window management, token counting, and model selection.
 * 
 * @param {string} modelName - The model name.
 * @returns {ModelInfo|null} The model information or null if not found.
 */
export function getModelInfo(modelName) {
    if (typeof modelName !== 'string' || !modelName.trim()) {
        logger.warn(`Invalid model name provided: "${modelName}"`);
        return null;
    }

    const modelInfo = MODEL_INFO[modelName.trim()];
    if (!modelInfo) {
        logger.warn(`Model information not found for: ${modelName}`);
    }
    return modelInfo || null;
}

/**
 * Checks if a model is available.
 * 
 * How it works:
 * 1. Validates the input model name
 * 2. Checks if the model name is included in the AVAILABLE_MODELS array
 * 3. Logs a warning if the model is not available
 * 4. Returns a boolean indicating availability
 * 
 * Usage example:
 * if (isModelAvailable('gpt-4')) {
 *   console.log('GPT-4 is available for use');
 * } else {
 *   console.log('GPT-4 is not available');
 * }
 * 
 * Used in:
 * - js/api/chat/chat-api.js
 * - js/components/ModelSelector.js
 * - js/utils/modelUtils.js
 * 
 * Role in program logic:
 * This function ensures that only available models are used in the application,
 * preventing errors from attempts to use unavailable or deprecated models.
 * 
 * @param {string} modelName - The model name.
 * @returns {boolean} True if available.
 */
export function isModelAvailable(modelName) {
    if (typeof modelName !== 'string' || !modelName.trim()) {
        logger.warn(`Invalid model name provided: "${modelName}"`);
        return false;
    }

    const isAvailable = AVAILABLE_MODELS.includes(modelName.trim());
    if (!isAvailable) {
        logger.warn(`Model not available: ${modelName}`);
    }
    return isAvailable;
}

/**
 * Gets the context window size for a model.
 * 
 * How it works:
 * 1. Calls getModelInfo to retrieve model information
 * 2. Returns the contextWindow property if model info is found
 * 3. Logs an error and returns 0 if model info is not found
 * 
 * Usage example:
 * const contextWindow = getModelContextWindow('gpt-3.5-turbo');
 * console.log(`The context window for GPT-3.5 Turbo is ${contextWindow} tokens`);
 * 
 * Used in:
 * - js/api/chat/chat-api.js
 * - js/utils/contextManager.js
 * - js/components/ChatInterface.js
 * 
 * Role in program logic:
 * This function is essential for managing conversation context,
 * ensuring that the total tokens in a conversation do not exceed the model's capacity.
 * 
 * @param {string} modelName - The model name.
 * @returns {number} The context window size.
 */
export function getModelContextWindow(modelName) {
    const model = getModelInfo(modelName);
    if (!model) {
        logger.error(`Unable to get context window for model: ${modelName}`);
        return 0;
    }
    return model.contextWindow;
}

/**
 * Retrieves the tokenizer for a model.
 * 
 * How it works:
 * 1. Checks if the model is available using isModelAvailable
 * 2. If available, returns an object with an encode method
 * 3. The encode method tokenizes input text or arrays of text/objects
 * 4. Logs warnings for unexpected input types
 * 
 * Usage example:
 * const tokenizer = getModelTokenizer('gpt-3.5-turbo');
 * if (tokenizer) {
 *   const tokens = tokenizer.encode('Hello, world!');
 *   console.log(`Tokenized result: ${tokens}`);
 * }
 * 
 * Used in:
 * - js/utils/tokenCounter.js
 * - js/api/chat/chat-api.js
 * - js/components/TokenDisplay.js
 * 
 * Role in program logic:
 * This function provides a consistent way to tokenize text across different models,
 * which is crucial for accurate token counting and context management.
 * 
 * @param {string} modelName - The model name.
 * @returns {Object} Tokenizer with an encode method.
 */
export function getModelTokenizer(modelName) {
    if (!isModelAvailable(modelName)) {
        logger.warn(`Cannot get tokenizer for unavailable model: ${modelName}`);
        return null;
    }

    return {
        encode: (text) => {
            if (typeof text === 'string') {
                return text.trim().split(/\s+/);
            } else if (Array.isArray(text)) {
                return text.flatMap(item => {
                    if (typeof item === 'string') {
                        return item.trim().split(/\s+/);
                    } else if (item && typeof item === 'object' && typeof item.content === 'string') {
                        return item.content.trim().split(/\s+/);
                    }
                    logger.warn(`Unexpected item type in tokenizer input for model ${modelName}`);
                    return [];
                });
            }
            logger.warn(`Unexpected input type in tokenizer for model ${modelName}`);
            return [];
        },
    };
}

/**
 * Retrieves the token limit for a model.
 * 
 * How it works:
 * 1. Calls getModelInfo to retrieve model information
 * 2. Returns the tokenLimit property if model info is found
 * 3. Logs an error and returns 0 if model info is not found
 * 
 * Usage example:
 * const tokenLimit = getModelTokenLimit('gpt-4');
 * console.log(`The token limit for GPT-4 is ${tokenLimit}`);
 * 
 * Used in:
 * - js/api/chat/chat-api.js
 * - js/utils/contextManager.js
 * - js/components/TokenCounter.js
 * 
 * Role in program logic:
 * This function is crucial for enforcing token limits in conversations,
 * preventing requests that exceed the model's maximum token capacity.
 * 
 * @param {string} modelName - The model name.
 * @returns {number} Token limit.
 */
export function getModelTokenLimit(modelName) {
    const model = getModelInfo(modelName);
    if (!model) {
        logger.error(`Unable to get token limit for model: ${modelName}`);
        return 0;
    }
    return model.tokenLimit;
}

/**
 * Finds a model with a larger context window than the current model.
 * 
 * How it works:
 * 1. Retrieves info for the current model
 * 2. Filters AVAILABLE_MODELS to find models with larger context windows
 * 3. If found, returns the model with the smallest context window larger than current
 * 4. Returns null if no larger model is found
 * 
 * Usage example:
 * const currentModel = 'gpt-3.5-turbo';
 * const largerModel = findModelWithLargerContext(currentModel);
 * if (largerModel) {
 *   console.log(`Upgrade to ${largerModel.name} for a larger context window`);
 * }
 * 
 * Used in:
 * - js/api/chat/chat-api.js
 * - js/components/ModelUpgradePrompt.js
 * - js/utils/contextManager.js
 * 
 * Role in program logic:
 * This function enables automatic model upgrades when a larger context window is needed,
 * improving the user experience by suggesting more capable models for complex conversations.
 * 
 * @param {string} currentModelName - The current model's name.
 * @returns {ModelInfo|null} The model information or null if not found.
 */
export function findModelWithLargerContext(currentModelName) {
    const currentModelInfo = getModelInfo(currentModelName);
    if (!currentModelInfo) {
        logger.error(`Unable to find model info for: ${currentModelName}`);
        return null;
    }

    // Filter models with a larger context window
    const largerModels = AVAILABLE_MODELS
        .map(modelName => getModelInfo(modelName))
        .filter(modelInfo => modelInfo && modelInfo.contextWindow > currentModelInfo.contextWindow);

    if (largerModels.length === 0) {
        logger.info(`No models found with larger context than ${currentModelName}`);
        return null;
    }

    // Return the model with the smallest context window larger than current
    return largerModels.reduce((prev, current) => 
        prev.contextWindow < current.contextWindow ? prev : current
    );
}

/**
 * Gets the best models for a specific use case.
 * 
 * How it works:
 * 1. Validates the input use case
 * 2. Filters AVAILABLE_MODELS based on the 'bestFor' property in model info
 * 3. Returns an array of model names best suited for the use case
 * 4. Logs a warning if no models are found for the use case
 * 
 * Usage example:
 * const codingModels = getBestModelsForUseCase('code generation');
 * console.log(`Best models for code generation: ${codingModels.join(', ')}`);
 * 
 * Used in:
 * - js/components/ModelRecommendation.js
 * - js/api/chat/chat-api.js
 * - js/utils/modelSelector.js
 * 
 * Role in program logic:
 * This function helps in recommending the most suitable models for specific tasks,
 * improving user experience by guiding them to the most appropriate model choices.
 * 
 * @param {string} useCase - The use case to find models for.
 * @returns {Array<string>} Array of model names best suited for the use case.
 */
export function getBestModelsForUseCase(useCase) {
    if (typeof useCase !== 'string' || !useCase.trim()) {
        logger.warn(`Invalid use case provided: "${useCase}"`);
        return [];
    }

    const bestModels = AVAILABLE_MODELS.filter(modelName => {
        const modelInfo = getModelInfo(modelName);
        return modelInfo && Array.isArray(modelInfo.bestFor) && modelInfo.bestFor.includes(useCase.trim());
    });

    if (bestModels.length === 0) {
        logger.warn(`No models found specifically for use case: ${useCase}`);
    }

    return bestModels;
}

/**
 * Gets the token estimation factor for a model.
 * 
 * How it works:
 * 1. Retrieves model info using getModelInfo
 * 2. Returns the tokenEstimationFactor if present, otherwise returns 1
 * 3. Logs a warning if model info is not found
 * 
 * Usage example:
 * const factor = getTokenEstimationFactor('gpt-3.5-turbo');
 * console.log(`Token estimation factor for GPT-3.5 Turbo: ${factor}`);
 * 
 * Used in:
 * - js/utils/tokenCounter.js
 * - js/api/chat/chat-api.js
 * - js/components/TokenEstimator.js
 * 
 * Role in program logic:
 * This function helps in accurately estimating token usage for different models,
 * which is crucial for managing API costs and preventing token limit overruns.
 * 
 * @param {string} modelName - The model name.
 * @returns {number} The token estimation factor.
 */
export function getTokenEstimationFactor(modelName) {
    const modelInfo = getModelInfo(modelName);
    if (!modelInfo) {
        logger.warn(`No token estimation factor found for model: ${modelName}. Using default of 1.`);
        return 1;
    }
    return modelInfo.tokenEstimationFactor !== undefined ? modelInfo.tokenEstimationFactor : 1;
}

// Re-export AVAILABLE_MODELS for consistency with previous usage
export { AVAILABLE_MODELS as availableModels };
