import { executeWithRetryAndCircuitBreaker } from '../utils/retry.js';
import { scheduleRequest } from '../utils/rateLimiter.js';
import { logger } from '../utils/logger.js';
import { API_KEY } from '../config/config.js';

/**
 * Represents the input for a function call.
 * 
 * How it works:
 * - Validates and stores function name, parameters, and optional context
 * - Throws errors for invalid inputs
 * 
 * Usage example:
 * ```
 * const input = new FunctionInput('calculateTotal', { price: 10, quantity: 2 }, 'Order processing');
 * ```
 * 
 * Used in:
 * - js/api/api-core.js
 * - js/chat/messageHandler.js
 * 
 * Role in program logic:
 * Provides a standardized way to package function call information for processing by the AutonomousQueryHandler and FunctionChain classes.
 */
class FunctionInput {
    /**
     * @param {string} functionName - The name of the function to be called.
     * @param {Object} parameters - The parameters for the function call.
     * @param {string|null} [context=null] - Optional context for the function call.
     */
    constructor(functionName, parameters, context = null) {
        if (typeof functionName !== 'string' || !functionName.trim()) {
            throw new Error('Function name must be a non-empty string.');
        }
        if (typeof parameters !== 'object' || parameters === null) {
            throw new Error('Parameters must be a non-null object.');
        }

        this.functionName = functionName.trim();
        this.parameters = parameters;
        this.context = context;
    }
}

/**
 * Represents a prompt for the Groq API.
 * 
 * How it works:
 * - Validates and stores system message, user message, functions, and function call mode
 * - Throws errors for invalid inputs
 * 
 * Usage example:
 * ```
 * const prompt = new GroqPrompt(
 *   "You are a helpful assistant.",
 *   "What's the weather like today?",
 *   [{ name: "get_weather", description: "Get current weather", parameters: {...} }],
 *   "auto"
 * );
 * ```
 * 
 * Used in:
 * - js/api/api-core.js
 * - js/chat/promptGenerator.js
 * 
 * Role in program logic:
 * Structures prompts for the Groq API, ensuring consistent formatting and validation of inputs for API calls.
 */
class GroqPrompt {
    /**
     * @param {string} systemMessage - The system message for the prompt.
     * @param {string} userMessage - The user message for the prompt.
     * @param {Array<Object>} functions - The functions available for the prompt.
     * @param {string} [functionCall="auto"] - The function call mode.
     */
    constructor(systemMessage, userMessage, functions, functionCall = "auto") {
        if (typeof systemMessage !== 'string' || !systemMessage.trim()) {
            throw new Error('System message must be a non-empty string.');
        }
        if (typeof userMessage !== 'string' || !userMessage.trim()) {
            throw new Error('User message must be a non-empty string.');
        }
        if (!Array.isArray(functions)) {
            throw new Error('Functions must be an array.');
        }

        this.systemMessage = systemMessage.trim();
        this.userMessage = userMessage.trim();
        this.functions = functions;
        this.functionCall = functionCall;
    }
}

/**
 * Creates a Groq prompt from the given input data.
 * 
 * How it works:
 * - Takes a FunctionInput object and constructs a GroqPrompt
 * - Sets up system and user messages for function execution
 * - Defines the function structure for the Groq API
 * 
 * Usage example:
 * ```
 * const input = new FunctionInput('calculateTotal', { price: 10, quantity: 2 });
 * const prompt = createGroqPrompt(input);
 * ```
 * 
 * Used in:
 * - js/api/functionCalling.js (FunctionChain.execute)
 * - js/chat/messageHandler.js
 * 
 * Role in program logic:
 * Bridges FunctionInput and GroqPrompt, preparing function calls for execution by the Groq API.
 * 
 * @param {FunctionInput} inputData - The input data for creating the prompt.
 * @returns {GroqPrompt} The created Groq prompt.
 */
function createGroqPrompt(inputData) {
    return new GroqPrompt(
        "You are a function execution assistant. Execute the requested function and return the result.",
        `Execute the function ${inputData.functionName} with parameters: ${JSON.stringify(inputData.parameters)}`,
        [{
            name: inputData.functionName,
            description: "Execute the specified function",
            parameters: {
                type: "object",
                properties: {
                    result: { type: "string", description: "The result of the function execution" }
                },
                required: ["result"]
            }
        }]
    );
}

const apiKey = API_KEY;

/**
 * Executes a function call using the Groq API.
 * 
 * How it works:
 * - Validates the input prompt
 * - Prepares messages for the API call
 * - Schedules the request using rate limiting
 * - Executes the API call with retry and circuit breaker patterns
 * - Parses and returns the function call result
 * 
 * Usage example:
 * ```
 * const prompt = new GroqPrompt(...);
 * const result = await executeGroqFunction(prompt);
 * ```
 * 
 * Used in:
 * - js/api/functionCalling.js (FunctionChain.execute)
 * - js/chat/messageHandler.js
 * 
 * Role in program logic:
 * Core function for executing API calls to Groq, handling rate limiting, retries, and error handling.
 * 
 * @param {GroqPrompt} prompt - The prompt for the function call.
 * @returns {Promise<Object>} The result of the function call.
 * @throws {Error} If there's an error executing the function.
 */
