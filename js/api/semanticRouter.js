// File: js/api/semanticRouter.js

import { FunctionRegistry } from './functionRegistry.js';
import { logger } from '../utils/logger.js';

// Add the required CDN links
const scripts = [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.8.0/math.min.js' },
    { src: 'https://cdn.jsdelivr.net/npm/node-cache@5.1.2/index.min.js' },
    { src: 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.1' }
];

scripts.forEach(scriptInfo => {
    const script = document.createElement('script');
    script.src = scriptInfo.src;
    document.head.appendChild(script);
});

// Initialize cache with a TTL of 24 hours
const embeddingCache = new NodeCache({ stdTTL: 86400 });

export class SemanticRouter {
  /**
   * Creates a SemanticRouter instance.
   * @param {FunctionRegistry} functionRegistry - The function registry instance.
   * @param {number} [topK=1] - Number of top similar functions to consider.
   * @param {number} [similarityThreshold=0.7] - Minimum similarity score to accept a match.
   * 
   * How it works:
   * 1. Initializes the SemanticRouter with a function registry and configuration parameters.
   * 2. Sets up the sentence transformer model for embedding computation.
   * 3. Initializes an empty object to store function embeddings.
   * 4. Calls _initializeEmbeddings to compute embeddings for all registered functions.
   * 
   * Usage example:
   * const registry = new FunctionRegistry();
   * const router = new SemanticRouter(registry, 3, 0.8);
   * 
   * Files that use this constructor:
   * - js/api/semanticRouter.js (internal use)
   * - js/services/routingService.js (potentially)
   * 
   * Role in overall program logic:
   * The SemanticRouter is a core component for intelligent function routing based on
   * semantic similarity. It enables the system to match user queries or inputs to the
   * most appropriate registered functions, enhancing the flexibility and accuracy of
   * the program's response to various inputs.
   */
  constructor(functionRegistry, topK = 1, similarityThreshold = 0.7) {
    this.registry = functionRegistry;
    this.topK = topK;
    this.similarityThreshold = similarityThreshold;
    this.model = new SentenceTransformer('all-MiniLM-L6-v2'); // Choose an appropriate model
    this.functionEmbeddings = {};
    this._initializeEmbeddings();
  }

  /**
   * Initializes embeddings for all registered functions.
   * 
   * How it works:
   * 1. Retrieves all function names from the registry.
   * 2. Generates prompts for each function using _getFunctionPrompt.
   * 3. Computes embeddings for all prompts using the sentence transformer model.
   * 4. Stores the embeddings in the functionEmbeddings object and the cache.
   * 5. Logs the success or failure of the initialization process.
   * 
   * Usage example:
   * await semanticRouter._initializeEmbeddings();
   * 
   * Files that use this function:
   * - js/api/semanticRouter.js (internal use)
   * 
   * Role in overall program logic:
   * This function prepares the SemanticRouter for operation by computing and storing
   * embeddings for all registered functions. It's crucial for enabling efficient
   * semantic similarity comparisons during the routing process.
   */
  async _initializeEmbeddings() {
    const functionNames = this.registry.getAllFunctions();
    const prompts = functionNames.map(name => this._getFunctionPrompt(name));

    try {
      const embeddings = await this.model.encode(prompts);
      functionNames.forEach((name, index) => {
        this.functionEmbeddings[name] = embeddings[index];
        embeddingCache.set(name, embeddings[index]);
      });
      logger.info('Function embeddings initialized.');
    } catch (error) {
      logger.error('Error initializing function embeddings:', error);
    }
  }

  /**
   * Retrieves the function prompt for embedding.
   * @param {string} functionName - The name of the function.
   * @returns {string} The prompt text used for embedding.
   * 
   * How it works:
   * 1. Retrieves the function specification from the registry using the function name.
   * 2. If the function exists, returns its string representation.
   * 3. If the function doesn't exist, returns an empty string.
   * 
   * Usage example:
   * const prompt = semanticRouter._getFunctionPrompt('calculateTax');
   * 
   * Files that use this function:
   * - js/api/semanticRouter.js (internal use)
   * 
   * Role in overall program logic:
   * This helper function generates the text representation of a function,
   * which is used to compute its embedding. It's a crucial step in preparing
   * functions for semantic comparison.
   */
  _getFunctionPrompt(functionName) {
    const functionSpec = this.registry.getFunction(functionName);
    return functionSpec ? functionSpec.func.toString() : '';
  }

  /**
   * Computes the embedding for a given text.
   * @param {string} text - The input text.
   * @returns {Promise<Array<number>>} The embedding vector.
   * 
   * How it works:
   * 1. Uses the sentence transformer model to encode the input text.
   * 2. Returns the resulting embedding vector.
   * 3. If an error occurs, logs it and returns an empty array.
   * 
   * Usage example:
   * const embedding = await semanticRouter._computeEmbedding('Calculate tax for $100');
   * 
   * Files that use this function:
   * - js/api/semanticRouter.js (internal use)
   * 
   * Role in overall program logic:
   * This function is essential for converting text inputs (queries or function descriptions)
   * into numerical vectors that can be compared for semantic similarity. It's used both
   * during initialization and when routing new queries.
   */
  async _computeEmbedding(text) {
    try {
      return await this.model.encode([text]);
    } catch (error) {
      logger.error('Error computing embedding:', error);
      return [];
    }
  }

  /**
   * Calculates cosine similarity between two vectors.
   * @param {Array<number>} vecA - First vector.
   * @param {Array<number>} vecB - Second vector.
   * @returns {number} Cosine similarity score.
   * 
   * How it works:
   * 1. Computes the dot product of the two input vectors.
   * 2. Calculates the magnitude (norm) of each vector.
   * 3. If both magnitudes are non-zero, returns the cosine similarity.
   * 4. If either magnitude is zero, returns 0 to avoid division by zero.
   * 
   * Usage example:
   * const similarity = semanticRouter._cosineSimilarity([1, 2, 3], [2, 4, 6]);
   * 
   * Files that use this function:
   * - js/api/semanticRouter.js (internal use)
   * 
   * Role in overall program logic:
   * This function is crucial for comparing the similarity between two embedding vectors.
   * It's used to determine how closely a query matches each registered function,
   * enabling the router to select the most appropriate function for a given input.
   */
  _cosineSimilarity(vecA, vecB) {
    const dotProduct = math.dot(vecA, vecB);
    const magnitudeA = math.norm(vecA);
    const magnitudeB = math.norm(vecB);
    return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
  }

  /**
   * Routes a query to the most semantically similar function.
   * @param {string} query - The user query.
   * @returns {Promise<string|null>} The name of the best matching function or null if none found.
   * 
   * How it works:
   * 1. Validates the input query.
   * 2. Computes the embedding for the query.
   * 3. Calculates the cosine similarity between the query embedding and each function embedding.
   * 4. Sorts the functions by similarity score in descending order.
   * 5. Returns the top matching function if it meets the similarity threshold, otherwise returns null.
   * 
   * Usage example:
   * const matchedFunction = await semanticRouter.route('Calculate tax for $100 income');
   * 
   * Files that use this function:
   * - js/api/semanticRouter.js (internal use)
   * - js/services/queryHandler.js (potentially)
   * - js/components/userInterface.js (potentially)
   * 
   * Role in overall program logic:
   * This is the main function of the SemanticRouter, responsible for matching user queries
   * to the most appropriate registered function. It enables the program to intelligently
   * interpret and respond to a wide variety of user inputs, enhancing the system's
   * flexibility and user-friendliness.
   */
  async route(query) {
    if (!query || typeof query !== 'string') {
      logger.warn('Invalid query provided to router.');
      return null;
    }

    try {
      const queryEmbedding = (await this._computeEmbedding(query))[0];
      if (!queryEmbedding) {
        logger.warn('Failed to compute embedding for the query.');
        return null;
      }

      const similarities = {};

      for (const [name, embedding] of Object.entries(this.functionEmbeddings)) {
        similarities[name] = this._cosineSimilarity(queryEmbedding, embedding);
      }

      // Sort functions by similarity in descending order
      const sortedFunctions = Object.entries(similarities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, this.topK);

      // Check if the top similarity meets the threshold
      if (sortedFunctions.length > 0 && sortedFunctions[0][1] >= this.similarityThreshold) {
        logger.info(`Best match for query "${query}" is function "${sortedFunctions[0][0]}" with similarity ${sortedFunctions[0][1].toFixed(2)}`);
        return sortedFunctions[0][0];
      }

      logger.warn(`No suitable function found for query "${query}". Highest similarity: ${sortedFunctions[0] ? sortedFunctions[0][1].toFixed(2) : 'N/A'}`);
      return null;
    } catch (error) {
      logger.error('Error routing query:', error);
      return null;
    }
  }

  /**
   * Updates embeddings dynamically (e.g., when new functions are registered).
   * 
   * How it works:
   * 1. Retrieves all current function names from the registry.
   * 2. Generates prompts for each function.
   * 3. Computes new embeddings for all functions.
   * 4. Updates the functionEmbeddings object and the cache with the new embeddings.
   * 5. Logs the success or failure of the update process.
   * 
   * Usage example:
   * await semanticRouter.updateEmbeddings();
   * 
   * Files that use this function:
   * - js/api/semanticRouter.js (internal use)
   * - js/services/functionManager.js (potentially)
   * 
   * Role in overall program logic:
   * This function allows the SemanticRouter to adapt to changes in the function registry.
   * When new functions are added or existing ones are modified, calling this function
   * ensures that the router's embeddings are up-to-date, maintaining accurate routing.
   */
  async updateEmbeddings() {
    const functionNames = this.registry.getAllFunctions();
    const prompts = functionNames.map(name => this._getFunctionPrompt(name));

    try {
      const embeddings = await this.model.encode(prompts);
      functionNames.forEach((name, index) => {
        this.functionEmbeddings[name] = embeddings[index];
        embeddingCache.set(name, embeddings[index]);
      });
      logger.info('Function embeddings updated.');
    } catch (error) {
      logger.error('Error updating function embeddings:', error);
    }
  }

  /**
   * Provides feedback to improve routing decisions over time.
   * @param {string} functionName - The function that was used.
   * @param {number} similarity - The similarity score.
   * @param {boolean} success - Whether the function handled the query successfully.
   * 
   * How it works:
   * 1. Logs the feedback information including function name, similarity score, and success status.
   * 2. Currently a placeholder for more advanced feedback mechanisms.
   * 
   * Usage example:
   * semanticRouter.provideFeedback('calculateTax', 0.85, true);
   * 
   * Files that use this function:
   * - js/api/semanticRouter.js (internal use)
   * - js/services/feedbackCollector.js (potentially)
   * 
   * Role in overall program logic:
   * This function is designed to collect feedback on the routing decisions,
   * which can be used to improve the router's performance over time. While currently
   * a placeholder, it can be expanded to implement more sophisticated learning mechanisms,
   * such as adjusting similarity thresholds or retraining the embedding model based on usage patterns.
   */
  provideFeedback(functionName, similarity, success) {
    // Placeholder for feedback mechanism (e.g., logging, updating embeddings)
    logger.info(`Feedback received for function "${functionName}": Similarity=${similarity}, Success=${success}`);
    // Potential enhancements: retrain embedding model or adjust similarity thresholds based on feedback
  }
}

export default SemanticRouter;
