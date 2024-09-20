
    // Rate limits for different models
    export const RATE_LIMITS = {
        'gemma-7b-it': { rpm: 30, tpm: 15000 },
        'gemma2-9b-it': { rpm: 30, tpm: 15000 },
        'llama-3.1-70b-versatile': { rpm: 30, tpm: 20000, dailyTokens: 1000000 },
        'llama-3.1-8b-instant': { rpm: 30, tpm: 20000, dailyTokens: 1000000 },
        'llama3-70b-8192': { rpm: 30, tpm: 6000 },
        'llama3-8b-8192': { rpm: 30, tpm: 30000 },
        'llama3-groq-70b-8192-tool-use-preview': { rpm: 30, tpm: 15000 },
        'llama3-groq-8b-8192-tool-use-preview': { rpm: 30, tpm: 15000 },
        'mixtral-8x7b-32768': { rpm: 30, tpm: 5000 }
    };
    
    // Available models
    export const AVAILABLE_MODELS = Object.keys(RATE_LIMITS);
    
    // Model capabilities and descriptions
    export const MODEL_INFO = {
        'gemma-7b-it': {
            description: 'Lightweight model for general tasks',
            contextWindow: 8192,
            bestFor: ['Quick responses', 'General knowledge', 'Casual conversations'],
            strengths: ['Fast inference', 'Low resource requirements', 'Good for mobile applications'],
            weaknesses: ['Limited complexity', 'Smaller knowledge base', 'May struggle with specialized topics'],
            tokenLimit: 8192
        },
        'gemma2-9b-it': {
            description: 'Improved version of Gemma with enhanced capabilities',
            contextWindow: 8192,
            bestFor: ['General-purpose tasks', 'Balanced performance', 'Content generation'],
            strengths: ['Improved reasoning', 'Better context understanding', 'More nuanced responses'],
            weaknesses: ['Moderate resource requirements', 'May be overkill for simple tasks'],
            tokenLimit: 8192
        },
        'llama3-8b-8192': {
            description: 'Balanced model offering good performance with lower resource requirements',
            contextWindow: 8192,
            bestFor: ['General-purpose tasks', 'Efficient processing', 'Chatbots'],
            strengths: ['Good balance of performance and efficiency', 'Versatile applications', 'Suitable for production environments'],
            weaknesses: ['Less advanced than larger models', 'May struggle with highly complex tasks'],
            tokenLimit: 8192
        },
        'llama3-70b-8192': {
            description: 'Large-scale model with advanced capabilities',
            contextWindow: 8192,
            bestFor: ['Complex reasoning', 'Advanced language understanding', 'Large-scale data analysis'],
            strengths: ['Powerful language processing', 'Excellent for complex tasks', 'Deep knowledge integration'],
            weaknesses: ['High computational requirements', 'May be excessive for simple queries', 'Slower inference time'],
            tokenLimit: 8192
        },
        'llama3-groq-70b-8192-tool-use-preview': {
            description: 'Advanced model with tool use capabilities',
            contextWindow: 8192,
            bestFor: ['Complex problem-solving', 'Multi-step reasoning', 'Tool integration', 'Advanced AI assistants'],
            strengths: ['Advanced tool use', 'Sophisticated reasoning', 'Excellent for complex workflows'],
            weaknesses: ['Higher complexity', 'Requires careful prompt engineering', 'Resource-intensive'],
            tokenLimit: 8192
        },
        'llama3-groq-8b-8192-tool-use-preview': {
            description: 'Efficient model with tool use capabilities',
            contextWindow: 8192,
            bestFor: ['Lightweight tool integration', 'Efficient problem-solving', 'Automated task completion'],
            strengths: ['Tool use in a smaller model', 'Balance of efficiency and capability', 'Good for edge computing'],
            weaknesses: ['Less advanced than larger tool-use models', 'Limited to simpler tool interactions'],
            tokenLimit: 8192
        },
        'mixtral-8x7b-32768': {
            description: 'Large mixture-of-experts model with extended context window',
            contextWindow: 32768,
            bestFor: ['Long context understanding', 'Complex document analysis', 'Advanced language tasks'],
            strengths: ['Very large context window', 'Advanced language understanding', 'Excellent for long-form content'],
            weaknesses: ['Higher resource requirements', 'Potentially slower for short tasks', 'May be excessive for simple queries'],
            tokenLimit: 32768
        },
        'llama-3.1-70b-versatile': {
            description: 'Highly versatile large language model',
            contextWindow: 131072,
            bestFor: ['Complex tasks', 'Long-form content generation', 'Advanced reasoning', 'Research assistance'],
            strengths: ['Extensive knowledge', 'High versatility', 'Large context window', 'Cutting-edge performance'],
            weaknesses: ['High computational requirements', 'May be overkill for simple tasks', 'Potentially slower response time'],
            tokenLimit: 131072
        },
        'llama-3.1-8b-instant': {
            description: 'Fast and efficient model for quick responses',
            contextWindow: 131072,
            bestFor: ['Rapid responses', 'Real-time applications', 'Lightweight processing', 'Mobile and edge devices'],
            strengths: ['Fast inference', 'Large context window', 'Low latency', 'Efficient resource usage'],
            weaknesses: ['Less advanced than larger models', 'Limited complex reasoning', 'May struggle with nuanced tasks'],
            tokenLimit: 131072
        }
    };
    
    /**
     * Retrieves information for a specific model.
     * 
     * How it works:
     * 1. Takes a model name as input
     * 2. Looks up the model information in the MODEL_INFO object
     * 3. Returns the model information if found, or null if not found
     * 
     * Usage example:
     * const modelInfo = getModelInfo('gemma-7b-it');
     * if (modelInfo) {
     *     console.log(`Model description: ${modelInfo.description}`);
     * } else {
     *     console.log('Model not found');
     * }
     * 
     * Files that use this function:
     * - src/components/ModelSelector.js
     * - src/utils/modelUtils.js
     * 
     * Role in program logic:
     * This function is crucial for retrieving detailed information about specific models,
     * which is used throughout the application for model selection, comparison, and display purposes.
     * It serves as a central point for accessing model metadata.
     * 
     * @param {string} modelName - The model name.
     * @returns {Object|null} The model information or null if not found.
     */
    export function getModelInfo(modelName) {
        return MODEL_INFO[modelName] || null;
    }
    
    /**
     * Checks if a model is available.
     * 
     * How it works:
     * 1. Takes a model name as input
     * 2. Checks if the model name exists in the AVAILABLE_MODELS array
     * 3. Returns true if the model is available, false otherwise
     * 
     * Usage example:
     * if (isModelAvailable('gemma-7b-it')) {
     *     console.log('Model is available for use');
     * } else {
     *     console.log('Model is not available');
     * }
     * 
     * Files that use this function:
     * - src/components/ModelSelector.js
     * - src/utils/modelValidation.js
     * 
     * Role in program logic:
     * This function is used to validate model selections and ensure that only available models
     * are used in the application. It's essential for preventing errors related to attempting
     * to use unavailable or deprecated models.
     * 
     * @param {string} modelName - The model name.
     * @returns {boolean} True if available.
     */
    export function isModelAvailable(modelName) {
        return AVAILABLE_MODELS.includes(modelName);
    }
    
    /**
     * Retrieves the rate limits for a specific model.
     * 
     * How it works:
     * 1. Takes a model name as input
     * 2. Looks up the rate limits in the RATE_LIMITS object
     * 3. Returns the rate limits if found, or null if not found
     * 
     * Usage example:
     * const rateLimits = getModelRateLimits('gemma-7b-it');
     * if (rateLimits) {
     *     console.log(`RPM: ${rateLimits.rpm}, TPM: ${rateLimits.tpm}`);
     * } else {
     *     console.log('Rate limits not found for this model');
     * }
     * 
     * Files that use this function:
     * - src/services/modelService.js
     * - src/utils/rateLimitManager.js
     * 
     * Role in program logic:
     * This function is critical for managing API usage and ensuring compliance with rate limits.
     * It's used in request throttling, usage tracking, and optimizing API calls to prevent
     * exceeding allowed limits.
     * 
     * @param {string} modelName - The model name.
     * @returns {Object|null} The rate limits or null if not found.
     */
    export function getModelRateLimits(modelName) {
        return RATE_LIMITS[modelName] || null;
    }
    
    /**
     * Compares two models based on a specific attribute.
     * 
     * How it works:
     * 1. Takes two model names and an attribute to compare
     * 2. Retrieves the model information for both models
     * 3. Checks if the attribute exists for both models
     * 4. Returns an object with the attribute values for both models, or null if invalid
     * 
     * Usage example:
     * const comparison = compareModels('gemma-7b-it', 'llama3-8b-8192', 'contextWindow');
     * if (comparison) {
     *     console.log(`Gemma: ${comparison['gemma-7b-it']}, Llama: ${comparison['llama3-8b-8192']}`);
     * } else {
     *     console.log('Unable to compare models on this attribute');
     * }
     * 
     * Files that use this function:
     * - src/components/ModelComparison.js
     * - src/utils/modelAnalysis.js
     * 
     * Role in program logic:
     * This function enables direct comparison between models, which is useful for
     * model selection interfaces, performance analysis, and generating insights about
     * different models' capabilities.
     * 
     * @param {string} modelName1 - First model name.
     * @param {string} modelName2 - Second model name.
     * @param {string} attribute - The attribute to compare.
     * @returns {Object|null} Comparison result or null if invalid.
     */
    export function compareModels(modelName1, modelName2, attribute) {
        const model1 = MODEL_INFO[modelName1];
        const model2 = MODEL_INFO[modelName2];
        
        if (!model1 || !model2 || !model1[attribute] || !model2[attribute]) {
            return null;
        }
        
        return {
            [modelName1]: model1[attribute],
            [modelName2]: model2[attribute]
        };
    }
    
    /**
     * Retrieves models best suited for a specific task.
     * 
     * How it works:
     * 1. Takes a task as input
     * 2. Iterates through all models in MODEL_INFO
     * 3. Filters models whose 'bestFor' array includes the given task
     * 4. Returns an array of model names that are suitable for the task
     * 
     * Usage example:
     * const suitableModels = getModelsByTask('Complex reasoning');
     * console.log('Models suitable for complex reasoning:', suitableModels);
     * 
     * Files that use this function:
     * - src/components/TaskBasedModelSelector.js
     * - src/utils/modelRecommendation.js
     * 
     * Role in program logic:
     * This function is key for task-based model recommendations. It allows the application
     * to suggest appropriate models based on the user's intended task, improving user experience
     * and ensuring efficient model utilization.
     * 
     * @param {string} task - The task to filter models by.
     * @returns {Array<string>} Array of model names.
     */
    export function getModelsByTask(task) {
        return Object.entries(MODEL_INFO)
            .filter(([_, info]) => info.bestFor.includes(task))
            .map(([modelName, _]) => modelName);
    }
    
    /**
     * Retrieves the context window size for a specific model.
     * 
     * How it works:
     * 1. Takes a model name as input
     * 2. Retrieves the model information from MODEL_INFO
     * 3. Returns the context window size if found, or null if not found
     * 
     * Usage example:
     * const contextWindow = getModelContextWindow('mixtral-8x7b-32768');
     * if (contextWindow) {
     *     console.log(`Context window size: ${contextWindow}`);
     * } else {
     *     console.log('Context window information not available');
     * }
     * 
     * Files that use this function:
     * - src/components/ModelDetails.js
     * - src/utils/contextWindowManager.js
     * 
     * Role in program logic:
     * This function is essential for managing input lengths and optimizing prompt design.
     * It helps ensure that inputs don't exceed model capabilities and aids in selecting
     * appropriate models for tasks requiring specific context lengths.
     * 
     * @param {string} modelName - The model name.
     * @returns {number|null} Context window size or null if not found.
     */
    export function getModelContextWindow(modelName) {
        const modelInfo = MODEL_INFO[modelName];
        return modelInfo ? modelInfo.contextWindow : null;
    }
    
    /**
     * Retrieves all available tasks across all models.
     * 
     * How it works:
     * 1. Creates a new Set to store unique tasks
     * 2. Iterates through all models in MODEL_INFO
     * 3. Adds each task from each model's 'bestFor' array to the Set
     * 4. Converts the Set to an Array and returns it
     * 
     * Usage example:
     * const allTasks = getAllAvailableTasks();
     * console.log('All available tasks:', allTasks);
     * 
     * Files that use this function:
     * - src/components/TaskSelector.js
     * - src/utils/taskAnalysis.js
     * 
     * Role in program logic:
     * This function is crucial for generating comprehensive task lists in the UI.
     * It enables the application to present users with all possible tasks that can be
     * performed across all available models, facilitating task-based model selection.
     * 
     * @returns {Array<string>} Array of tasks.
     */
    export function getAllAvailableTasks() {
        const tasks = new Set();
        Object.values(MODEL_INFO).forEach(info => {
            info.bestFor.forEach(task => tasks.add(task));
        });
        return Array.from(tasks);
    }
    
    /**
     * Retrieves models sorted by a specific attribute.
     * 
     * How it works:
     * 1. Takes an attribute and sort order as input
     * 2. Sorts the models based on the specified attribute
     * 3. Returns an array of model names in the sorted order
     * 
     * Usage example:
     * const sortedModels = getModelsSortedBy('contextWindow', false);
     * console.log('Models sorted by context window (descending):', sortedModels);
     * 
     * Files that use this function:
     * - src/components/ModelRanking.js
     * - src/utils/modelSorting.js
     * 
     * Role in program logic:
     * This function is vital for creating sorted lists of models based on various attributes.
     * It's used in UI components that display model rankings and in algorithms that need to
     * process models in a specific order based on their capabilities.
     * 
     * @param {string} attribute - The attribute to sort by.
     * @param {boolean} ascending - Sort order.
     * @returns {Array<string>} Sorted array of model names.
     */
    export function getModelsSortedBy(attribute, ascending = true) {
        return Object.entries(MODEL_INFO)
            .sort(([, a], [, b]) => {
                if (ascending) {
                    return a[attribute] - b[attribute];
                } else {
                    return b[attribute] - a[attribute];
                }
            })
            .map(([modelName, _]) => modelName);
    }
    
    /**
     * Checks if a model is suitable for a given task.
     * 
     * How it works:
     * 1. Takes a model name and a task as input
     * 2. Retrieves the model information from MODEL_INFO
     * 3. Checks if the task is included in the model's 'bestFor' array
     * 4. Returns true if suitable, false otherwise
     * 
     * Usage example:
     * if (isModelSuitableForTask('llama3-70b-8192', 'Complex reasoning')) {
     *     console.log('This model is suitable for complex reasoning');
     * } else {
     *     console.log('This model may not be ideal for complex reasoning');
     * }
     * 
     * Files that use this function:
     * - src/components/ModelRecommendation.js
     * - src/utils/taskModelMatcher.js
     * 
     * Role in program logic:
     * This function is key for task-based model recommendations and validations.
     * It helps ensure that users are guided towards using appropriate models for their
     * specific tasks, improving overall system efficiency and user satisfaction.
     * 
     * @param {string} modelName - The model name.
     * @param {string} task - The task.
     * @returns {boolean} True if suitable.
     */
    export function isModelSuitableForTask(modelName, task) {
        const modelInfo = MODEL_INFO[modelName];
        return modelInfo ? modelInfo.bestFor.includes(task) : false;
    }
    
    /**
     * Retrieves the total tokens per minute across all models.
     * 
     * How it works:
     * 1. Iterates through all models in RATE_LIMITS
     * 2. Sums up the 'tpm' (tokens per minute) value for each model
     * 3. Returns the total sum
     * 
     * Usage example:
     * const totalTPM = getTotalTPM();
     * console.log(`Total system capacity: ${totalTPM} tokens per minute`);
     * 
     * Files that use this function:
     * - src/components/SystemCapacity.js
     * - src/utils/capacityPlanner.js
     * 
     * Role in program logic:
     * This function is crucial for system capacity planning and monitoring.
     * It provides an overview of the total processing capacity across all models,
     * which is useful for load balancing, resource allocation, and system scaling decisions.
     * 
     * @returns {number} Total TPM.
     */
    export function getTotalTPM() {
        return Object.values(RATE_LIMITS).reduce((total, limit) => total + limit.tpm, 0);
    }
    
    /**
     * Selects an alternative model based on criteria.
     * 
     * How it works:
     * 1. Takes current model, optional task, and optional required context window as input
     * 2. Filters alternative models based on the given criteria
     * 3. Sorts alternatives by context window and TPM
     * 4. Returns the best alternative model or null if none found
     * 
     * Usage example:
     * const alternative = selectAlternativeModel('gemma-7b-it', 'Complex reasoning', 16384);
     * if (alternative) {
     *     console.log(`Recommended alternative model: ${alternative}`);
     * } else {
     *     console.log('No suitable alternative found');
     * }
     * 
     * Files that use this function:
     * - src/components/ModelSuggestion.js
     * - src/utils/modelFallback.js
     * 
     * Role in program logic:
     * This function is essential for providing intelligent model recommendations and fallback options.
     * It helps users find suitable alternatives when their primary model choice is unavailable or
     * unsuitable for their specific requirements.
     * 
     * @param {string} currentModel - Current model name.
     * @param {string} [task=null] - Optional task filter.
     * @param {number} [requiredContextWindow=null] - Optional context window requirement.
     * @returns {string|null} Alternative model name or null.
     */
    export function selectAlternativeModel(currentModel, task = null, requiredContextWindow = null) {
        const currentModelInfo = MODEL_INFO[currentModel];
        if (!currentModelInfo) {
            throw new Error(`Invalid current model: ${currentModel}`);
        }
    
        const alternativeModels = Object.entries(MODEL_INFO).filter(([modelName, info]) => {
            if (modelName === currentModel) return false;
            if (task && !info.bestFor.includes(task)) return false;
            if (requiredContextWindow && info.contextWindow < requiredContextWindow) return false;
            return true;
        });
    
        if (alternativeModels.length === 0) return null;
    
        // Sort alternatives by context window descending, then by TPM descending
        const sortedAlternatives = alternativeModels.sort(([, a], [, b]) => {
            if (b.contextWindow !== a.contextWindow) {
                return b.contextWindow - a.contextWindow;
            }
            return (RATE_LIMITS[b.modelName]?.tpm || 0) - (RATE_LIMITS[a.modelName]?.tpm || 0);
        });
    
        return sortedAlternatives[0][0];
    }
    
    /**
     * Estimates token usage for a given text and model.
     * 
     * How it works:
     * 1. Takes input text and model name
     * 2. Estimates token count based on text length and average tokens per character
     * 3. Retrieves the token limit for the specified model
     * 4. Returns the estimated token count, capped at the model's token limit
     * 
     * Usage example:
     * const text = "This is a sample input text.";
     * const estimatedTokens = estimateTokenUsage(text, 'llama3-8b-8192');
     * console.log(`Estimated token usage: ${estimatedTokens}`);
     * 
     * Files that use this function:
     * - src/components/TokenEstimator.js
     * - src/utils/inputProcessor.js
     * 
     * Role in program logic:
     * This function is crucial for predicting token usage before sending requests to the model.
     * It helps in optimizing input lengths, preventing token limit errors, and managing
     * API usage efficiently.
     * 
     * @param {string} text - The input text.
     * @param {string} modelName - The model name.
     * @returns {number} Estimated token count.
     */
    export function estimateTokenUsage(text, modelName) {
        const avgTokensPerChar = 0.25; // Rough estimate; adjust as needed
        const estimatedTokens = Math.ceil(text.length * avgTokensPerChar);
        const modelInfo = MODEL_INFO[modelName];
        
        if (!modelInfo) {
            throw new Error(`Invalid model name: ${modelName}`);
        }
        
        return Math.min(estimatedTokens, modelInfo.tokenLimit);
    }
    
    /**
     * Retrieves models capable of handling a specific context length.
     * 
     * How it works:
     * 1. Takes a required context length as input
     * 2. Filters models based on their context window size
     * 3. Returns an array of model names that meet or exceed the required context length
     * 
     * Usage example:
     * const suitableModels = getModelsForContextLength(16384);
     * console.log('Models suitable for this context length:', suitableModels);
     * 
     * Files that use this function:
     * - src/components/ContextLengthSelector.js
     * - src/utils/modelFilter.js
     * 
     * Role in program logic:
     * This function is essential for selecting appropriate models based on input length requirements.
     * It helps ensure that users choose models capable of handling their specific context needs,
     * preventing errors related to exceeding context limits.
     * 
     * @param {number} contextLength - Required context window size.
     * @returns {Array<string>} Array of suitable model names.
     */
    export function getModelsForContextLength(contextLength) {
        return Object.entries(MODEL_INFO)
            .filter(([, info]) => info.contextWindow >= contextLength)
            .map(([modelName, _]) => modelName);
    }
    
    /**
     * Retrieves the most efficient model for a given task and context length.
     * 
     * How it works:
     * 1. Takes a task and required context length as input
     * 2. Filters models based on context length and task suitability
     * 3. Calculates efficiency as the ratio of context window to TPM
     * 4. Returns the model with the highest efficiency
     * 
     * Usage example:
     * const efficientModel = getMostEfficientModel('Complex reasoning', 16384);
     * if (efficientModel) {
     *     console.log(`Most efficient model: ${efficientModel}`);
     * } else {
     *     console.log('No suitable model found');
     * }
     * 
     * Files that use this function:
     * - src/components/EfficientModelSelector.js
     * - src/utils/modelOptimizer.js
     * 
     * Role in program logic:
     * This function is crucial for optimizing model selection based on both task requirements
     * and efficiency. It helps users choose the most cost-effective model for their specific needs,
     * balancing performance with resource usage.
     * 
     * @param {string} task - The task to perform.
     * @param {number} contextLength - The required context window size.
     * @returns {string|null} The most efficient model name or null.
     */
    export function getMostEfficientModel(task, contextLength) {
        const suitableModels = getModelsForContextLength(contextLength)
            .filter(modelName => isModelSuitableForTask(modelName, task));
        
        if (suitableModels.length === 0) return null;
        
        // Define efficiency as the ratio of contextWindow to TPM (higher is better)
        return suitableModels.reduce((mostEfficient, current) => {
            const currentEfficiency = MODEL_INFO[current].contextWindow / (RATE_LIMITS[current]?.tpm || 1);
            const mostEfficientEfficiency = MODEL_INFO[mostEfficient].contextWindow / (RATE_LIMITS[mostEfficient]?.tpm || 1);
            return currentEfficiency > mostEfficientEfficiency ? current : mostEfficient;
        }, suitableModels[0]);
    }
    
    /**
     * Retrieves a detailed comparison between two models.
     * 
     * How it works:
     * 1. Takes two model names as input
     * 2. Retrieves detailed information for both models
     * 3. Compares various attributes like context window, token limit, TPM, RPM
     * 4. Identifies shared and unique strengths and weaknesses
     * 5. Returns a comprehensive comparison object
     * 
     * Usage example:
     * const comparison = getDetailedModelComparison('gemma-7b-it', 'llama3-70b-8192');
     * console.log('Detailed comparison:', JSON.stringify(comparison, null, 2));
     * 
     * Files that use this function:
     * - src/components/ModelComparisonTable.js
     * - src/utils/modelAnalytics.js
     * 
     * Role in program logic:
     * This function is essential for providing in-depth comparisons between models.
     * It's used in UI components that display detailed model comparisons and in
     * analytics tools that help users make informed decisions about model selection.
     * 
     * @param {string} modelName1 - First model name.
     * @param {string} modelName2 - Second model name.
     * @returns {Object} Comparison details.
     */
    export function getDetailedModelComparison(modelName1, modelName2) {
        const model1 = MODEL_INFO[modelName1];
        const model2 = MODEL_INFO[modelName2];
        
        if (!model1 || !model2) {
            throw new Error('One or both model names are invalid');
        }
        
        return {
            contextWindow: {
                [modelName1]: model1.contextWindow,
                [modelName2]: model2.contextWindow,
                difference: model1.contextWindow - model2.contextWindow
            },
            tokenLimit: {
                [modelName1]: model1.tokenLimit,
                [modelName2]: model2.tokenLimit,
                difference: model1.tokenLimit - model2.tokenLimit
            },
            tpm: {
                [modelName1]: RATE_LIMITS[modelName1].tpm,
                [modelName2]: RATE_LIMITS[modelName2].tpm,
                difference: RATE_LIMITS[modelName1].tpm - RATE_LIMITS[modelName2].tpm
            },
            rpm: {
                [modelName1]: RATE_LIMITS[modelName1].rpm,
                [modelName2]: RATE_LIMITS[modelName2].rpm,
                difference: RATE_LIMITS[modelName1].rpm - RATE_LIMITS[modelName2].rpm
            },
            sharedStrengths: model1.strengths.filter(strength => model2.strengths.includes(strength)),
            uniqueStrengths: {
                [modelName1]: model1.strengths.filter(strength => !model2.strengths.includes(strength)),
                [modelName2]: model2.strengths.filter(strength => !model1.strengths.includes(strength))
            },
            sharedWeaknesses: model1.weaknesses.filter(weakness => model2.weaknesses.includes(weakness)),
            uniqueWeaknesses: {
                [modelName1]: model1.weaknesses.filter(weakness => !model2.weaknesses.includes(weakness)),
                [modelName2]: model2.weaknesses.filter(weakness => !model1.weaknesses.includes(weakness))
            }
        };
    }
