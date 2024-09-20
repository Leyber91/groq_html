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
 * 
 * How it works:
 * 1. Checks if the given model name is in the FUNCTION_CALLING_MODELS array.
 * 2. If it is, returns an object with FUNCTION_CALLING_CONFIG properties and the model name.
 * 3. If it's not, returns null.
 * 
 * Usage example:
 * ```javascript
 * const capabilities = getModelFunctionCallingCapabilities('llama3-groq-70b-8192-tool-use-preview');
 * if (capabilities) {
 *     console.log(`Max functions: ${capabilities.maxFunctions}`);
 * }
 * ```
 * 
 * Files that use this function:
 * - js/api/model-api.js
 * - js/components/FunctionCallingInterface.js
 * 
 * Role in overall program logic:
 * This function is crucial for determining if and how function calling can be used with a specific model.
 * It's used when setting up API calls or configuring user interfaces for function calling features.
 * 
 * @param {string} modelName - The model name.
 * @returns {Object|null} Function calling capabilities or null if not supported.
 * 
 * @see [Function Calling Documentation](./docs/function-calling.md#getModelFunctionCallingCapabilities)
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
 * 
 * How it works:
 * Simply returns the FUNCTION_CALLING_MODELS array.
 * 
 * Usage example:
 * ```javascript
 * const supportedModels = getModelsSupportingFunctionCalling();
 * console.log(`Models supporting function calling: ${supportedModels.join(', ')}`);
 * ```
 * 
 * Files that use this function:
 * - js/components/ModelSelector.js
 * - js/utils/modelUtils.js
 * 
 * Role in overall program logic:
 * This function is used to populate model selection interfaces and to filter available models
 * when function calling capabilities are required for a task.
 * 
 * @returns {Array<string>} Array of model names that support function calling.
 * 
 * @see [Function Calling Documentation](./docs/function-calling.md#getModelsSupportingFunctionCalling)
 */
export function getModelsSupportingFunctionCalling() {
    return FUNCTION_CALLING_MODELS;
}

/**
 * Checks if a model supports function calling.
 * 
 * How it works:
 * Uses the Array.includes() method to check if the given model name is in the FUNCTION_CALLING_MODELS array.
 * 
 * Usage example:
 * ```javascript
 * if (doesModelSupportFunctionCalling('llama3-groq-8b-8192-tool-use-preview')) {
 *     console.log('This model supports function calling');
 * }
 * ```
 * 
 * Files that use this function:
 * - js/api/modelValidator.js
 * - js/components/FunctionCallingToggle.js
 * 
 * Role in overall program logic:
 * This function is used to quickly check if a specific model can be used for function calling tasks.
 * It's often used in conditional logic to enable or disable function calling features in the UI or API calls.
 * 
 * @param {string} modelName - The model name.
 * @returns {boolean} True if the model supports function calling, false otherwise.
 * 
 * @see [Function Calling Documentation](./docs/function-calling.md#doesModelSupportFunctionCalling)
 */
export function doesModelSupportFunctionCalling(modelName) {
    return FUNCTION_CALLING_MODELS.includes(modelName);
}

/**
 * Retrieves the best model for function calling based on the task.
 * 
 * How it works:
 * 1. Filters FUNCTION_CALLING_MODELS to find models that are suitable for the given task.
 * 2. If no suitable models are found, returns null.
 * 3. If suitable models are found, sorts them by context window size (descending).
 * 4. Returns the first (highest context window) model from the sorted list.
 * 
 * Usage example:
 * ```javascript
 * const bestModel = getBestModelForFunctionCalling('Complex reasoning');
 * if (bestModel) {
 *     console.log(`Best model for complex reasoning: ${bestModel}`);
 * } else {
 *     console.log('No suitable model found for this task');
 * }
 * ```
 * 
 * Files that use this function:
 * - js/api/taskRouter.js
 * - js/components/ModelRecommender.js
 * 
 * Role in overall program logic:
 * This function is used to automatically select the most appropriate model for a given task
 * when function calling is required. It's particularly useful in automated workflows or
 * when providing model recommendations to users.
 * 
 * @param {string} task - The task to perform.
 * @returns {string|null} The best model name for function calling or null if no suitable model is found.
 * 
 * @see [Function Calling Documentation](./docs/function-calling.md#getBestModelForFunctionCalling)
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