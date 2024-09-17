import { logger } from './logger.js';

const MODEL_TOKENIZERS = {
    'llama3-groq-8b-8192-tool-use-preview': llamaTokenizer,
    'llama3-8b-8192': llamaTokenizer,
    'llama3-70b-8192': llamaTokenizer,
    'gemma-7b-it': llamaTokenizer,
    'gemma2-9b-it': llamaTokenizer,
    'llama-3.1-70b-versatile': llamaTokenizer,
    'llama-3.1-8b-instant': llamaTokenizer,
    'llama3-groq-70b-8192-tool-use-preview': llamaTokenizer,
    'mixtral-8x7b-32768': llamaTokenizer,
    'default': simpleTokenizer
};

/**
 * Estimates the number of tokens for the given messages and model.
 * @param {Array} messages - Array of message objects.
 * @param {string} [model='default'] - Model name.
 * @returns {number} Estimated token count.
 */
export function getTokenCount(messages, model = 'default') {
    try {
        if (!Array.isArray(messages)) {
            throw new Error('Invalid input: messages must be an array');
        }
        if (typeof model !== 'string' || model.trim() === '') {
            logger.warn(`Invalid or empty model provided, using default tokenizer`);
            model = 'default';
        }

        const tokenizer = MODEL_TOKENIZERS[model] || MODEL_TOKENIZERS.default;
        const totalTokens = messages.reduce((acc, msg) => {
            if (typeof msg.content !== 'string') {
                throw new Error('Invalid message format: content must be a string');
            }
            return acc + tokenizer(msg.content);
        }, 0);
        
        logger.debug(`Estimated ${totalTokens} tokens for model: ${model}`);
        return totalTokens;
    } catch (error) {
        if (!(error instanceof Error)) {
            error = new Error(JSON.stringify(error));
        }
        logger.error(`Error estimating token count for model ${model}: ${error.message}`, error.stack);
        // Instead of throwing, return a default value
        return 0;
    }
}

/**
 * Simple tokenizer that splits on whitespace and punctuation.
 * This is a very rough approximation and should be replaced with a more accurate method if possible.
 * @param {string} text - Input text to tokenize.
 * @returns {number} Approximate token count.
 */
function simpleTokenizer(text) {
    return text.split(/\s+|\b/).filter(token => token.length > 0).length;
}

/**
 * Tokenizer for LLaMA based models.
 * This is still a placeholder and should be replaced with a more accurate method if possible.
 * @param {string} text - Input text to tokenize.
 * @returns {number} Approximate token count.
 */
function llamaTokenizer(text) {
    // This is a placeholder. In a real implementation, you would use a LLaMA-specific tokenizer.
    // For now, we'll use a simple approximation
    return Math.ceil(text.length / 3);
}

/**
 * Validates if the estimated token count is within the model's limit.
 * @param {number} tokenCount - Estimated token count.
 * @param {string} [model='default'] - Model name.
 * @throws {Error} If token count exceeds the model's limit.
 */
export function validateTokenCount(tokenCount, model = 'default') {
    const modelLimits = {
        'llama3-groq-8b-8192-tool-use-preview': 8192,
        'llama3-8b-8192': 8192,
        'llama3-70b-8192': 8192,
        'default': 4096
    };

    const limit = modelLimits[model] || modelLimits.default;

    if (tokenCount > limit) {
        logger.warn(`Token count ${tokenCount} exceeds limit ${limit} for model ${model}`);
        throw new Error(`Token count ${tokenCount} exceeds the limit of ${limit} for model ${model}`);
    }
}

/**
 * Truncates the input to fit within the token limit for the specified model.
 * @param {string} input - Input text to truncate.
 * @param {string} [model='default'] - Model name.
 * @returns {string} Truncated input.
 */
export function truncateToFit(input, model = 'default') {
    const tokenizer = MODEL_TOKENIZERS[model] || MODEL_TOKENIZERS.default;
    const modelLimits = {
        'llama3-groq-8b-8192-tool-use-preview': 8192,
        'llama3-8b-8192': 8192,
        'llama3-70b-8192': 8192,
        'default': 4096
    };
    const limit = modelLimits[model] || modelLimits.default;

    let tokens = tokenizer(input);
    if (tokens <= limit) return input;

    while (tokens > limit) {
        input = input.slice(0, Math.floor(input.length * (limit / tokens)));
        tokens = tokenizer(input);
    }

    logger.info(`Input truncated to fit ${limit} tokens for model ${model}`);
    return input;
}