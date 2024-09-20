// js/api/groqExecutor.js

import { Groq } from '../lib/groq.min.js'; // Ensure Groq is compatible with ES6 imports
import { FunctionInput, FunctionOutput } from '../models/functionModels.js';
import config from '../config/config.js';
import { logger } from '../utils/logger.js';

/**
 * Executes functions via the Groq API.
 */
class GroqExecutor {
    /**
     * Creates an instance of GroqExecutor.
     * 
     * How it works:
     * 1. Validates the provided API key
     * 2. Initializes a Groq client with the API key
     * 3. Logs the successful initialization
     * 
     * @param {string} [apiKey=config.GROQ_API_KEY] - The Groq API key.
     * @throws {Error} If no API key is provided.
     * 
     * Usage example:
     * const executor = new GroqExecutor('your-api-key-here');
     * 
     * Files that use this constructor:
     * - js/services/aiService.js
     * - js/api/groqManager.js
     * 
     * Role in overall program logic:
     * This constructor initializes the GroqExecutor, which is a crucial component for interacting with the Groq API.
     * It ensures that the API key is properly set up, allowing the application to make authenticated requests to Groq.
     */
    constructor(apiKey = config.GROQ_API_KEY) {
        if (!apiKey) {
            throw new Error('Groq API key is required.');
        }
        this.client = new Groq(apiKey);
        logger.info('GroqExecutor initialized.');
    }

    /**
     * Executes a function via the Groq API.
     * 
     * How it works:
     * 1. Logs the function execution attempt with input data
     * 2. Prepares the API request with system and user messages
     * 3. Sends the request to the Groq API
     * 4. Parses the API response
     * 5. Logs the successful execution and returns the result
     * 6. Handles and logs any errors that occur during execution
     * 
     * @param {string} functionName - The name of the function to execute.
     * @param {FunctionInput} inputData - The input data for the function.
     * @param {string} [model="mixtral-8x7b-32768"] - The model to use for execution.
     * @returns {Promise<FunctionOutput>} The result of the function execution.
     * @throws Will throw an error if execution fails.
     * 
     * Usage example:
     * const executor = new GroqExecutor();
     * const result = await executor.execute('calculateTotal', { price: 10, quantity: 2 });
     * 
     * Files that use this function:
     * - js/services/aiService.js
     * - js/api/functionManager.js
     * - js/components/AIAssistant.js
     * 
     * Role in overall program logic:
     * This function is the core method for executing AI-powered functions via the Groq API.
     * It enables the application to leverage Groq's language models for various tasks,
     * acting as a bridge between the application's logic and Groq's AI capabilities.
     */
    async execute(functionName, inputData, model = "mixtral-8x7b-32768") {
        try {
            logger.debug(`Executing function "${functionName}" with input:`, inputData);

            const response = await this.client.chat.completions.create({
                model: model,
                messages: [
                    { role: "system", content: `Execute the ${functionName} function.` },
                    { role: "user", content: JSON.stringify(inputData) }
                ],
                max_tokens: 1000
            });

            const resultContent = response.choices[0].message.content;
            const parsedResult = FunctionOutput.parse(JSON.parse(resultContent));

            logger.debug(`Function "${functionName}" executed successfully with result:`, parsedResult);
            return parsedResult;
        } catch (error) {
            logger.error(`Error executing function "${functionName}":`, error);
            throw new Error(`Error executing function "${functionName}": ${error.message}`);
        }
    }
}

export default GroqExecutor;
