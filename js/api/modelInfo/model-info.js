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
