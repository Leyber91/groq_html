// utils.js

import { estimateTokens } from '../api/api-core.js';

/**
 * Splits the input text into manageable chunks based on token limits.
 * Optimized for performance and readability.
 * 
 * How it works:
 * 1. Initializes an array to store chunks and a variable for the current chunk.
 * 2. Splits the input into sentences using a regex pattern.
 * 3. Iterates through each sentence:
 *    a. Attempts to add the sentence to the current chunk.
 *    b. If adding the sentence exceeds the token limit:
 *       - Adds the current chunk to the chunks array if it exists.
 *       - If the sentence itself exceeds the token limit, splits it into words.
 *       - Processes words individually, creating new chunks as needed.
 *    c. If adding the sentence doesn't exceed the limit, updates the current chunk.
 * 4. Adds any remaining content in the current chunk to the chunks array.
 * 5. Returns the array of chunks.
 * 
 * Usage example:
 * ```javascript
 * const longText = "This is a long text that needs to be split into chunks...";
 * const chunks = chunkInput(longText, 100, 'gpt-3.5-turbo');
 * console.log(chunks);
 * // Output: ['This is a long text that...', 'needs to be split into...', 'chunks...']
 * ```
 * 
 * Files that use this function:
 * - js/chat/chatHandler.js
 * - js/api/openaiService.js
 * - js/utils/textProcessor.js
 * 
 * Role in overall program logic:
 * This function is crucial for handling large inputs in AI-based text processing.
 * It ensures that text inputs are split into manageable sizes that comply with
 * token limits of AI models, allowing for efficient processing of large documents
 * or long conversations without exceeding API limitations.
 * 
 * @param {string} input - The input text to be chunked.
 * @param {number} maxTokens - The maximum number of tokens allowed per chunk.
 * @param {string} modelName - The name of the model to estimate tokens.
 * @returns {string[]} An array of chunked strings.
 */
export function chunkInput(input, maxTokens, modelName) {
    const chunks = [];
    let currentChunk = '';
    const sentences = input.match(/[^.!?]+[.!?]+[\])'"`'"]*|.+/g) || [];

    for (const sentence of sentences) {
        const potentialChunk = currentChunk ? `${currentChunk} ${sentence.trim()}` : sentence.trim();
        const potentialTokenCount = estimateTokens([{ role: 'user', content: potentialChunk }], modelName);

        if (potentialTokenCount > maxTokens) {
            if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = '';
            }

            const sentenceTokenCount = estimateTokens([{ role: 'user', content: sentence }], modelName);
            if (sentenceTokenCount > maxTokens) {
                const words = sentence.split(' ');
                for (const word of words) {
                    const potentialWordChunk = currentChunk ? `${currentChunk} ${word}` : word;
                    const wordTokenCount = estimateTokens([{ role: 'user', content: potentialWordChunk }], modelName);

                    if (wordTokenCount > maxTokens) {
                        if (currentChunk) {
                            chunks.push(currentChunk);
                        }
                        currentChunk = word;
                    } else {
                        currentChunk = potentialWordChunk;
                    }
                }
            } else {
                currentChunk = sentence;
            }
        } else {
            currentChunk = potentialChunk;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}
