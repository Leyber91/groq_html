// src/setupChatInterface.js
import { chatWithMOA } from '../chat/chat.js';

/**
 * Sets up the chat interface for user interaction with the MOA (Multi-Objective Architecture).
 * 
 * This function performs the following tasks:
 * 1. Retrieves the user input field and send button elements from the DOM.
 * 2. Checks if these elements exist, logging an error if they're not found.
 * 3. Adds a click event listener to the send button to process user input.
 * 4. Adds a keypress event listener to the input field to allow sending messages with the Enter key.
 * 
 * The function handles user input by:
 * - Trimming whitespace from the input
 * - Calling the chatWithMOA function with the user's message
 * - Clearing the input field after sending
 * 
 * Usage example:
 * ```
 * import { setupChatInterface } from './setupChatInterface.js';
 * 
 * document.addEventListener('DOMContentLoaded', setupChatInterface);
 * ```
 * 
 * Files that use this function:
 * - js/main/main.js (likely called during application initialization)
 * 
 * Role in overall program logic:
 * This function is crucial for enabling user interaction with the MOA system.
 * It sets up the primary interface through which users can send messages and
 * receive responses, forming the core of the chat functionality in the application.
 */
export function setupChatInterface() {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    if (!userInput || !sendButton) {
        console.error('Chat interface elements not found');
        return;
    }

    sendButton.addEventListener('click', () => {
        const message = userInput.value.trim();
        if (message) {
            chatWithMOA(message);
            userInput.value = '';
        }
    });

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendButton.click();
        }
    });
}
