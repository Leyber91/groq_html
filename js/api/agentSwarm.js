// agentSwarm.js
const FunctionRegistry = require('./functionRegistry');
const SemanticRouter = require('./semanticRouter');
const GroqExecutor = require('./groqExecutor');
const { FunctionInput, FunctionOutput } = require('../models/pydanticModels');
const config = require('../config/config');

class AgentSwarm {
  constructor() {
    this.registry = new FunctionRegistry();
    this.router = new SemanticRouter(this.registry);
    this.executor = new GroqExecutor(config.GROQ_API_KEY);
  }

  registerFunction(name, func, inputModel = FunctionInput, outputModel = FunctionOutput) {
    this.registry.register(name, func, inputModel, outputModel);
  }

  async processQuery(query, context = {}) {
    try {
      const functionName = this.router.route(query);
      const functionSpec = this.registry.getFunction(functionName);
      
      if (!functionSpec) {
        throw new Error(`No function found for query: ${query}`);
      }

      const inputData = new functionSpec.inputModel({ query, context });
      const result = await this.executor.execute(functionName, inputData);

      return result;
    } catch (error) {
      console.error('Error processing query:', error);
      throw error;
    }
  }

  async executeFunction(functionName, inputData) {
    try {
      const functionSpec = this.registry.getFunction(functionName);
      
      if (!functionSpec) {
        throw new Error(`Function not found: ${functionName}`);
      }

      const input = new functionSpec.inputModel(inputData);
      const result = await this.executor.execute(functionName, input);

      return result;
    } catch (error) {
      console.error(`Error executing function ${functionName}:`, error);
      throw error;
    }
  }
}

module.exports = AgentSwarm;
