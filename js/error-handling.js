import { createChatCompletion } from './chat/groqIntegration.js';
import { MetaPromptManager } from './utils/metaPromptManager.js'; // Updated path

const metaPromptManager = new MetaPromptManager();

/**
 * Handles user input with enhanced error handling and metaprompting.
 * @param {string} input 
 * @returns {Promise<string>}
 */
async function handleUserInput(input) {
    try {
        const response = await createChatCompletion(input);
        return response;
    } catch (error) {
        console.error("Error handling user input:", error);
        // Provide a user-friendly message
        return "Sorry, we're experiencing issues processing your request. Please try again later.";
    }
}

export { handleUserInput, metaPromptManager };