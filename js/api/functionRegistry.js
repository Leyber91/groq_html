// js/api/functionRegistry.js

import { FunctionInput, FunctionOutput } from '../models/functionModels.js';
import { logger } from '../utils/logger.js';

/**
 * Manages the registration and retrieval of functions.
 */
class FunctionRegistry {
  constructor() {
    /** @type {Object.<string, { func: Function, inputModel: FunctionInput, outputModel: FunctionOutput }>} */
    this.functions = {};
  }

  /**
   * Registers a function with its input and output models.
   * @param {string} name - The name of the function.
   * @param {Function} func - The function to register.
   * @param {FunctionInput} inputModel - The input model schema.
   * @param {FunctionOutput} outputModel - The output model schema.
   */
  register(name, func, inputModel = FunctionInput, outputModel = FunctionOutput) {
    if (this.functions[name]) {
      logger.warn(`Function "${name}" is already registered. Overwriting.`);
    }
    this.functions[name] = {
      func,
      inputModel,
      outputModel
    };
    logger.info(`Registered function "${name}".`);
  }

  /**
   * Unregisters a function by name.
   * @param {string} name - The name of the function to unregister.
   * @returns {boolean} True if unregistered, false if not found.
   */
  unregister(name) {
    if (this.functions[name]) {
      delete this.functions[name];
      logger.info(`Unregistered function "${name}".`);
      return true;
    }
    logger.warn(`Function "${name}" not found. Cannot unregister.`);
    return false;
  }

  /**
   * Retrieves a function's specification by name.
   * @param {string} name - The name of the function.
   * @returns {{ func: Function, inputModel: FunctionInput, outputModel: FunctionOutput }|undefined} The function spec or undefined.
   */
  getFunction(name) {
    return this.functions[name];
  }

  /**
   * Retrieves all registered function names.
   * @returns {Array<string>} Array of function names.
   */
  getAllFunctions() {
    return Object.keys(this.functions);
  }

  /**
   * Retrieves detailed information about all registered functions.
   * @returns {Array<Object>} Array of function details.
   */
  getFunctionDetails() {
    return Object.entries(this.functions).map(([name, spec]) => ({
      name,
      inputModel: spec.inputModel.name,
      outputModel: spec.outputModel.name
    }));
  }
}

export default FunctionRegistry;
