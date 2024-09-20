// groqIntegration.js

import { retryWithExponentialBackoff, circuitBreaker } from '../utils/retry.js';
import { scheduleRequest, getRateLimiter } from '../utils/rateLimiter.js';
import { logger } from '../utils/logger.js';
import { GROQ_API_KEY } from '../config/api-key.js';
// Remove the import for agentSwarm
// import { agentSwarm } from '../api/agentSwarm.js';

// Initialize Groq with API key from configuration
let groq;

/**
 * Loads the Groq library dynamically by injecting a script tag into the document head.
 * 
 * How it works:
 * 1. Creates a new script element
 * 2. Sets the source to the Groq library file
 * 3. Adds event listeners for successful load and error
 * 4. Appends the script to the document head
 * 
 * Usage example:
 * ```
 * loadGroqLibrary()
 *   .then(() => console.log('Groq library loaded successfully'))
 *   .catch(error => console.error('Failed to load Groq library:', error));
 * ```
 * 
 * Used in:
 * - initializeGroq function in this file
 * 
 * Role in program logic:
 * This function is crucial for dynamically loading the Groq library, which is necessary for all Groq API interactions in the application.
 * 
 * @returns {Promise<void>} A promise that resolves when the library is loaded or rejects if there's an error
 */
async function loadGroqLibrary() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/js/lib/groq.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Initializes the Groq library with the API key.
 * 
 * How it works:
 * 1. Calls loadGroqLibrary to dynamically load the Groq script
 * 2. Checks if Groq is defined after loading
 * 3. Initializes the Groq instance with the API key
 * 4. Logs success or throws an error if initialization fails
 * 
 * Usage example:
 * ```
 * initializeGroq()
 *   .then(() => console.log('Groq initialized successfully'))
 *   .catch(error => console.error('Groq initialization failed:', error));
 * ```
 * 
 * Used in:
 * - This file (called immediately after definition)
 * - createChatCompletion function in this file
 * 
 * Role in program logic:
 * This function ensures that the Groq library is properly loaded and initialized before any API calls are made, setting up the foundation for all Groq-related operations in the application.
 * 
 * @returns {Promise<void>} A promise that resolves when Groq is initialized or rejects if there's an error
 * @throws {Error} If Groq is not defined after loading the script or if initialization fails
 */
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
 * 
 * How it works:
 * 1. Validates input messages
 * 2. Schedules the request based on rate limits
 * 3. Initializes Groq if not already done
 * 4. Sends the request to Groq API with retry logic
 * 5. Processes and returns the response
 * 
 * Usage example:
 * ```
 * const messages = [{ role: 'user', content: 'Hello, how are you?' }];
 * const options = { model: 'llama3-groq-8b-8192-tool-use-preview', max_tokens: 100 };
 * createChatCompletion(messages, options)
 *   .then(response => console.log('Groq response:', response))
 *   .catch(error => console.error('Chat completion error:', error));
 * ```
 * 
 * Used in:
 * - handleChatInteraction function in this file
 * - Potentially used in other chat-related components or services
 * 
 * Role in program logic:
 * This function is the core method for interacting with the Groq API to generate chat completions. It handles all the complexities of API communication, including retries and rate limiting, making it easier for other parts of the application to use Groq's capabilities.
 * 
 * @param {Array} messages - Array of message objects.
 * @param {Object} options - Additional options.
 * @returns {Promise<string>} Response content.
 * @throws {Error} If messages are invalid or if API request fails
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
 * 
 * How it works:
 * 1. Attempts to use a fallback model when the primary model fails
 * 2. Uses circuit breaker pattern to prevent cascading failures
 * 3. Schedules the request and initializes Groq if necessary
 * 4. Sends the request to the fallback model
 * 5. Returns the fallback response or throws an error if both attempts fail
 * 
 * Usage example:
 * ```
 * const messages = [{ role: 'user', content: 'Hello' }];
 * const options = { max_tokens: 100 };
 * const primaryError = new Error('Primary model failed');
 * handleFallback(messages, options, primaryError)
 *   .then(fallbackResponse => console.log('Fallback response:', fallbackResponse))
 *   .catch(error => console.error('Both primary and fallback failed:', error));
 * ```
 * 
 * Used in:
 * - Not directly used in this file, but could be integrated into createChatCompletion for robust error handling
 * 
 * Role in program logic:
 * This function provides a fallback mechanism for the chat completion system, enhancing the reliability of the application by attempting to use an alternative model when the primary one fails.
 * 
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
 * 
 * How it works:
 * 1. Validates input messages
 * 2. Schedules the request based on rate limits
 * 3. Initializes Groq if not already done
 * 4. Creates a streaming request to the Groq API
 * 5. Yields response content chunks as they arrive
 * 
 * Usage example:
 * ```
 * const messages = [{ role: 'user', content: 'Tell me a story' }];
 * const options = { model: 'llama3-groq-8b-8192-tool-use-preview', max_tokens: 200 };
 * (async () => {
 *   for await (const chunk of createStreamingChatCompletion(messages, options)) {
 *     console.log('Received chunk:', chunk);
 *   }
 * })().catch(error => console.error('Streaming error:', error));
 * ```
 * 
 * Used in:
 * - Potentially used in real-time chat interfaces or streaming response components
 * 
 * Role in program logic:
 * This function enables streaming responses from the Groq API, allowing for real-time display of AI-generated content, which can enhance user experience in chat or content generation scenarios.
 * 
 * @param {Array} messages - Array of message objects.
 * @param {Object} options - Additional options.
 * @returns {AsyncGenerator<string>} Yields response content chunks.
 * @throws {Error} If messages are invalid or if streaming fails
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
 * 
 * How it works:
 * Simply checks if the 'groq' variable is truthy, indicating that the Groq instance has been created.
 * 
 * Usage example:
 * ```
 * if (isGroqInitialized()) {
 *   console.log('Groq is ready to use');
 * } else {
 *   console.log('Groq is not initialized yet');
 * }
 * ```
 * 
 * Used in:
 * - waitForGroqInitialization function in this file
 * - Potentially used in other parts of the application to check Groq's readiness
 * 
 * Role in program logic:
 * This function provides a quick way to check if Groq is initialized, which can be useful for conditional logic or error prevention in parts of the application that depend on Groq being ready.
 * 
 * @returns {boolean} True if Groq is initialized, false otherwise.
 */
