import { MODEL_INFO } from './model-config.js';

// Function calling capabilities configuration
export const FUNCTION_CALLING_CONFIG = {
    maxFunctions: 5,
    maxFunctionNameLength: 64,
    maxFunctionDescriptionLength: 256,
    maxParameterNameLength: 64,
    maxParameterDescriptionLength: 128,
    supportedParameterTypes: ['string', 'number', 'boolean', 'object', 'array']
};

// Models that support function calling
const FUNCTION_CALLING_MODELS = [
    'llama3-groq-70b-8192-tool-use-preview',
    'llama3-groq-8b-8192-tool-use-preview'
];

/**
 * Retrieves function calling capabilities for a specific model.
 * @param {string} modelName - The model name.
 * @returns {Object|null} Function calling capabilities or null if not supported.
 */
export function getModelFunctionCallingCapabilities(modelName) {
    if (FUNCTION_CALLING_MODELS.includes(modelName)) {
        return {
            ...FUNCTION_CALLING_CONFIG,
            model: modelName
        };
    }
    return null;
}

/**
 * Retrieves models that support function calling.
 * @returns {Array<string>} Array of model names that support function calling.
 */
export function getModelsSupportingFunctionCalling() {
    return FUNCTION_CALLING_MODELS;
}

/**
 * Checks if a model supports function calling.
 * @param {string} modelName - The model name.
 * @returns {boolean} True if the model supports function calling, false otherwise.
 */
export function doesModelSupportFunctionCalling(modelName) {
    return FUNCTION_CALLING_MODELS.includes(modelName);
}

/**
 * Retrieves the best model for function calling based on the task.
 * @param {string} task - The task to perform.
 * @returns {string|null} The best model name for function calling or null if no suitable model is found.
 */
export function getBestModelForFunctionCalling(task) {
    const suitableModels = FUNCTION_CALLING_MODELS.filter(modelName => 
        MODEL_INFO[modelName] && MODEL_INFO[modelName].bestFor.includes(task)
    );

    if (suitableModels.length === 0) return null;

    // Sort by context window size (descending) as a simple heuristic for "best" model
    return suitableModels.sort((a, b) => 
        (MODEL_INFO[b].contextWindow || 0) - (MODEL_INFO[a].contextWindow || 0)
    )[0];
}