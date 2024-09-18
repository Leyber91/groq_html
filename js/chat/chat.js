
import { processBatchedRequests } from './batchProcessing.js';
import { chatWithMOA as coreChatWithMOA } from './chatInteractions.js';
import { logger } from '../utils/logger.js';

// Re-export the necessary functions to maintain the same external interface
export {
    coreChatWithMOA as chatWithMOA,
    processBatchedRequests
};

// js/chat/chat.js

import { ArtifactManager } from './artifacts.js';


/**
 * Handle user input and process it through the MOA system.
 * @param {string} input - The user's input message.
 * @returns {Promise<void>}
 */
export async function onUserInput(input) {
    try {
        const response = await coreChatWithMOA(input);
        if (response && response.context) {
            displayResponse(response.context);
            artifactManager.addArtifactsToChat(artifactManager.generateArtifacts(response.context));
        } else {
            throw new Error("Invalid response format");
        }
    } catch (error) {
        logger.error("Failed to process user input:", error);
        displayError("An unexpected error occurred. Please try again later.");
    }
}

/**
 * Display the response in the chat interface.
 * @param {string} response - The response to display.
 */
function displayResponse(response) {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        logger.debug("Displaying response:", response);
        const messageElement = document.createElement('div');
        messageElement.className = 'message assistant';
        messageElement.textContent = response;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        logger.error("Chat messages container not found");
    }
}

/**
 * Display an error message in the chat interface.
 * @param {string} errorMessage - The error message to display.
 */
function displayError(errorMessage) {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        const errorElement = document.createElement('div');
        errorElement.className = 'message error';
        errorElement.textContent = errorMessage;
        chatMessages.appendChild(errorElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        logger.error("Chat messages container not found");
    }
}

// Initialize chat functionality
document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatContainer = document.getElementById('chat-messages'); // Ensure this matches your actual chat container's ID

    if (userInput && sendButton && chatContainer) {
        logger.info("Chat interface initialized successfully");

        // Instantiate ArtifactManager with the chat container
        window.artifactManager = new ArtifactManager(chatContainer); // Using global variable for accessibility in onUserInput

        sendButton.addEventListener('click', () => {
            const input = userInput.value.trim();
            if (input) {
                logger.debug("User input received:", input);
                onUserInput(input);
                userInput.value = '';
            }
        });

        userInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                sendButton.click();
            }
        });
    } else {
        logger.error("User input, send button, or chat container not found");
    }
});
