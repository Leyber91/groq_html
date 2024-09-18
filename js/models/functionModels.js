// js/models/functionModels.js

class BaseModel {
  constructor(data) {
    this.validate(data);
    Object.assign(this, data);
  }

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
  static fields = {
    query: this.Field({ required: true, type: "string", description: "The user's query" }),
    context: this.Field({ type: "object", description: "Additional context" }),
  };
}

class FunctionOutput extends BaseModel {
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