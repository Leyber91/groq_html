// js/models/functionModels.js

class BaseModel {
  /**
   * Creates a new instance of BaseModel.
   * 
   * This constructor validates the input data and assigns it to the instance.
   * 
   * @param {Object} data - The data to initialize the model with
   * 
   * Usage example:
   * const myModel = new BaseModel({ field1: 'value1', field2: 'value2' });
   * 
   * Other files that use this function:
   * - js/controllers/modelController.js
   * - js/services/dataService.js
   * 
   * Role in overall program logic:
   * This constructor is the foundation for all model classes in the application.
   * It ensures that all models are initialized with valid data.
   */
  constructor(data) {
    this.validate(data);
    Object.assign(this, data);
  }

  /**
   * Validates the input data against the model's field definitions.
   * 
   * This function checks for required fields, type matching, and custom validations.
   * 
   * @param {Object} data - The data to validate
   * @throws {Error} If validation fails
   * 
   * Usage example:
   * myModel.validate({ field1: 'value1', field2: 'value2' });
   * 
   * Other files that use this function:
   * - js/controllers/modelController.js
   * - js/services/dataService.js
   * 
   * Role in overall program logic:
   * This function ensures data integrity for all models in the application.
   * It's crucial for maintaining consistent and valid data structures.
   */
  validate(data) {
    // Basic validation, can be extended for more complex checks
    for (const [key, field] of Object.entries(this.constructor.fields)) {
      if (field.required && !(key in data)) {
        throw new Error(`Missing required field: ${key}`);
      }
      if (key in data) {
        const value = data[key];
        if (field.type && typeof value !== field.type) {
          throw new Error(`Invalid type for ${key}: expected ${field.type}, got ${typeof value}`);
        }
        if (field.validator) {
          field.validator(value);
        }
      }
    }
  }

  /**
   * Creates a field definition object.
   * 
   * This static method is used to define fields for model classes.
   * 
   * @param {Object} options - The options for the field
   * @param {boolean} [options.required=false] - Whether the field is required
   * @param {string} [options.type] - The expected type of the field
   * @param {string} [options.description=""] - A description of the field
   * @param {Function} [options.validator] - A custom validation function
   * @returns {Object} The field definition object
   * 
   * Usage example:
   * static fields = {
   *   myField: this.Field({ required: true, type: 'string', description: 'My field' })
   * };
   * 
   * Other files that use this function:
   * - All model files in the js/models/ directory
   * 
   * Role in overall program logic:
   * This method provides a standardized way to define fields for all models,
   * ensuring consistency in field definitions across the application.
   */
  static Field(options = {}) {
    return {
      required: options.required || false,
      type: options.type,
      description: options.description || "",
      validator: options.validator,
    };
  }
}

class FunctionInput extends BaseModel {
  /**
   * Defines the fields for the FunctionInput model.
   * 
   * This static property specifies the structure of function input data.
   * 
   * Usage example:
   * const input = new FunctionInput({ query: 'What is the weather?', context: { location: 'New York' } });
   * 
   * Other files that use this:
   * - js/services/functionService.js
   * - js/controllers/inputController.js
   * 
   * Role in overall program logic:
   * This defines the expected structure for function inputs across the application,
   * ensuring consistency in how functions are called and data is passed.
   */
  static fields = {
    query: this.Field({ required: true, type: "string", description: "The user's query" }),
    context: this.Field({ type: "object", description: "Additional context" }),
  };
}

class FunctionOutput extends BaseModel {
  /**
   * Defines the fields for the FunctionOutput model.
   * 
   * This static property specifies the structure of function output data.
   * 
   * Usage example:
   * const output = new FunctionOutput({ result: 'The weather is sunny', confidence: 0.9 });
   * 
   * Other files that use this:
   * - js/services/functionService.js
   * - js/controllers/outputController.js
   * 
   * Role in overall program logic:
   * This defines the expected structure for function outputs across the application,
   * ensuring consistency in how function results are represented and handled.
   */
  static fields = {
    result: this.Field({ required: true, type: "string", description: "The function's result" }),
    confidence: this.Field({
      required: true,
      type: "number",
      description: "Confidence score",
      validator: (value) => {
        if (value < 0 || value > 1) {
          throw new Error("Confidence score must be between 0 and 1");
        }
      },
    }),
  };
}

export { BaseModel, FunctionInput, FunctionOutput };