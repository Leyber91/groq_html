// pydanticModels.js

class BaseModel {
  constructor(data) {
    Object.assign(this, data);
  }

  static parse(data) {
    return new this(data);
  }
}

class FunctionInput extends BaseModel {
  constructor(data) {
    super(data);
    this.query = data.query;
    this.context = data.context || {};
  }
}

class FunctionOutput extends BaseModel {
  constructor(data) {
    super(data);
    this.result = data.result;
    this.confidence = data.confidence;
  }
}

module.exports = { BaseModel, FunctionInput, FunctionOutput };