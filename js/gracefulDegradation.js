import { MetaPromptManager } from './utils/metaPromptManager.js';

export function handleGracefulDegradation(operation, error) {
    const metaPromptManager = new MetaPromptManager();
    metaPromptManager.handleError(operation, error);

    // Generate a user-friendly message
    const fallbackMessage = "We're experiencing some issues. Please try again later.";

    // Optionally, log the error or notify developers
    return fallbackMessage;
}