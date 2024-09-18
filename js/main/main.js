import { initializeThemeToggle } from './theme-toggle.js';
import { initializeApp } from './initializeApp.js';
import { syncDiagramWithConfig } from './syncDiagram.js';
import { setupMainModelControls } from './setupMainModelControls.js';
import { setupAdaptiveThresholdControls } from './setupAdaptiveThresholdControls.js';
import { setupChatInterface } from './setupChatInterface.js';
import { setupDiagramControls } from './setupDiagramControls.js';
import { setupMOAControlsToggle } from './setupMOAControlsToggle.js';
import { updateMOAControls } from './updateMOAControls.js';
import { chatWithMOA, handleUserFeedback } from '../chat/chatInteractions.js';
import { moaConfig, updateMOAConfig } from '../config/config.js';

function setupSelfEvolvingControls() {
    const selfEvolvingEnabled = document.getElementById('self-evolving-enabled');
    const learningRate = document.getElementById('learning-rate');
    const learningRateValue = document.getElementById('learning-rate-value');
    const feedbackThreshold = document.getElementById('feedback-threshold');
    const feedbackThresholdValue = document.getElementById('feedback-threshold-value');

    selfEvolvingEnabled.checked = moaConfig.self_evolving.enabled;
    learningRate.value = moaConfig.self_evolving.learning_rate;
    learningRateValue.textContent = moaConfig.self_evolving.learning_rate;
    feedbackThreshold.value = moaConfig.self_evolving.feedback_threshold;
    feedbackThresholdValue.textContent = moaConfig.self_evolving.feedback_threshold;

    selfEvolvingEnabled.addEventListener('change', (e) => {
        updateMOAConfig({
            self_evolving: {
                ...moaConfig.self_evolving,
                enabled: e.target.checked
            }
        });
    });

    learningRate.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        learningRateValue.textContent = value;
        updateMOAConfig({
            self_evolving: {
                ...moaConfig.self_evolving,
                learning_rate: value
            }
        });
    });

    feedbackThreshold.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        feedbackThresholdValue.textContent = value;
        updateMOAConfig({
            self_evolving: {
                ...moaConfig.self_evolving,
                feedback_threshold: value
            }
        });
    });
}

function setupFeedbackButtons() {
    const feedbackButtons = document.getElementById('feedback-buttons');
    const positiveButton = document.getElementById('positive-feedback');
    const negativeButton = document.getElementById('negative-feedback');

    let lastResponse = '';

    window.addEventListener('moaResponse', (event) => {
        lastResponse = event.detail.response;
        feedbackButtons.classList.remove('hidden');
    });

    positiveButton.addEventListener('click', () => {
        handleUserFeedback('positive', lastResponse);
        feedbackButtons.classList.add('hidden');
    });

    negativeButton.addEventListener('click', () => {
        handleUserFeedback('negative', lastResponse);
        feedbackButtons.classList.add('hidden');
    });
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        await initializeApp();
        syncDiagramWithConfig();
        setupMainModelControls();
        setupAdaptiveThresholdControls();
        setupChatInterface();
        setupDiagramControls();
        setupMOAControlsToggle();
        updateMOAControls();
        initializeThemeToggle();
        setupSelfEvolvingControls();
        setupFeedbackButtons();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
});

// Update the chat interface to use the new chatWithMOA function
function updateChatInterface() {
    const sendButton = document.getElementById('send-button');
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');

    sendButton.addEventListener('click', async () => {
        const message = userInput.value.trim();
        if (message) {
            // Add user message to chat
            const userMessageElement = document.createElement('div');
            userMessageElement.className = 'message user-message';
            userMessageElement.textContent = message;
            chatMessages.appendChild(userMessageElement);

            // Clear input
            userInput.value = '';

            try {
                // Get response from MOA
                const { context, totalTokens } = await chatWithMOA(message);

                // Add MOA response to chat
                const moaMessageElement = document.createElement('div');
                moaMessageElement.className = 'message moa-message';
                moaMessageElement.textContent = context;
                chatMessages.appendChild(moaMessageElement);

                // Dispatch event with MOA response
                window.dispatchEvent(new CustomEvent('moaResponse', { detail: { response: context } }));

                // Log total tokens used
                console.log(`Total tokens used: ${totalTokens}`);
            } catch (error) {
                console.error('Error in chat interaction:', error);
                const errorMessageElement = document.createElement('div');
                errorMessageElement.className = 'message error-message';
                errorMessageElement.textContent = 'An error occurred. Please try again.';
                chatMessages.appendChild(errorMessageElement);
            }

            // Scroll to bottom of chat
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });

    // Allow sending message with Enter key
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendButton.click();
        }
    });
}

// Call updateChatInterface after DOM content is loaded
document.addEventListener('DOMContentLoaded', updateChatInterface);
