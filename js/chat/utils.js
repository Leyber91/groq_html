// utils.js

import { estimateTokens } from '../api/api-core.js';

/**
 * Splits the input text into manageable chunks based on token limits.
 * Optimized for performance and readability.
 * @param {string} input - The input text to be chunked.
 * @param {number} maxTokens - The maximum number of tokens allowed per chunk.
 * @param {string} modelName - The name of the model to estimate tokens.
 * @returns {string[]} An array of chunked strings.
 */
export function chunkInput(input, maxTokens, modelName) {
    const chunks = [];
    let currentChunk = '';
    const sentences = input.match(/[^.!?]+[.!?]+[\])'"`’”]*|.+/g) || [];

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
