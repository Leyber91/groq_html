import { MODEL_INFO } from '../../config/model-config.js';

/**
 * @typedef {Object} ModelInfo
 * @property {number} contextWindow - The context window size.
 * @property {number} tokenLimit - Maximum tokens allowed.
 * @property {Array<string>} bestFor - Use cases suited for the model.
 * @property {number} [tokenEstimationFactor] - Factor for token estimation.
 */

/** @type {Array<string>} */
export const availableModels = Object.keys(MODEL_INFO);

/**
 * Retrieves information for a specific model.
 * @param {string} modelName - The model name.
 * @returns {ModelInfo|null} The model information or null if not found.
 */
export function getModelInfo(modelName) {
    return MODEL_INFO[modelName] || null;
}

/**
 * Checks if a model is available.
 * @param {string} modelName - The model name.
 * @returns {boolean} True if available.
 */
export function isModelAvailable(modelName) {
    return availableModels.includes(modelName);
}

/**
 * Gets the context window size for a model.
 * @param {string} modelName - The model name.
 * @returns {number} The context window size.
 */
export function getModelContextWindow(modelName) {
    const model = getModelInfo(modelName);
    return model ? model.contextWindow : 0;
}

/**
 * Retrieves the tokenizer for a model.
 * @param {string} modelName - The model name.
 * @returns {Object} Tokenizer with an encode method.
 */
export function getModelTokenizer(modelName) {
    return {
        encode: (text) => {
            if (typeof text === 'string') {
                return text.split(' ');
            } else if (Array.isArray(text)) {
                return text.flatMap(item => {
                    if (typeof item === 'string') {
                        return item.split(' ');
                    } else if (item && typeof item === 'object' && typeof item.content === 'string') {
                        return item.content.split(' ');
                    }
                    return [];
                });
            }
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
    return model ? model.tokenLimit : 0;
}

/**
 * Finds a model with a larger context window than the current model.
 * @param {string} currentModelName - The current model's name.
 * @returns {ModelInfo|null} The model information or null if not found.
 */
export function findModelWithLargerContext(currentModelName) {
    const currentModelInfo = getModelInfo(currentModelName);
    if (!currentModelInfo) {
        return null;
    }

    // Filter models with a larger context window
    const largerModels = availableModels
        .map(modelName => getModelInfo(modelName))
        .filter(modelInfo => modelInfo.contextWindow > currentModelInfo.contextWindow);

    if (largerModels.length === 0) {
        return null;
    }

    // Example strategy: return the first model with a larger context window
    return largerModels[0];
}
