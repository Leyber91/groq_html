import { createChatCompletion } from './chat/groqIntegration.js';
import { MetaPromptManager } from './utils/metaPromptManager.js'; // Updated path

const metaPromptManager = new MetaPromptManager();

/**
 * Handles user input with enhanced error handling and metaprompting.
 * 
 * This function is a crucial part of the program's user interaction logic. It takes user input,
 * processes it through a chat completion API, and returns the response. If an error occurs,
 * it provides a user-friendly error message.
 * 
 * How it works:
 * 1. The function receives a string input from the user.
 * 2. It attempts to create a chat completion using the input.
 * 3. If successful, it returns the API response.
 * 4. If an error occurs, it logs the error and returns a friendly error message.
 * 
 * Usage examples:
 * ```javascript
 * // Example 1: Successful interaction
 * const userQuestion = "What's the weather like today?";
 * const answer = await handleUserInput(userQuestion);
 * console.log(answer); // Outputs the API's response
 * 
 * // Example 2: Error handling
 * const invalidInput = null;
 * const errorResponse = await handleUserInput(invalidInput);
 * console.log(errorResponse); // Outputs the error message
 * ```
 * 
 * Files using this function:
 * - src/main.js
 * - src/components/ChatInterface.js
 * - src/services/userService.js
 * 
 * Role in program logic:
 * This function serves as the primary interface between user input and the AI chat completion
 * system. It encapsulates the complexity of API interactions and error handling, providing
 * a clean and consistent interface for other parts of the application to use when processing
 * user queries.
 * 
 * @param {string} input - The user's input query
 * @returns {Promise<string>} - A promise that resolves to the chat completion response or an error message
 * @see [Error Handling Documentation](./docs/error-handling.md)
 * @see [User Input Processing](./docs/user-input.md)
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