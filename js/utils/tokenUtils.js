// utils/tokenUtils.js

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

const MODEL_LIMITS = {
    'llama3-groq-8b-8192-tool-use-preview': 8192,
    'llama3-8b-8192': 8192,
    'llama3-70b-8192': 8192,
    'gemma-7b-it': 8192,
    'gemma2-9b-it': 8192,
    'llama-3.1-70b-versatile': 8192,
    'llama-3.1-8b-instant': 8192,
    'llama3-groq-70b-8192-tool-use-preview': 8192,
    'mixtral-8x7b-32768': 32768,
    'default': 4096
};

/**
 * Retrieves the token limit for a given model.
 * @param {string} model - The name of the model.
 * @returns {number} The token limit for the specified model.
 */
export function getModelTokenLimit(model) {
    return MODEL_LIMITS[model] || MODEL_LIMITS.default;
}

/**
 * Checks if the estimated token count exceeds the model's limit.
 * @param {number} tokenCount - The estimated token count.
 * @param {string} model - The name of the model.
 * @returns {boolean} True if the token count exceeds the limit, false otherwise.
 */
export function isTokenCountExceeded(tokenCount, model) {
    const limit = getModelTokenLimit(model);
    return tokenCount > limit;
}

/**
 * Calculates the remaining tokens for a given model and current token count.
 * @param {number} currentTokenCount - The current token count.
 * @param {string} model - The name of the model.
 * @returns {number} The number of remaining tokens.
 */
export function getRemainingTokens(currentTokenCount, model) {
    const limit = getModelTokenLimit(model);
    return Math.max(0, limit - currentTokenCount);
}

/**
 * Estimates the number of tokens for the given messages and model.
 * 
 * This function works as follows:
 * 1. It first validates the input parameters (messages and model).
 * 2. It then selects the appropriate tokenizer based on the model.
 * 3. It iterates through each message, tokenizing its content and summing up the token counts.
 * 4. If any errors occur during the process, it logs the error and returns 0 as a fallback.
 * 
 * @param {Array} messages - Array of message objects.
 * @param {string} [model='default'] - Model name.
 * @returns {number} Estimated token count.
 * 
 * Usage examples:
 * 
 * 1. Basic usage:
 *    const messages = [{ content: "Hello, world!" }, { content: "How are you?" }];
 *    const tokenCount = getTokenCount(messages);
 *    console.log(tokenCount); // Outputs the estimated token count
 * 
 * 2. Specifying a model:
 *    const messages = [{ content: "Complex query here..." }];
 *    const tokenCount = getTokenCount(messages, 'llama3-70b-8192');
 *    console.log(tokenCount); // Outputs the estimated token count for the specified model
 * 
 * Files that use this function:
 * - js/chat/messageHandler.js
 * - js/api/completionService.js
 * - js/utils/contextManager.js
 * 
 * Role in overall program logic:
 * This function plays a crucial role in managing token usage across the application.
 * It's used to estimate the token count of messages before sending them to the AI model,
 * ensuring that requests don't exceed the model's token limit. This helps in:
 * 1. Preventing errors due to oversized inputs
 * 2. Optimizing API usage by splitting large requests if necessary
 * 3. Providing feedback to users about their input size
 * 
 * For more detailed documentation, see:
 * [Token Estimation Documentation](docs/token-estimation.md)
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
    const limit = MODEL_LIMITS[model] || MODEL_LIMITS.default;

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
    const limit = MODEL_LIMITS[model] || MODEL_LIMITS.default;

    let tokens = tokenizer(input);
    if (tokens <= limit) return input;

    while (tokens > limit) {
        input = input.slice(0, Math.floor(input.length * (limit / tokens)));
        tokens = tokenizer(input);
    }

    logger.info(`Input truncated to fit ${limit} tokens for model ${model}`);
    return input;
}
