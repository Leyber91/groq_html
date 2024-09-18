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
     * @param {string} [apiKey=config.GROQ_API_KEY] - The Groq API key.
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
     * @param {string} functionName - The name of the function to execute.
     * @param {FunctionInput} inputData - The input data for the function.
     * @param {string} [model="mixtral-8x7b-32768"] - The model to use for execution.
     * @returns {Promise<FunctionOutput>} The result of the function execution.
     * @throws Will throw an error if execution fails.
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
