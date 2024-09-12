import { MODEL_INFO } from '../../config/model-config.js';
// Available models
export const availableModels = [
    'gemma-7b-it',
    'gemma2-9b-it',
    'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant',
    'llama3-70b-8192',
    'llama3-8b-8192',
    'llama3-groq-70b-8192-tool-use-preview',
    'llama3-groq-8b-8192-tool-use-preview',
    'llava-v1.5-7b-4096-preview',
    'mixtral-8x7b-32768'
];

// Model capabilities and characteristics
export const modelInfo = MODEL_INFO;


/**
 * Get information about a specific model.
 * @param {string} modelName - The name of the model to get information for.
 * @returns {Object} An object containing model information.
 */
export function getModelInfo(modelName) {
    return modelInfo[modelName] || {
        description: 'Information not available',
        contextWindow: 'Unknown',
        bestFor: [],
        strengths: [],
        weaknesses: [],
        tokenLimit: 'Unknown',
        requestsPerMinute: 'Unknown'
    };
}

/**
 * Check if a model is available.
 * @param {string} modelName - The name of the model to check.
 * @returns {boolean} True if the model is available, false otherwise.
 */
export function isModelAvailable(modelName) {
    return availableModels.includes(modelName);
}

/**
 * Get the context window size for a specific model.
 * @param {string} modelName - The name of the model.
 * @returns {number|string} The context window size or 'Unknown' if not available.
 */
export function getModelContextWindow(modelName) {
    const modelInfo = MODEL_INFO[modelName];
    return modelInfo ? modelInfo.contextWindow : 0;
  }
/**
 * Get the best use cases for a specific model.
 * @param {string} modelName - The name of the model.
 * @returns {string[]} An array of best use cases for the model.
 */
export function getModelBestUses(modelName) {
    return modelInfo[modelName]?.bestFor || [];
}

/**
 * Get the strengths of a specific model.
 * @param {string} modelName - The name of the model.
 * @returns {string[]} An array of strengths for the model.
 */
export function getModelStrengths(modelName) {
    return modelInfo[modelName]?.strengths || [];
}

/**
 * Get the weaknesses of a specific model.
 * @param {string} modelName - The name of the model.
 * @returns {string[]} An array of weaknesses for the model.
 */
export function getModelWeaknesses(modelName) {
    return modelInfo[modelName]?.weaknesses || [];
}

/**
 * Get the token limit for a specific model.
 * @param {string} modelName - The name of the model.
 * @returns {number|string} The token limit or 'Unknown' if not available.
 */
export function getModelTokenLimit(modelName) {
    return modelInfo[modelName]?.tokenLimit || 'Unknown';
}

/**
 * Get the requests per minute limit for a specific model.
 * @param {string} modelName - The name of the model.
 * @returns {number|string} The requests per minute limit or 'Unknown' if not available.
 */
export function getModelRequestsPerMinute(modelName) {
    return modelInfo[modelName]?.requestsPerMinute || 'Unknown';
}

/**
 * Get the daily token limit for a specific model (if applicable).
 * @param {string} modelName - The name of the model.
 * @returns {number|string|undefined} The daily token limit, 'Unknown' if not available, or undefined if not applicable.
 */
export function getModelDailyTokenLimit(modelName) {
    return modelInfo[modelName]?.dailyTokenLimit || 'Unknown';
}

/**
 * Compare two models based on their capabilities.
 * @param {string} modelName1 - The name of the first model.
 * @param {string} modelName2 - The name of the second model.
 * @returns {Object} An object containing comparison results.
 */
export function compareModels(modelName1, modelName2) {
    const model1 = getModelInfo(modelName1);
    const model2 = getModelInfo(modelName2);

    return {
        contextWindowComparison: model1.contextWindow - model2.contextWindow,
        tokenLimitComparison: model1.tokenLimit - model2.tokenLimit,
        requestsPerMinuteComparison: model1.requestsPerMinute - model2.requestsPerMinute,
        sharedBestUses: model1.bestFor.filter(use => model2.bestFor.includes(use)),
        uniqueStrengths: {
            [modelName1]: model1.strengths.filter(strength => !model2.strengths.includes(strength)),
            [modelName2]: model2.strengths.filter(strength => !model1.strengths.includes(strength))
        }
    };
}

/**
 * Find the best model for a specific use case.
 * @param {string} useCase - The use case to find the best model for.
 * @returns {string|null} The name of the best model for the use case, or null if no suitable model is found.
 */
export function findBestModelForUseCase(useCase) {
    for (const [modelName, info] of Object.entries(modelInfo)) {
        if (info.bestFor.includes(useCase)) {
            return modelName;
        }
    }
    return null;
}

/**
 * Get all models sorted by a specific attribute (e.g., contextWindow, tokenLimit).
 * @param {string} attribute - The attribute to sort by.
 * @param {boolean} [descending=true] - Whether to sort in descending order.
 * @returns {Array} An array of model names sorted by the specified attribute.
 */
export function getModelsSortedBy(attribute, descending = true) {
    return Object.entries(modelInfo)
        .sort(([, a], [, b]) => {
            const valueA = a[attribute] || 0;
            const valueB = b[attribute] || 0;
            return descending ? valueB - valueA : valueA - valueB;
        })
        .map(([modelName]) => modelName);
}




export function estimateTokens(messages, modelName) {
    const modelInfo = getModelInfo(modelName);
    if (!modelInfo) {
        throw new Error(`Model information not available for ${modelName}`);
    }

    const tokenCount = messages.reduce((total, message) => {
        return total + (message.content ? message.content.length : 0);
    }, 0);

    return tokenCount;
}
