import fs from 'fs';
import path from 'path';

const logFilePath = path.join(__dirname, 'token_usage.log');

/**
 * Logs token usage to a file.
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