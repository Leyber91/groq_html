import { MetaPromptManager } from './utils/metaPromptManager.js';

/**
 * Handles graceful degradation of operations in case of errors.
 * 
 * This function is a crucial part of the error handling and user experience
 * management in the application. It serves as a centralized point for
 * dealing with errors that occur during various operations, ensuring that
 * the application degrades gracefully instead of crashing or providing a
 * poor user experience.
 * 
 * The function works as follows:
 * 1. It creates a new instance of MetaPromptManager.
 * 2. It calls the handleError method of MetaPromptManager with the operation and error.
 * 3. It generates a user-friendly fallback message.
 * 4. It returns the fallback message to be displayed to the user.
 * 
 * Usage examples:
 * 
 * 1. Handling a network error:
 *    try {
 *      await fetchData();
 *    } catch (error) {
 *      const message = handleGracefulDegradation('fetchData', error);
 *      displayToUser(message);
 *    }
 * 
 * 2. Handling a parsing error:
 *    try {
 *      parseComplexData(rawData);
 *    } catch (error) {
 *      const message = handleGracefulDegradation('parseComplexData', error);
 *      logError(message);
 *    }
 * 
 * Files that use this function:
 * - js/api/dataFetcher.js
 * - js/components/UserDashboard.js
 * - js/services/dataProcessor.js
 * 
 * Role in overall program logic:
 * This function plays a critical role in maintaining a smooth user experience
 * by providing a standardized way to handle errors across the application.
 * It allows for centralized error handling, logging, and user communication,
 * which is essential for maintaining and debugging the application.
 * 
 * For more detailed documentation, please refer to:
 * [Error Handling Strategy](docs/error-handling.md)
 * [Graceful Degradation Implementation](docs/graceful-degradation.md)
 * 
 * @param {string} operation - The name of the operation that failed
 * @param {Error} error - The error object that was thrown
 * @returns {string} A user-friendly fallback message
 */
export function handleGracefulDegradation(operation, error) {
    const metaPromptManager = new MetaPromptManager();
    metaPromptManager.handleError(operation, error);

    // Generate a user-friendly message
    const fallbackMessage = "We're experiencing some issues. Please try again later.";

    // Optionally, log the error or notify developers
    return fallbackMessage;
}