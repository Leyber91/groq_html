// File: js/api/registerFunctions.js

import FunctionRegistry from './functionRegistry.js';
import { FunctionInputSchema, FunctionOutputSchema } from '../models/functionModels.js';
import { logger } from '../utils/logger.js';

// Initialize the function registry instance
const functionRegistry = new FunctionRegistry();

/**
 * Registers a new function with the function registry.
 * 
 * This function takes a name, function implementation, and optional input/output schemas,
 * and registers the function with the FunctionRegistry. It handles errors and logs the
 * registration process.
 * 
 * @param {string} name - The name of the function.
 * @param {Function} func - The function implementation.
 * @param {Object} [inputSchema=FunctionInputSchema] - The schema for function input.
 * @param {Object} [outputSchema=FunctionOutputSchema] - The schema for function output.
 * 
 * Usage example:
 * registerFunction('summarizeText', summarizeText, CustomInputSchema, CustomOutputSchema);
 * 
 * Other files that use this function:
 * - js/api/customFunctions.js
 * - js/modules/functionLoader.js
 * 
 * Role in overall program logic:
 * This function is crucial for dynamically adding new functions to the system. It allows
 * for extensibility and modularity by enabling the registration of custom functions that
 * can be used throughout the application.
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
/**
 * Summarizes the given text.
 * 
 * This function takes a query and context, and returns a summary along with a confidence score.
 * 
 * @param {Object} params - The input parameters.
 * @param {string} params.query - The text to summarize.
 * @param {string} params.context - Additional context for summarization.
 * @returns {Object} - An object containing the summary and confidence score.
 * 
 * Usage example:
 * const result = summarizeText({ query: "Long text here...", context: "Article context" });
 * console.log(result.result); // Outputs: "Summary of: Long text here..."
 * 
 * Other files that use this function:
 * - js/modules/textProcessing.js
 * - js/components/SummaryGenerator.js
 * 
 * Role in overall program logic:
 * This function serves as an example of how custom functions can be implemented and registered.
 * It demonstrates the structure expected by the function registry and how to handle input/output.
 */
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
/**
 * Translates the given text to a target language.
 * 
 * This function takes a query and target language, and returns the translated text along with a confidence score.
 * 
 * @param {Object} params - The input parameters.
 * @param {string} params.query - The text to translate.
 * @param {string} params.targetLanguage - The language to translate to.
 * @returns {Object} - An object containing the translated text and confidence score.
 * 
 * Usage example:
 * const result = translateText({ query: "Hello, world!", targetLanguage: "Spanish" });
 * console.log(result.result); // Outputs: "Translated "Hello, world!" to Spanish"
 * 
 * Other files that use this function:
 * - js/modules/languageProcessing.js
 * - js/components/Translator.js
 * 
 * Role in overall program logic:
 * This function demonstrates how to handle more complex input parameters and showcases
 * another type of text processing function that can be registered and used in the system.
 */
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
/**
 * Analyzes the sentiment of the given text.
 * 
 * This function takes a query and context, and returns the sentiment analysis result along with a confidence score.
 * 
 * @param {Object} params - The input parameters.
 * @param {string} params.query - The text to analyze.
 * @param {string} params.context - Additional context for sentiment analysis.
 * @returns {Object} - An object containing the sentiment analysis result and confidence score.
 * 
 * Usage example:
 * const result = analyzeSentiment({ query: "I love this product!", context: "Product review" });
 * console.log(result.sentiment); // Outputs: "positive"
 * 
 * Other files that use this function:
 * - js/modules/sentimentAnalysis.js
 * - js/components/FeedbackAnalyzer.js
 * 
 * Role in overall program logic:
 * This function showcases how more advanced NLP tasks can be integrated into the system.
 * It provides an example of a function that returns a different structure of results,
 * demonstrating the flexibility of the function registry.
 */
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
