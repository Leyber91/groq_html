import { createChatCompletion } from './groqIntegration.js';
import { retryWithExponentialBackoff } from '../utils/retry.js';
import { logger } from '../utils/logger.js';

/**
 * Handles user input with retry logic for API calls.
 * 
 * How it works:
 * 1. Takes user input as a parameter
 * 2. Uses retryWithExponentialBackoff to attempt createChatCompletion
 * 3. If successful, returns the API response
 * 4. If all retries fail, logs the error and returns a user-friendly message
 * 
 * Usage example:
 * ```
 * const userMessage = "Hello, AI!";
 * const response = await handleUserInput(userMessage);
 * console.log(response);
 * ```
 * 
 * Used in:
 * - js/chat/chatInterface.js
 * - js/chat/messageProcessor.js
 * 
 * Role in program logic:
 * This function serves as the primary entry point for processing user input in the chat system.
 * It ensures robustness by implementing retry logic and provides a consistent error message
 * if the API calls ultimately fail.
 * 
 * @param {string} input - The user's input message.
 * @returns {Promise<string>} - The response from the API or an error message.
 */
export async function handleUserInput(input) {
    try {
        const response = await retryWithExponentialBackoff(() => createChatCompletion([{ role: 'user', content: input }]), 5, 1000, 2);
        return response;
    } catch (error) {
        logger.error("Error handling user input after retries:", error);
        return "Sorry, something went wrong. Please try again later.";
    }
}

/**
 * Handles specific API errors and provides appropriate responses.
 * 
 * How it works:
 * 1. Logs the error
 * 2. Checks if the error has a response property
 * 3. If it does, switches on the response status to return appropriate messages
 * 4. If no response, checks if there's a request property to determine if it's a network error
 * 5. Returns a generic error message if none of the above conditions are met
 * 
 * Usage example:
 * ```
 * try {
 *   // API call
 * } catch (error) {
 *   const errorMessage = handleApiError(error);
 *   console.log(errorMessage);
 * }
 * ```
 * 
 * Used in:
 * - js/chat/apiCaller.js
 * - js/chat/errorHandler.js
 * 
 * Role in program logic:
 * This function provides a centralized way to handle API errors, ensuring consistent
 * and user-friendly error messages across the application. It helps in debugging by logging
 * errors and improves user experience by providing meaningful feedback.
 * 
 * @param {Error} error - The error object.
 * @returns {string} - A user-friendly error message.
 */
export function handleApiError(error) {
    logger.error("API Error:", error);

    if (error.response) {
        switch (error.response.status) {
            case 400:
                return "There was an issue with the request. Please try again.";
            case 401:
                return "Authentication failed. Please check your API key.";
            case 403:
                return "You don't have permission to access this resource.";
            case 404:
                return "The requested resource was not found.";
            case 429:
                return "Too many requests. Please try again later.";
            case 500:
                return "There was an internal server error. Please try again later.";
            default:
                return "An unexpected error occurred. Please try again later.";
        }
    }

    if (error.request) {
        return "No response received from the server. Please check your internet connection.";
    }

    return "An unexpected error occurred. Please try again later.";
}

/**
 * Handles errors related to token limits.
 * 
 * How it works:
 * 1. Logs a warning about the token limit being exceeded
 * 2. Defines an array of larger models
 * 3. Finds the index of the current model in the array
 * 4. If a larger model is available, returns an object suggesting to use it
 * 5. If no larger model is available, returns an object suggesting to chunk the input
 * 
 * Usage example:
 * ```
 * const result = await handleTokenLimitExceeded("llama3-groq-8b-8192-tool-use-preview", 8500);
 * if (result.status === 'use_larger_model') {
 *   console.log(`Switching to model: ${result.model}`);
 * } else if (result.status === 'chunk_input') {
 *   console.log("Need to chunk input");
 * }
 * ```
 * 
 * Used in:
 * - js/chat/modelSelector.js
 * - js/chat/inputProcessor.js
 * 
 * Role in program logic:
 * This function helps manage token limits by suggesting either a larger model or input chunking.
 * It's crucial for maintaining the chat functionality when dealing with large inputs or complex conversations.
 * 
 * @param {string} modelName - The name of the model.
 * @param {number} tokenCount - The current token count.
 * @returns {Promise<Object>} - An object with status and potentially a new model name.
 */
export async function handleTokenLimitExceeded(modelName, tokenCount) {
    logger.warn(`Token limit exceeded for model ${modelName}. Current count: ${tokenCount}`);

    // This is a simplified example. In a real-world scenario, you might want to 
    // implement more sophisticated logic for model selection.
    const largerModels = [
        "llama3-groq-8b-8192-tool-use-preview",
        "llama3-8b-8192"
    ];

    const currentModelIndex = largerModels.indexOf(modelName);
    if (currentModelIndex < largerModels.length - 1) {
        const newModel = largerModels[currentModelIndex + 1];
        logger.info(`Switching to larger model: ${newModel}`);
        return { status: 'use_larger_model', model: newModel };
    } else {
        logger.info('No larger model available. Attempting to chunk input.');
        return { status: 'chunk_input' };
    }
}

/**
 * Displays an error message to the user in the chat interface.
 * 
 * How it works:
 * 1. Attempts to find the chat messages container in the DOM
 * 2. If found, creates a new div element with the error message
 * 3. Appends the error message to the chat container
 * 4. Scrolls the chat container to show the new message
 * 5. If the chat container is not found, logs an error
 * 
 * Usage example:
 * ```
 * displayErrorMessage("Oops! Something went wrong. Please try again.");
 * ```
 * 
 * Used in:
 * - js/chat/chatInterface.js
 * - js/chat/errorHandler.js
 * 
 * Role in program logic:
 * This function is responsible for presenting error messages to the user within the chat interface.
 * It ensures that users are informed about issues in a visually consistent manner, enhancing the overall user experience.
 * 
 * @param {string} message - The error message to display.
 */
export function displayErrorMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        const errorElement = document.createElement('div');
        errorElement.className = 'message error';
        errorElement.textContent = message;
        chatMessages.appendChild(errorElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        logger.error("Chat messages container not found");
    }
}