async function executeGroqFunction(prompt) {
    if (!(prompt instanceof GroqPrompt)) {
        throw new Error('Invalid prompt provided. Must be an instance of GroqPrompt.');
    }

    try {
        const messages = [
            { role: "system", content: prompt.systemMessage },
            { role: "user", content: prompt.userMessage }
        ];

        await scheduleRequest("mixtral-8x7b-32768", messages);

        const response = await executeWithRetryAndCircuitBreaker(() =>
            client.chat.completions.create({
                model: "mixtral-8x7b-32768",
                messages: messages,
                functions: prompt.functions,
                function_call: prompt.functionCall
            })
        );

        if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
            throw new Error('Invalid response structure from Groq API.');
        }

        const functionCallArgs = response.choices[0].message.function_call.arguments;
        if (!functionCallArgs) {
            throw new Error('No arguments returned from function call.');
        }

        return JSON.parse(functionCallArgs);
    } catch (e) {
        logger.error(`Error executing Groq function: ${e.message}`);
        throw new Error(`Error executing Groq function: ${e.message}`);
    }
}

/**
 * Represents a chain of function calls.
 * 
 * How it works:
 * - Stores an array of FunctionInput objects
 * - Executes functions in sequence, accumulating results
 * 
 * Usage example:
 * ```
 * const chain = new FunctionChain([
 *   new FunctionInput('getUser', { id: 123 }),
 *   new FunctionInput('calculateDiscount', { userId: 123, orderTotal: 100 })
 * ]);
 * const result = await chain.execute();
 * ```
 * 
 * Used in:
 * - js/api/api-core.js
 * - js/chat/messageHandler.js
 * 
 * Role in program logic:
 * Enables sequential execution of multiple functions, allowing complex operations to be broken down into smaller, manageable steps.
 */
class FunctionChain {
    /**
     * @param {Array<FunctionInput>} functions - The functions to be chained.
     */
    constructor(functions) {
        if (!Array.isArray(functions) || functions.length === 0) {
            throw new Error('FunctionChain requires a non-empty array of FunctionInput instances.');
        }
        this.functions = functions;
    }

    /**
     * Executes the function chain.
     * @returns {Promise<Object>} The result of the final function in the chain.
     */
    async execute() {
        let result = {};
        for (const func of this.functions) {
            const prompt = createGroqPrompt(func);
            logger.info(`Executing function: ${func.functionName}`);
            const funcResult = await executeGroqFunction(prompt);
            result = { ...result, ...funcResult };
        }
        return result;
    }
}

/**
 * Handles autonomous queries by analyzing and executing appropriate function chains.
 * 
 * How it works:
 * - Maintains a registry of available functions
 * - Analyzes queries to determine required functions
 * - Constructs and executes function chains based on analysis
 * 
 * Usage example:
 * ```
 * const handler = new AutonomousQueryHandler();
 * handler.registerFunction('getWeather', new FunctionInput('getWeather', { location: 'New York' }));
 * const result = await handler.handleQuery("What's the weather in New York?");
 * ```
 * 
 * Used in:
 * - js/api/api-core.js
 * - js/chat/messageHandler.js
 * 
 * Role in program logic:
 * Provides a high-level interface for handling complex queries by automatically determining and executing the necessary function calls.
 */
class AutonomousQueryHandler {
    /**
     * Creates an AutonomousQueryHandler instance.
     */
    constructor() {
        this.functionRegistry = {};
    }

    /**
     * Registers a function with the query handler.
     * @param {string} name - The name of the function.
     * @param {FunctionInput} functionInput - The function input object.
     */
    registerFunction(name, functionInput) {
        if (typeof name !== 'string' || !name.trim()) {
            throw new Error('Function name must be a non-empty string.');
        }
        if (!(functionInput instanceof FunctionInput)) {
            throw new Error('functionInput must be an instance of FunctionInput.');
        }
        this.functionRegistry[name.trim()] = functionInput;
        logger.info(`Function "${name}" registered successfully.`);
    }

    /**
     * Handles a query by analyzing it and executing the appropriate function chain.
     * @param {string} query - The query to handle.
     * @returns {Promise<Object>} The result of handling the query.
     * @throws {Error} If there's an error handling the query.
     */
    async handleQuery(query) {
        if (typeof query !== 'string' || !query.trim()) {
            logger.warn('Received invalid query.');
            throw new Error('Invalid query provided.');
        }

        try {
            const queryPrompt = new GroqPrompt(
                "You are a query analyzer. Determine which functions need to be called to answer the query.",
                `Analyze this query and return a list of function names to be called: ${query}`,
                [{
                    name: "analyze_query",
                    description: "Analyze the query and return a list of function names",
                    parameters: {
                        type: "object",
                        properties: {
                            function_names: { type: "array", items: { type: "string" } }
                        },
                        required: ["function_names"]
                    }
                }]
            );

            const analysisResult = await executeGroqFunction(queryPrompt);
            const functionNames = analysisResult.function_names;

            if (!Array.isArray(functionNames) || functionNames.length === 0) {
                throw new Error('No functions identified to handle the query.');
            }

            const functionInputs = functionNames.map(name => {
                const funcInput = this.functionRegistry[name];
                if (!funcInput) {
                    throw new Error(`Function "${name}" not found in registry.`);
                }
                return funcInput;
            });

            const functionChain = new FunctionChain(functionInputs);
            const result = await functionChain.execute();

            logger.info(`Query handled successfully. Result:`, result);
            return result;
        } catch (e) {
            logger.error(`Error handling query: ${e.message}`);
            throw new Error(`Error handling query: ${e.message}`);
        }
    }
}

export { FunctionInput, GroqPrompt, FunctionChain, AutonomousQueryHandler };
