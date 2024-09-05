// Available models
export const availableModels = [
    'gemma-7b-it',
    'gemma2-9b-it',
    'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant',
    'llama-guard-3-8b',
    'llama3-70b-8192',
    'llama3-8b-8192',
    'llama3-groq-70b-8192-tool-use-preview',
    'llama3-groq-8b-8192-tool-use-preview',
    'mixtral-8x7b-32768'
];

// Model capabilities and characteristics
export const modelInfo = {
    'gemma-7b-it': {
        description: 'Instruction-tuned model for specific tasks',
        contextWindow: 8192,
        bestFor: ['Following detailed instructions', 'Structured output']
    },
    'gemma2-9b-it': {
        description: 'Updated instruction-tuned model with improved capabilities',
        contextWindow: 8192,
        bestFor: ['Complex instruction following', 'Enhanced structured output']
    },
    'llama-3.1-70b-versatile': {
        description: 'Large and powerful general-purpose model',
        contextWindow: 8192,
        bestFor: ['Complex reasoning', 'Versatile language tasks']
    },
    'llama-3.1-8b-instant': {
        description: 'Smaller, faster model for quick responses',
        contextWindow: 8192,
        bestFor: ['Rapid responses', 'Less complex queries']
    },
    'llama-guard-3-8b': {
        description: 'Specialized model for content moderation and safety',
        contextWindow: 8192,
        bestFor: ['Content filtering', 'Safety checks']
    },
    'llama3-70b-8192': {
        description: 'Large and powerful general-purpose model',
        contextWindow: 8192,
        bestFor: ['Complex reasoning', 'Long-form content generation']
    },
    'llama3-8b-8192': {
        description: 'Smaller, faster model for simpler tasks',
        contextWindow: 8192,
        bestFor: ['Quick responses', 'Less complex queries']
    },
    'llama3-groq-70b-8192-tool-use-preview': {
        description: 'Large model optimized for tool use and interaction',
        contextWindow: 8192,
        bestFor: ['Tool-based tasks', 'Complex system interactions']
    },
    'llama3-groq-8b-8192-tool-use-preview': {
        description: 'Smaller model optimized for tool use and interaction',
        contextWindow: 8192,
        bestFor: ['Quick tool-based tasks', 'Simple system interactions']
    },
    'mixtral-8x7b-32768': {
        description: 'Mixture of experts model with large context window',
        contextWindow: 32768,
        bestFor: ['Long document analysis', 'Multi-task processing']
    }
};

/**
 * Get information about a specific model.
 * @param {string} modelName - The name of the model to get information for.
 * @returns {Object} An object containing model information.
 */
export function getModelInfo(modelName) {
    return modelInfo[modelName] || { description: 'Information not available', contextWindow: 'Unknown', bestFor: [] };
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
    return modelInfo[modelName]?.contextWindow || 'Unknown';
}

/**
 * Get the best use cases for a specific model.
 * @param {string} modelName - The name of the model.
 * @returns {string[]} An array of best use cases for the model.
 */
export function getModelBestUses(modelName) {
    return modelInfo[modelName]?.bestFor || [];
}
