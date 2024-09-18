import torch from '../lib/torch.js'; // Import Torch from the lib folder
import { retryOperation } from '../utils/retryHandler.js';
import { logger } from '../utils/logger.js';

// Initialize Torch (assuming initialization is required)
torch.initialize();

// Example usage of Torch within processBatch function
async function processBatch(batch) {
    return await retryOperation(async () => {
        if (batch.toLowerCase().includes('translate')) {
            return await queryGroqApi('llama3-groq-70b-8192-tool-use-preview', [{ role: 'user', content: batch }]);
        } else {
            return await queryLocalModel('llama3-8b-8192', [{ role: 'user', content: batch }]);
        }
    }, 1000, 3); // 1-second delay, 3 retries
}

export async function handleUserInput(userInput) {
    try {
        const batches = splitIntoBatches(userInput, moaConfig.maxTokensPerBatch);
        let aggregatedResponse = '';

        for (const batch of batches) {
            logger.info(`Processing batch: ${batch}`);
            const response = await processBatch(batch);
            logger.info(`Batch response: ${response}`);
            aggregatedResponse += response + ' ';
        }

        logger.info('Aggregated Response:', aggregatedResponse.trim());
        return aggregatedResponse.trim();
    } catch (error) {
        logger.error('Error handling user input:', error);
        throw error;
    }
}