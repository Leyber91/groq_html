// pydanticModels.js

/**
 * BaseModel class serves as the foundation for other model classes in the project.
 * It provides basic functionality for object creation and parsing.
 * 
 * Usage:
 * const baseInstance = new BaseModel({ key: 'value' });
 * 
 * Files using this class:
 * - js/models/pydanticModels.js (current file)
 * - Potentially used in other files that import from this module
 * 
 * Role in program logic:
 * Provides a base structure for data models, ensuring consistent object creation and parsing across the application.
 */
class BaseModel {
  /**
   * Constructor for BaseModel.
   * @param {Object} data - The data to initialize the model with.
   * 
   * How it works:
   * Uses Object.assign to copy all enumerable properties from the data object to the instance.
   */
  constructor(data) {
    Object.assign(this, data);
  }

  /**
   * Static method to parse data and create a new instance of the class.
   * @param {Object} data - The data to parse and create an instance with.
   * @returns {BaseModel} A new instance of the class.
   * 
   * How it works:
   * Creates and returns a new instance of the class using the provided data.
   */
  static parse(data) {
    return new this(data);
  }
}

/**
 * FunctionInput class represents the input structure for functions in the project.
 * It extends BaseModel to inherit its basic functionality.
 * 
 * Usage:
 * const input = new FunctionInput({ query: 'search query', context: { key: 'value' } });
 * 
 * Files using this class:
 * - js/models/pydanticModels.js (current file)
 * - Likely used in files handling function inputs throughout the project
 * 
 * Role in program logic:
 * Standardizes the structure of function inputs across the application, ensuring consistency in data handling.
 */
class FunctionInput extends BaseModel {
  /**
   * Constructor for FunctionInput.
   * @param {Object} data - The data to initialize the model with.
   * 
   * How it works:
   * Calls the parent constructor, then sets specific properties for query and context.
   */
  constructor(data) {
    super(data);
    this.query = data.query;
    this.context = data.context || {};
  }
}

/**
 * FunctionOutput class represents the output structure for functions in the project.
 * It extends BaseModel to inherit its basic functionality.
 * 
 * Usage:
 * const output = new FunctionOutput({ result: 'function result', confidence: 0.95 });
 * 
 * Files using this class:
 * - js/models/pydanticModels.js (current file)
 * - Likely used in files handling function outputs throughout the project
 * 
 * Role in program logic:
 * Standardizes the structure of function outputs across the application, ensuring consistency in result handling and confidence scoring.
 */
class FunctionOutput extends BaseModel {
  /**
   * Constructor for FunctionOutput.
   * @param {Object} data - The data to initialize the model with.
   * 
   * How it works:
   * Calls the parent constructor, then sets specific properties for result and confidence.
   */
  constructor(data) {
    super(data);
    this.result = data.result;
    this.confidence = data.confidence;
  }
}

module.exports = { BaseModel, FunctionInput, FunctionOutput };