export function isGroqInitialized() {
    return !!groq;
}

/**
 * Waits for the Groq library to be initialized.
 * 
 * How it works:
 * 1. Sets up an interval to check if Groq is initialized
 * 2. Resolves the promise when Groq is ready
 * 3. Rejects the promise if initialization doesn't occur within the specified timeout
 * 
 * Usage example:
 * ```
 * waitForGroqInitialization(5000)
 *   .then(() => console.log('Groq is now initialized'))
 *   .catch(error => console.error('Groq initialization timed out:', error));
 * ```
 * 
 * Used in:
 * - Potentially used in application startup logic or before making Groq API calls
 * 
 * Role in program logic:
 * This function ensures that other parts of the application wait for Groq to be fully initialized before attempting to use it, preventing errors that could occur from premature API calls.
 * 
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
 * 
 * How it works:
 * 1. Takes a user input as a string
 * 2. Creates a message object with the user's input
 * 3. Calls createChatCompletion to get a response from Groq
 * 4. Returns the response or throws an error if the interaction fails
 * 
 * Usage example:
 * ```
 * handleChatInteraction("What's the weather like today?")
 *   .then(response => console.log('AI response:', response))
 *   .catch(error => console.error('Chat interaction failed:', error));
 * ```
 * 
 * Used in:
 * - Likely used in chat interface components or services that handle user-AI interactions
 * 
 * Role in program logic:
 * This function serves as a high-level interface for chat interactions, simplifying the process of sending user input to the Groq API and receiving responses. It's a key component in implementing chat functionality in the application.
 * 
 * @param {string} userInput - The user's input message.
 * @returns {Promise<string>} The response from the Groq API.
 * @throws {Error} If the chat interaction fails
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
