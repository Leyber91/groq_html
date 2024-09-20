// agentSwarm.js
import { FunctionRegistry } from './functionRegistry.js';
import { SemanticRouter } from './semanticRouter.js';
import { FunctionInput, GroqPrompt, FunctionChain, executeGroqFunction, createGroqPrompt } from './functionCalling.js';
import { systemSettings } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { withErrorHandling, handleGracefulDegradation } from './error-handling.js';

/**
 * AgentSwarm class represents the main orchestrator for function execution and query processing.
 * It integrates FunctionRegistry, SemanticRouter, and function calling capabilities to manage and execute functions.
 */
export class AgentSwarm {
  /**
   * Initializes the AgentSwarm with necessary components.
   */
  constructor() {
    this.registry = new FunctionRegistry();
    this.router = new SemanticRouter(this.registry);
    logger.info('AgentSwarm initialized with FunctionRegistry and SemanticRouter');
  }

  /**
   * Registers a new function with the AgentSwarm.
   * 
   * @param {string} name - The name of the function to register
   * @param {Function} func - The function to be registered
   * @param {Object} inputModel - The input model for the function (default: FunctionInput)
   * @param {Object} outputModel - The output model for the function
   */
  registerFunction(name, func, inputModel = FunctionInput, outputModel) {
    this.registry.register(name, func, inputModel, outputModel);
    logger.info(`Function "${name}" registered successfully`);
  }

  /**
   * Processes a natural language query and executes the appropriate function(s).
   * 
   * @param {string} query - The natural language query to process
   * @param {Object} context - Additional context for the query (default: {})
   * @returns {Promise<Object>} The result of the executed function(s)
   */
  processQuery = withErrorHandling(async (query, context = {}) => {
    logger.info(`Processing query: "${query}"`);

    // Use SemanticRouter to get initial function suggestion
    const initialFunctionName = this.router.route(query);
    logger.debug(`Initial function suggestion from SemanticRouter: ${initialFunctionName}`);

    // Create a GroqPrompt for query analysis
    const analysisPrompt = new GroqPrompt(
      "You are a query analyzer. Determine which functions need to be called to answer the query.",
      `Analyze this query and return a list of function names to be called. The initial suggestion is ${initialFunctionName}. Query: ${query}`,
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

    // Execute the analysis
    const analysisResult = await executeGroqFunction(analysisPrompt);
    const functionNames = analysisResult.function_names;

    if (!Array.isArray(functionNames) || functionNames.length === 0) {
      logger.warn('No functions identified to handle the query');
      throw new Error('No functions identified to handle the query.');
    }

    logger.debug(`Functions identified for query: ${functionNames.join(', ')}`);

    // Create a FunctionChain based on the analysis result
    const functionInputs = functionNames.map(name => {
      const func = this.registry.getFunction(name);
      if (!func) {
        logger.error(`Function "${name}" not found in registry`);
        throw new Error(`Function "${name}" not found in registry.`);
      }
      return new FunctionInput(name, { query, context });
    });

    const functionChain = new FunctionChain(functionInputs);
    const result = await functionChain.execute();

    logger.info(`Query processed successfully. Result:`, result);
    return result;
  }, 'AgentSwarm.processQuery');

  /**
   * Executes a specific function by name with given input data.
   * 
   * @param {string} functionName - The name of the function to execute
   * @param {Object} inputData - The input data for the function
   * @returns {Promise<Object>} The result of the executed function
   */
  executeFunction = withErrorHandling(async (functionName, inputData) => {
    logger.info(`Executing function: ${functionName}`);
    const functionSpec = this.registry.getFunction(functionName);
    
    if (!functionSpec) {
      logger.error(`Function not found: ${functionName}`);
      throw new Error(`Function not found: ${functionName}`);
    }

    const input = new FunctionInput(functionName, inputData);
    const prompt = createGroqPrompt(input);
    const result = await executeGroqFunction(prompt);

    logger.info(`Function ${functionName} executed successfully`);
    return result;
  }, 'AgentSwarm.executeFunction');
}

export default AgentSwarm;
