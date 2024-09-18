// groqIntegration.js

import { retryWithExponentialBackoff, circuitBreaker } from '../utils/retry.js';
import { scheduleRequest, getRateLimiter } from '../utils/rateLimiter.js';
import { logger } from '../utils/logger.js';
import { GROQ_API_KEY } from '../config/api-key.js';
// Remove the import for agentSwarm
// import { agentSwarm } from '../api/agentSwarm.js';

// Initialize Groq with API key from configuration
let groq;

async function loadGroqLibrary() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/js/lib/groq.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

export async function initializeGroq() {
    try {
        await loadGroqLibrary();
        if (typeof Groq !== 'undefined') {
            groq = new Groq.Groq(GROQ_API_KEY);
            logger.info('Groq library initialized successfully');
        } else {
            throw new Error('Groq is not defined after loading the script');
        }
    } catch (error) {
        logger.error('Failed to initialize Groq:', error);
        throw error;
    }
}

// Initialize Groq when the script is loaded
initializeGroq().catch(error => {
    logger.error('Error during Groq initialization:', error);
});

/**
 * Creates a chat completion using the Groq API with retry and rate limiting.
 * @param {Array} messages - Array of message objects.
 * @param {Object} options - Additional options.
 * @returns {Promise<string>} Response content.
 */
export async function createChatCompletion(messages, options = {}) {
    if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error('Invalid messages array');
    }

    const model = options.model || "llama3-groq-8b-8192-tool-use-preview";

    try {
        await scheduleRequest(model, messages);
        
        if (!groq) {
            await initializeGroq();
        }

        const result = await retryWithExponentialBackoff(async () => {
            const response = await groq.chat.completions.create({
                messages: messages,
                model: model,
                max_tokens: options.max_tokens || 150,
                temperature: options.temperature || 0.7,
            });
            return response;
        }, 5, 1000, 2);

        if (!result || !result.choices || !result.choices.length) {
            throw new Error('Invalid response structure from Groq API');
        }
        logger.info(`Chat completion successful for model: ${model}`);
        return result.choices[0].message.content;
    } catch (error) {
        logger.error(`Error creating chat completion for model ${model}:`, error);
        if (error.response) {
            logger.error(`API response status: ${error.response.status}`);
            logger.error(`API response data:`, error.response.data);
        }
        throw error;
    }
}

/**
 * Handles fallback logic when primary model fails.
 * @param {Array} messages - Array of message objects.
 * @param {Object} options - Additional options.
 * @param {Error} primaryError - The error from the primary model.
 * @returns {Promise<string>} Fallback response content.
 * @throws {Error} If both primary and fallback operations fail.
 */
async function handleFallback(messages, options, primaryError) {
    try {
        const fallbackResult = await circuitBreaker.call(async () => {
            const fallbackModel = "llama3-8b-8192"; // Fallback model
            await scheduleRequest(fallbackModel, messages);
            
            if (!groq) {
                await initializeGroq();
            }
            const fallbackResponse = await groq.chat.completions.create({
                messages: messages,
                model: fallbackModel,
                max_tokens: options.max_tokens || 150,
                temperature: options.temperature || 0.7,
            });
            logger.info(`Fallback successful using model: ${fallbackModel}`);
            return fallbackResponse.choices[0].message.content;
        });
        return fallbackResult;
    } catch (fallbackError) {
        logger.error("Fallback also failed:", fallbackError);
        throw new Error("Both primary and fallback operations failed.", { cause: { primary: primaryError, fallback: fallbackError } });
    }
}

/**
 * Creates a streaming chat completion using the Groq API.
 * @param {Array} messages - Array of message objects.
 * @param {Object} options - Additional options.
 * @returns {AsyncGenerator<string>} Yields response content chunks.
 */
export async function* createStreamingChatCompletion(messages, options = {}) {
    if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error('Invalid messages array');
    }

    const model = options.model || "llama3-groq-8b-8192-tool-use-preview";

    try {
        await scheduleRequest(model, messages);

        if (!groq) {
            await initializeGroq();
        }
        const stream = await groq.chat.completions.create({
            messages: messages,
            model: model,
            max_tokens: options.max_tokens || 150,
            temperature: options.temperature || 0.7,
            stream: true,
        });

        for await (const chunk of stream) {
            if (chunk.choices[0]?.delta?.content) {
                yield chunk.choices[0].delta.content;
            }
        }
        logger.info(`Streaming chat completion successful for model: ${model}`);
    } catch (error) {
        logger.error(`Error in streaming chat completion for model ${model}:`, error);
        throw error; // Re-throw after logging
    }
}

/**
 * Checks if the Groq library is initialized and ready to use.
 * @returns {boolean} True if Groq is initialized, false otherwise.
 */
export function isGroqInitialized() {
    return !!groq;
}

/**
 * Waits for the Groq library to be initialized.
 * @param {number} timeout - Maximum time to wait in milliseconds.
 * @returns {Promise<void>}
 * @throws {Error} If the initialization times out.
 */
export function waitForGroqInitialization(timeout = 10000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const checkInterval = setInterval(() => {
            if (isGroqInitialized()) {
                clearInterval(checkInterval);
                resolve();
            } else if (Date.now() - start > timeout) {
                clearInterval(checkInterval);
                reject(new Error('Groq initialization timed out'));
            }
        }, 100);
    });
}

/**
 * Handles chat interactions using the Groq API.
 * @param {string} userInput - The user's input message.
 * @returns {Promise<string>} The response from the Groq API.
 */
export async function handleChatInteraction(userInput) {
  try {
    const messages = [{ role: 'user', content: userInput }];
    const response = await createChatCompletion(messages);
    return response;
  } catch (error) {
    logger.error('Chat Interaction Error:', error);
    throw error;
  }
}
