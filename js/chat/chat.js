import { processBatchedRequests } from './batchProcessing.js';
import { chatWithMOA as coreChatWithMOA } from './chatInteractions.js';
import { logger } from '../utils/logger.js';
import { ArtifactManager } from './artifacts.js';
import { formatContent } from './message-formatting.js';

// Re-export the necessary functions to maintain the same external interface
export {
    coreChatWithMOA as chatWithMOA,
    processBatchedRequests
};

/**
 * Handle user input and process it through the MOA system.
 * @param {string} input - The user's input message.
 * @returns {Promise<void>}
 */
export async function onUserInput(input) {
    try {
        displayUserMessage(input);
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
 * Display the user's message in the chat interface.
 * @param {string} message - The user's message to display.
 */
function displayUserMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message user-message';
        messageElement.innerHTML = `<div class="message-content">${message}</div>`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        logger.error("Chat messages container not found");
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
        messageElement.className = 'message assistant-message';
        
        // Use formatContent to properly format the response
        const formattedContent = formatContent(response);
        
        messageElement.innerHTML = `
            <div class="message-header">Assistant</div>
            <div class="message-content">${formattedContent}</div>
        `;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        showFeedbackButtons();
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
        errorElement.className = 'message error-message';
        errorElement.textContent = errorMessage;
        chatMessages.appendChild(errorElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        logger.error("Chat messages container not found");
    }
}

/**
 * Show the feedback buttons after displaying a response.
 */
function showFeedbackButtons() {
    const feedbackButtons = document.getElementById('feedback-buttons');
    if (feedbackButtons) {
        feedbackButtons.classList.remove('hidden');
    }
}

/**
 * Handle user feedback.
 * @param {string} feedbackType - The type of feedback (positive or negative).
 */
function handleFeedback(feedbackType) {
    logger.info(`User provided ${feedbackType} feedback`);
    // Here you can implement logic to handle the feedback,
    // such as sending it to a server or using it to improve the model
    const feedbackButtons = document.getElementById('feedback-buttons');
    if (feedbackButtons) {
        feedbackButtons.classList.add('hidden');
    }
}

// Initialize chat functionality
document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-input-form');
    const userInput = document.getElementById('user-input');
    const chatContainer = document.getElementById('chat-messages');
    const positiveFeedbackButton = document.getElementById('positive-feedback');
    const negativeFeedbackButton = document.getElementById('negative-feedback');

    if (chatForm && userInput && chatContainer) {
        logger.info("Chat interface initialized successfully");

        // Instantiate ArtifactManager with the chat container
        window.artifactManager = new ArtifactManager(chatContainer);

        chatForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const input = userInput.value.trim();
            if (input) {
                logger.debug("User input received:", input);
                onUserInput(input);
                userInput.value = '';
            }
        });

        if (positiveFeedbackButton && negativeFeedbackButton) {
            positiveFeedbackButton.addEventListener('click', () => handleFeedback('positive'));
            negativeFeedbackButton.addEventListener('click', () => handleFeedback('negative'));
        } else {
            logger.error("Feedback buttons not found");
        }
    } else {
        logger.error("Chat form, user input, or chat container not found");
    }
});
