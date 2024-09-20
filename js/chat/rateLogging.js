import fs from 'fs';
import path from 'path';

const logFilePath = path.join(__dirname, 'token_usage.log');

/**
 * Logs token usage to a file.
 * 
 * This function creates a log entry with a timestamp, model name, used tokens, and remaining tokens.
 * It then appends this entry to a log file specified by `logFilePath`.
 * 
 * How it works:
 * 1. Creates a timestamp using the current date and time
 * 2. Formats a log entry string with the provided information
 * 3. Appends the log entry to the file using fs.appendFile
 * 4. If an error occurs during writing, it logs the error to the console
 * 
 * Usage example:
 * ```
 * logTokenUsage('gpt-3.5-turbo', 100, 900);
 * ```
 * 
 * Files that use this function:
 * - js/chat/chatHandler.js
 * - js/api/openaiService.js
 * 
 * Role in overall program logic:
 * This function is crucial for monitoring and tracking token usage across different AI models.
 * It helps in resource management and can be used for billing purposes or to prevent exceeding token limits.
 * 
 * @param {string} model - The model name.
 * @param {number} usedTokens - Number of tokens used.
 * @param {number} remainingTokens - Number of tokens remaining.
 */
function logTokenUsage(model, usedTokens, remainingTokens) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - Model: ${model}, Used Tokens: ${usedTokens}, Remaining Tokens: ${remainingTokens}\n`;
    fs.appendFile(logFilePath, logEntry, (err) => {
        if (err) console.error("Failed to log token usage:", err);
    });
}

export { logTokenUsage };