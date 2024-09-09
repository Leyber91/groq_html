// Rate limits for different models
export const RATE_LIMITS = {
    'gemma-7b-it': { rpm: 30, tpm: 15000 },
    'gemma2-9b-it': { rpm: 30, tpm: 15000 },
    'llama-3.1-70b-versatile': { rpm: 30, tpm: 20000, dailyTokens: 1000000 },
    'llama-3.1-8b-instant': { rpm: 30, tpm: 20000, dailyTokens: 1000000 },
    'llama-guard-3-8b': { rpm: 30, tpm: 15000 },
    'llama3-70b-8192': { rpm: 30, tpm: 6000 },
    'llama3-8b-8192': { rpm: 30, tpm: 30000 },
    'llama3-groq-70b-8192-tool-use-preview': { rpm: 30, tpm: 15000 },
    'llama3-groq-8b-8192-tool-use-preview': { rpm: 30, tpm: 15000 },
    'llava-v1.5-7b-4096-preview': { rpm: 30, tpm: 30000 },
    'mixtral-8x7b-32768': { rpm: 30, tpm: 5000 }
};

// Available models
export const AVAILABLE_MODELS = Object.keys(RATE_LIMITS);

// Model capabilities and descriptions
export const MODEL_INFO = {
    'gemma-7b-it': {
        description: 'Lightweight model for general tasks',
        contextWindow: 8192,
        bestFor: ['Quick responses', 'General knowledge'],
        strengths: ['Fast inference', 'Low resource requirements'],
        weaknesses: ['Limited complexity', 'Smaller knowledge base']
    },
    'gemma2-9b-it': {
        description: 'Improved version of Gemma with enhanced capabilities',
        contextWindow: 8192,
        bestFor: ['General-purpose tasks', 'Balanced performance'],
        strengths: ['Improved reasoning', 'Better context understanding'],
        weaknesses: ['Moderate resource requirements']
    },
    'llama-guard-3-8b': {
        description: 'Specialized model for content moderation and safety',
        contextWindow: 4096,
        bestFor: ['Content filtering', 'Safety checks'],
        strengths: ['High accuracy in detecting harmful content', 'Efficient processing'],
        weaknesses: ['Limited general knowledge', 'Narrow use case']
    },
    'llama3-70b-8192': {
        description: 'Large model with broad knowledge and advanced capabilities',
        contextWindow: 8192,
        bestFor: ['Complex reasoning', 'Long-form content', 'Advanced language understanding'],
        strengths: ['Extensive knowledge base', 'Sophisticated reasoning'],
        weaknesses: ['Higher resource requirements', 'Slower inference']
    },
    'llama3-8b-8192': {
        description: 'Balanced model offering good performance with lower resource requirements',
        contextWindow: 8192,
        bestFor: ['General-purpose tasks', 'Efficient processing'],
        strengths: ['Good balance of performance and efficiency', 'Versatile applications'],
        weaknesses: ['Less advanced than larger models']
    },
    'llama3-groq-70b-8192-tool-use-preview': {
        description: 'Advanced model with tool use capabilities',
        contextWindow: 8192,
        bestFor: ['Complex problem-solving', 'Multi-step reasoning', 'Tool integration'],
        strengths: ['Advanced tool use', 'Sophisticated reasoning'],
        weaknesses: ['Higher complexity', 'Requires careful prompt engineering']
    },
    'llama3-groq-8b-8192-tool-use-preview': {
        description: 'Efficient model with tool use capabilities',
        contextWindow: 8192,
        bestFor: ['Lightweight tool integration', 'Efficient problem-solving'],
        strengths: ['Tool use in a smaller model', 'Balance of efficiency and capability'],
        weaknesses: ['Less advanced than larger tool-use models']
    },
    'mixtral-8x7b-32768': {
        description: 'Large mixture-of-experts model with extended context window',
        contextWindow: 32768,
        bestFor: ['Long context understanding', 'Complex document analysis'],
        strengths: ['Very large context window', 'Advanced language understanding'],
        weaknesses: ['Higher resource requirements', 'Potentially slower for short tasks']
    },
    'llama-3.1-70b-versatile': {
        description: 'Highly versatile large language model',
        contextWindow: 131072,
        bestFor: ['Complex tasks', 'Long-form content generation', 'Advanced reasoning'],
        strengths: ['Extensive knowledge', 'High versatility', 'Large context window'],
        weaknesses: ['High computational requirements', 'May be overkill for simple tasks']
    },
    'llama-3.1-8b-instant': {
        description: 'Fast and efficient model for quick responses',
        contextWindow: 131072,
        bestFor: ['Rapid responses', 'Real-time applications', 'Lightweight processing'],
        strengths: ['Fast inference', 'Large context window', 'Low latency'],
        weaknesses: ['Less advanced than larger models', 'Limited complex reasoning']
    },
    'llava-v1.5-7b-4096-preview': {
        description: 'Vision-language model for image understanding and generation',
        contextWindow: 4096,
        bestFor: ['Image analysis', 'Visual question answering', 'Image-based tasks']
    }
};

// Function to get model information
export function getModelInfo(modelName) {
    return MODEL_INFO[modelName] || null;
}

// Function to check if a model is available
export function isModelAvailable(modelName) {
    return AVAILABLE_MODELS.includes(modelName);
}

// Function to get rate limits for a specific model
export function getModelRateLimits(modelName) {
    return RATE_LIMITS[modelName] || null;
}

// Function to compare models based on a specific attribute
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

// Function to get models best suited for a specific task
export function getModelsByTask(task) {
    return Object.entries(MODEL_INFO)
        .filter(([_, info]) => info.bestFor.includes(task))
        .map(([modelName, _]) => modelName);
}

// Function to get the context window size for a specific model
export function getModelContextWindow(modelName) {
    const modelInfo = MODEL_INFO[modelName];
    return modelInfo ? modelInfo.contextWindow : null;
}

// Function to get all available tasks across all models
export function getAllAvailableTasks() {
    const tasks = new Set();
    Object.values(MODEL_INFO).forEach(info => {
        info.bestFor.forEach(task => tasks.add(task));
    });
    return Array.from(tasks);
}

// Function to get models sorted by a specific attribute (e.g., contextWindow)
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

// Function to check if a model is suitable for a given task
export function isModelSuitableForTask(modelName, task) {
    const modelInfo = MODEL_INFO[modelName];
    return modelInfo ? modelInfo.bestFor.includes(task) : false;
}

// Function to get the total tokens per minute (TPM) across all models
export function getTotalTPM() {
    return Object.values(RATE_LIMITS).reduce((total, limit) => total + limit.tpm, 0);
}