import { createChatCompletion } from './groqIntegration.js';
import { retryWithExponentialBackoff } from '../utils/retry.js';
import { logger } from '../utils/logger.js';

/**
 * Handles user input with retry logic for API calls.
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