// src/setupChatInterface.js
import { chatWithMOA } from '../chat/chat.js';

export function setupChatInterface() {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-message');

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
