// File: js/api/registerFunctions.js

import FunctionRegistry from './functionRegistry.js';
import { FunctionInputSchema, FunctionOutputSchema } from '../models/functionModels.js';
import { logger } from '../utils/logger.js';

// Initialize the function registry instance
const functionRegistry = new FunctionRegistry();

/**
 * Registers a new function with the function registry.
 * @param {string} name - The name of the function.
 * @param {Function} func - The function implementation.
 * @param {Object} [inputSchema=FunctionInputSchema] - The schema for function input.
 * @param {Object} [outputSchema=FunctionOutputSchema] - The schema for function output.
 */
function registerFunction(name, func, inputSchema = FunctionInputSchema, outputSchema = FunctionOutputSchema) {
  try {
    functionRegistry.register(name, func, inputSchema, outputSchema);
    logger.info(`Function registered: ${name}`);
  } catch (error) {
    logger.error(`Failed to register function ${name}:`, error);
  }
}

// Example Function: Summarize Text
function summarizeText({ query, context }) {
  // Implementation for summarizing text
  return {
    result: `Summary of: ${query}`,
    confidence: 0.9
  };
}

// Register the example function
registerFunction('summarizeText', summarizeText);

// Example Function: Translate Text
function translateText({ query, targetLanguage }) {
  // Implementation for translating text
  return {
    result: `Translated "${query}" to ${targetLanguage}`,
    confidence: 0.95
  };
}

// Register the translateText function
registerFunction('translateText', translateText, FunctionInputSchema, FunctionOutputSchema);

// Example Function: Sentiment Analysis
function analyzeSentiment({ query, context }) {
  // Implementation for sentiment analysis
  return {
    sentiment: 'positive',
    confidence: 0.98
  };
}

// Register the analyzeSentiment function
registerFunction('analyzeSentiment', analyzeSentiment);

// Add more function registrations here...

export default functionRegistry;
