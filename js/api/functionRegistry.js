// js/api/functionRegistry.js

import { FunctionInput, FunctionOutput } from '../models/functionModels.js';
import { logger } from '../utils/logger.js';

/**
 * Manages the registration and retrieval of functions.
 */
export class FunctionRegistry {
  constructor() {
    /** @type {Object.<string, { func: Function, inputModel: FunctionInput, outputModel: FunctionOutput }>} */
    this.functions = {};
  }

  /**
   * Registers a function with its input and output models.
   * 
   * How it works:
   * 1. Checks if the function is already registered
   * 2. If registered, logs a warning and overwrites the existing entry
   * 3. Stores the function, input model, and output model in the functions object
   * 4. Logs the successful registration
   * 
   * @param {string} name - The name of the function.
   * @param {Function} func - The function to register.
   * @param {FunctionInput} inputModel - The input model schema.
   * @param {FunctionOutput} outputModel - The output model schema.
   * 
   * @example
   * const registry = new FunctionRegistry();
   * registry.register('calculateTotal', (price, quantity) => price * quantity, PriceQuantityInput, TotalOutput);
   * 
   * @usedBy
   * - js/services/functionService.js
   * - js/api/functionManager.js
   * 
   * @role
   * This method is crucial for maintaining a centralized registry of available functions.
   * It enables dynamic function discovery and execution throughout the application.
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
   * 
   * How it works:
   * 1. Checks if the function exists in the registry
   * 2. If found, removes the function from the registry and logs the action
   * 3. If not found, logs a warning
   * 4. Returns a boolean indicating success or failure
   * 
   * @param {string} name - The name of the function to unregister.
   * @returns {boolean} True if unregistered, false if not found.
   * 
   * @example
   * const registry = new FunctionRegistry();
   * registry.register('calculateTotal', (price, quantity) => price * quantity);
   * const unregistered = registry.unregister('calculateTotal');
   * console.log(unregistered); // true
   * 
   * @usedBy
   * - js/services/functionService.js
   * - js/api/functionManager.js
   * 
   * @role
   * This method allows for dynamic removal of functions from the registry,
   * which is useful for managing the lifecycle of functions and preventing
   * conflicts or outdated function calls.
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
   * 
   * How it works:
   * 1. Looks up the function in the registry using the provided name
   * 2. Returns the function specification if found, or undefined if not found
   * 
   * @param {string} name - The name of the function.
   * @returns {{ func: Function, inputModel: FunctionInput, outputModel: FunctionOutput }|undefined} The function spec or undefined.
   * 
   * @example
   * const registry = new FunctionRegistry();
   * registry.register('calculateTotal', (price, quantity) => price * quantity, PriceQuantityInput, TotalOutput);
   * const funcSpec = registry.getFunction('calculateTotal');
   * if (funcSpec) {
   *   const result = funcSpec.func(10, 2);
   *   console.log(result); // 20
   * }
   * 
   * @usedBy
   * - js/services/functionService.js
   * - js/api/functionExecutor.js
   * - js/components/FunctionSelector.js
   * 
   * @role
   * This method is essential for retrieving function specifications,
   * enabling dynamic function execution and type checking throughout the application.
   */
  getFunction(name) {
    return this.functions[name];
  }

  /**
   * Retrieves all registered function names.
   * 
   * How it works:
   * 1. Uses Object.keys() to get an array of all function names in the registry
   * 
   * @returns {Array<string>} Array of function names.
   * 
   * @example
   * const registry = new FunctionRegistry();
   * registry.register('func1', () => {});
   * registry.register('func2', () => {});
   * const allFunctions = registry.getAllFunctions();
   * console.log(allFunctions); // ['func1', 'func2']
   * 
   * @usedBy
   * - js/components/FunctionList.js
   * - js/services/functionAnalytics.js
   * 
   * @role
   * This method provides a way to list all available functions,
   * which is useful for generating function menus, documentation,
   * or performing bulk operations on registered functions.
   */
  getAllFunctions() {
    return Object.keys(this.functions);
  }

  /**
   * Retrieves detailed information about all registered functions.
   * 
   * How it works:
   * 1. Uses Object.entries() to iterate over all functions in the registry
   * 2. Maps each entry to an object containing the function name and model names
   * 3. Returns an array of these detailed objects
   * 
   * @returns {Array<Object>} Array of function details.
   * 
   * @example
   * const registry = new FunctionRegistry();
   * registry.register('calculateTotal', (price, quantity) => price * quantity, PriceQuantityInput, TotalOutput);
   * const details = registry.getFunctionDetails();
   * console.log(details);
   * // [{ name: 'calculateTotal', inputModel: 'PriceQuantityInput', outputModel: 'TotalOutput' }]
   * 
   * @usedBy
   * - js/components/FunctionDetailView.js
   * - js/services/functionDocumentation.js
   * 
   * @role
   * This method provides detailed information about registered functions,
   * which is useful for generating comprehensive function documentation,
   * debugging, or displaying detailed function information in the UI.
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
