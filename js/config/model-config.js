
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
     * @param {string} modelName - The model name.
     * @returns {Object|null} The model information or null if not found.
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
        return AVAILABLE_MODELS.includes(modelName);
    }
    
    /**
     * Retrieves the rate limits for a specific model.
     * @param {string} modelName - The model name.
     * @returns {Object|null} The rate limits or null if not found.
     */
    export function getModelRateLimits(modelName) {
        return RATE_LIMITS[modelName] || null;
    }
    
    /**
     * Compares two models based on a specific attribute.
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
     * @param {string} modelName - The model name.
     * @returns {number|null} Context window size or null if not found.
     */
    export function getModelContextWindow(modelName) {
        const modelInfo = MODEL_INFO[modelName];
        return modelInfo ? modelInfo.contextWindow : null;
    }
    
    /**
     * Retrieves all available tasks across all models.
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
     * @returns {number} Total TPM.
     */
    export function getTotalTPM() {
        return Object.values(RATE_LIMITS).reduce((total, limit) => total + limit.tpm, 0);
    }
    
    /**
     * Selects an alternative model based on criteria.
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
