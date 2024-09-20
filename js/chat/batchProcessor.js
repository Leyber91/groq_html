import torch from '../lib/torch.js'; // Import Torch from the lib folder
import { retryOperation } from '../utils/retryHandler.js';
import { logger } from '../utils/logger.js';

// Initialize Torch (assuming initialization is required)
torch.initialize();

/**
 * Processes a single batch of user input.
 * 
 * This function determines whether to use a local model or a remote API based on the content of the batch.
 * It uses the retryOperation utility to handle potential failures and retry the operation.
 * 
 * @param {string} batch - The batch of text to process.
 * @returns {Promise<string>} The processed response from the model or API.
 * 
 * @example
 * const response = await processBatch("Translate this sentence to French");
 * console.log(response); // Outputs the translated sentence
 * 
 * @example
 * const response = await processBatch("What is the capital of France?");
 * console.log(response); // Outputs the answer using the local model
 * 
 * @see {@link ../utils/retryHandler.js} for the implementation of retryOperation
 * @see {@link ../api/groqApi.js} for the implementation of queryGroqApi
 * @see {@link ../models/localModel.js} for the implementation of queryLocalModel
 * 
 * This function is used in:
 * - handleUserInput (in this file)
 * - ../chat/conversationManager.js
 * - ../api/chatEndpoint.js
 * 
 * Role in program logic:
 * processBatch is a core function in the chat processing pipeline. It handles the actual
 * interaction with AI models, deciding between local and remote processing based on the input.
 * This function enables the system to handle various types of queries efficiently.
 */
async function processBatch(batch) {
    return await retryOperation(async () => {
        if (batch.toLowerCase().includes('translate')) {
            return await queryGroqApi('llama3-groq-70b-8192-tool-use-preview', [{ role: 'user', content: batch }]);
        } else {
            return await queryLocalModel('llama3-8b-8192', [{ role: 'user', content: batch }]);
        }
    }, 1000, 3); // 1-second delay, 3 retries
}

/**
 * Handles user input by splitting it into batches and processing each batch.
 * 
 * This function takes a user's input, splits it into manageable batches, processes each batch,
 * and aggregates the responses. It also handles logging and error management.
 * 
 * @param {string} userInput - The full input from the user.
 * @returns {Promise<string>} The aggregated response from processing all batches.
 * 
 * @example
 * const userQuery = "Translate 'Hello' to French and then tell me the capital of France.";
 * const result = await handleUserInput(userQuery);
 * console.log(result); // Outputs the combined response for both parts of the query
 * 
 * @see {@link ../utils/batchSplitter.js} for the implementation of splitIntoBatches
 * @see {@link ../config/moaConfig.js} for the configuration of maxTokensPerBatch
 * @see {@link ../utils/logger.js} for the logging utility
 * 
 * This function is used in:
 * - ../api/chatEndpoint.js
 * - ../chat/conversationManager.js
 * - ../ui/chatInterface.js
 * 
 * Role in program logic:
 * handleUserInput is the main entry point for processing user queries in the chat system.
 * It orchestrates the entire process of breaking down user input, processing it in batches,
 * and combining the results. This function ensures that large inputs are handled efficiently
 * and that the system can provide coherent responses to complex queries.
 */
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