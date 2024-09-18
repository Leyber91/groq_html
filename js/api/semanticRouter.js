// File: js/api/semanticRouter.js

import FunctionRegistry from './functionRegistry.js';
import { logger } from '../utils/logger.js';
import { SentenceTransformer } from 'sentence-transformers'; // Ensure this package is installed
import * as math from 'mathjs'; // For vector operations
import NodeCache from 'node-cache';

// Initialize cache with a TTL of 24 hours
const embeddingCache = new NodeCache({ stdTTL: 86400 });

class SemanticRouter {
  /**
   * Creates a SemanticRouter instance.
   * @param {FunctionRegistry} functionRegistry - The function registry instance.
   * @param {number} [topK=1] - Number of top similar functions to consider.
   * @param {number} [similarityThreshold=0.7] - Minimum similarity score to accept a match.
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
   */
  _getFunctionPrompt(functionName) {
    const functionSpec = this.registry.getFunction(functionName);
    return functionSpec ? functionSpec.func.toString() : '';
  }

  /**
   * Computes the embedding for a given text.
   * @param {string} text - The input text.
   * @returns {Promise<Array<number>>} The embedding vector.
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
   */
  provideFeedback(functionName, similarity, success) {
    // Placeholder for feedback mechanism (e.g., logging, updating embeddings)
    logger.info(`Feedback received for function "${functionName}": Similarity=${similarity}, Success=${success}`);
    // Potential enhancements: retrain embedding model or adjust similarity thresholds based on feedback
  }
}

export default SemanticRouter;
