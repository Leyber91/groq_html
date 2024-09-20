// File: js/api/prompt-cell.js

import { handleGracefulDegradation } from './error-handling.js';
import { selectAlternativeModel, queueApiRequest, handleTokenLimitExceeded } from './api-core.js';
import { getModelInfo, isModelAvailable } from '../config/model-config.js';

/**
 * Class representing a prompt cell for handling API interactions.
 */
export class PromptCell {
  /**
   * Creates a PromptCell instance.
   * @param {string} prompt - The prompt text.
   * @param {object} methods - Methods for adapting, resonating, and fractal expanding.
   * @param {object} metadata - Metadata associated with the prompt cell.
   */
  constructor(prompt, methods, metadata) {
    this.prompt = prompt;
    this.methods = methods;
    this.metadata = metadata;
    this.state = 'idle';
    this.error = null;
    this.messages = [];
    this.history = [];
    this.lastApiCall = 0;
    this.minApiInterval = 1000; // 1 second minimum interval between API calls
  }

  /**
   * Updates the state of the PromptCell.
   * @param {string} newState - The new state.
   * 
   * How it works:
   * 1. Sets the state property to the new state
   * 2. Logs the state change action
   * 
   * Usage example:
   * promptCell.setState('processing');
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * - js/components/prompt-manager.js (potentially)
   * 
   * Role in overall program logic:
   * Manages the current state of the PromptCell, which is crucial for tracking
   * the cell's status throughout its lifecycle and API interactions.
   */
  setState(newState) {
    this.state = newState;
    this.logAction('setState', { newState });
  }

  /**
   * Sets an error message.
   * @param {string} error - The error message.
   * 
   * How it works:
   * 1. Sets the error property to the provided error message
   * 2. Logs the error setting action
   * 
   * Usage example:
   * promptCell.setError('API request failed');
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * - js/components/error-handler.js (potentially)
   * 
   * Role in overall program logic:
   * Manages error states for the PromptCell, allowing for proper error handling
   * and display throughout the application.
   */
  setError(error) {
    this.error = error;
    this.logAction('setError', { error });
  }

  /**
   * Adds a message to the messages array.
   * @param {object} message - The message object.
   * 
   * How it works:
   * 1. Pushes the new message object to the messages array
   * 2. Logs the message addition action
   * 
   * Usage example:
   * promptCell.addMessage({ role: 'user', content: 'Hello, AI!' });
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * - js/components/chat-interface.js (potentially)
   * 
   * Role in overall program logic:
   * Maintains the conversation history within the PromptCell, which is crucial
   * for context-aware API interactions and displaying the chat history.
   */
  addMessage(message) {
    this.messages.push(message);
    this.logAction('addMessage', { message });
  }

  /**
   * Retrieves all messages.
   * @returns {Array} The messages array.
   * 
   * How it works:
   * Simply returns the messages array containing all conversation history
   * 
   * Usage example:
   * const allMessages = promptCell.getMessages();
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * - js/components/chat-display.js (potentially)
   * 
   * Role in overall program logic:
   * Provides access to the full conversation history, which is used for
   * displaying chat logs and maintaining context in API interactions.
   */
  getMessages() {
    return this.messages;
  }

  /**
   * Retrieves the current prompt.
   * @returns {string} The prompt text.
   * 
   * How it works:
   * Simply returns the current prompt text stored in the prompt property
   * 
   * Usage example:
   * const currentPrompt = promptCell.getPrompt();
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * - js/components/prompt-editor.js (potentially)
   * 
   * Role in overall program logic:
   * Allows access to the current prompt text, which is used for displaying
   * and potentially editing the prompt in the user interface.
   */
  getPrompt() {
    return this.prompt;
  }

  /**
   * Updates the prompt text.
   * @param {string} newPrompt - The new prompt text.
   * 
   * How it works:
   * 1. Stores the old prompt
   * 2. Updates the prompt property with the new prompt text
   * 3. Logs the prompt update action
   * 
   * Usage example:
   * promptCell.updatePrompt('New improved prompt text');
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * - js/components/prompt-editor.js (potentially)
   * 
   * Role in overall program logic:
   * Allows for dynamic updating of the prompt text, which is crucial for
   * iterative prompt engineering and user-driven prompt modifications.
   */
  updatePrompt(newPrompt) {
    const oldPrompt = this.prompt;
    this.prompt = newPrompt;
    this.logAction('updatePrompt', { oldPrompt, newPrompt });
  }

  /**
   * Returns a string representation of the PromptCell.
   * @returns {string} The string representation.
   * 
   * How it works:
   * Constructs a string containing a truncated version of the prompt and the current state
   * 
   * Usage example:
   * console.log(promptCell.toString());
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * - js/components/debug-console.js (potentially)
   * 
   * Role in overall program logic:
   * Provides a concise representation of the PromptCell for debugging and logging purposes.
   */
  toString() {
    return `PromptCell: "${this.prompt.substring(0, 30)}..." (${this.state})`;
  }

  /**
   * Handles rate limit errors by either waiting or switching models.
   * @param {Error} error - The error object.
   * @param {string} model - The current model.
   * @returns {object} Object indicating whether to retry and with which model.
   * @throws Will throw an error if rate limit is unhandled.
   * 
   * How it works:
   * 1. Logs a warning about the rate limit
   * 2. Attempts to extract a wait time from the error message
   * 3. If a wait time is found, it waits and then suggests retrying
   * 4. If no wait time is found, it attempts to switch to an alternative model
   * 5. If no alternative model is available, it throws the original error
   * 
   * Usage example:
   * try {
   *   const result = await promptCell.handleRateLimit(error, 'gpt-3.5-turbo');
   *   if (result.retry) {
   *     // Retry the API call with result.model
   *   }
   * } catch (e) {
   *   console.error('Rate limit could not be handled:', e);
   * }
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * - js/api/api-manager.js (potentially)
   * 
   * Role in overall program logic:
   * Crucial for graceful handling of API rate limits, ensuring smooth user experience
   * by either waiting or switching models when limits are reached.
   */
  async handleRateLimit(error, model) {
    console.warn(`Rate limit reached for model ${model}. Attempting to recover...`);
    this.logAction('handleRateLimit', { model, error: error.message });

    const waitTime = this.extractWaitTime(error.message);
    if (waitTime) {
      console.log(`Waiting for ${waitTime}ms before retrying...`);
      await this.delay(waitTime);
      this.logAction('waitForRateLimit', { waitTime });
      return { retry: true, model };
    }

    const alternativeModel = selectAlternativeModel(model);
    if (alternativeModel && alternativeModel !== model) {
      console.log(`Switching to alternative model: ${alternativeModel}`);
      this.metadata.model = alternativeModel;
      this.logAction('switchModel', { oldModel: model, newModel: alternativeModel });
      return { retry: true, model: alternativeModel };
    }

    this.logAction('rateLimitUnhandled', { error: error.message });
    throw error;
  }

  /**
   * Extracts wait time from error message.
   * @param {string} errorMessage - The error message.
   * @returns {number|null} The wait time in milliseconds or null.
   * 
   * How it works:
   * 1. Uses a regular expression to find a wait time in seconds in the error message
   * 2. If found, converts the time to milliseconds and rounds up to the nearest integer
   * 3. If not found, returns null
   * 
   * Usage example:
   * const waitTime = promptCell.extractWaitTime('Please try again in 3.5s');
   * // waitTime will be 3500
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * 
   * Role in overall program logic:
   * Supports the rate limit handling by parsing error messages to determine
   * appropriate wait times before retrying API calls.
   */
  extractWaitTime(errorMessage) {
    const match = errorMessage.match(/Please try again in (\d+(\.\d+)?)s/);
    return match ? Math.ceil(parseFloat(match[1]) * 1000) : null;
  }

  /**
   * Logs an action with details.
   * @param {string} action - The action name.
   * @param {object} details - Additional details about the action.
   * 
   * How it works:
   * Pushes a new object to the history array containing:
   * 1. The action name
   * 2. A timestamp of when the action occurred
   * 3. Any additional details provided
   * 
   * Usage example:
   * promptCell.logAction('userInput', { input: 'Hello, AI!' });
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * 
   * Role in overall program logic:
   * Maintains a detailed log of all actions performed on the PromptCell,
   * which is crucial for debugging, auditing, and potentially implementing
   * undo/redo functionality.
   */
  logAction(action, details) {
    this.history.push({
      action,
      timestamp: Date.now(),
      details
    });
  }

  /**
   * Retrieves the action history.
   * @returns {Array} The history array.
   * 
   * How it works:
   * Simply returns the entire history array containing all logged actions
   * 
   * Usage example:
   * const actionHistory = promptCell.getHistory();
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * - js/components/history-viewer.js (potentially)
   * 
   * Role in overall program logic:
   * Provides access to the full action history of the PromptCell, which can be
   * used for debugging, creating audit trails, or implementing advanced features
   * like action replay or undo/redo functionality.
   */
  getHistory() {
    return this.history;
  }

  /**
   * Callback for partial responses.
   * @param {object} partialResponse - The partial response data.
   * 
   * How it works:
   * Logs the partial response to the console, including the cell ID if available
   * 
   * Usage example:
   * // This would typically be called internally by the API processing function
   * await promptCell.updateCallback({ text: 'Partial response...' });
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * - js/api/api-manager.js (potentially, as a callback)
   * 
   * Role in overall program logic:
   * Handles streaming responses from the API, allowing for real-time updates
   * of the AI's response in the user interface.
   */
  async updateCallback(partialResponse) {
    console.log(`Partial response for cell ${this?.metadata?.id || 'unknown'}:`, partialResponse);
  }

  /**
   * Processes the prompt with the API.
   * @returns {string} The resulting response.
   * @throws Will throw an error if processing fails.
   * 
   * How it works:
   * 1. Checks if the specified model is valid and available
   * 2. Sets the state to 'processing' and waits for any rate limit
   * 3. Prepares the API input based on existing messages or the prompt
   * 4. Calls the API using queueApiRequest
   * 5. Updates the state, adds the response to messages, and logs the action
   * 6. Handles any errors that occur during processing
   * 
   * Usage example:
   * try {
   *   const response = await promptCell.processWithAPI();
   *   console.log('API Response:', response);
   * } catch (error) {
   *   console.error('API processing failed:', error);
   * }
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * - js/components/chat-interface.js (potentially)
   * 
   * Role in overall program logic:
   * Core function for interacting with the AI API, managing the entire process
   * of sending prompts, handling responses, and dealing with potential errors.
   */
  async processWithAPI(chunk = null) {
    if (!this.metadata.model || !isModelAvailable(this.metadata.model)) {
      throw new Error('Invalid or unavailable model specified for API processing');
    }

    try {
      this.setState('processing');
      await this.waitForRateLimit();

      const messages = this.getMessages();
      const apiInput = chunk ? [{ role: 'user', content: chunk }] : (messages.length > 0 ? messages.slice(-1) : [{ role: 'user', content: this.prompt }]);

      const result = await queueApiRequest(
        this.metadata.model,
        apiInput,
        this.metadata.temperature || 0.7,
        this.updateCallback.bind(this)
      );

      this.setState('idle');
      this.addMessage({ role: 'assistant', content: result });
      this.logAction('processWithAPI', { model: this.metadata.model, result });
      return result;
    } catch (error) {
      return await this.handleApiError(error);
    }
  }

  /**
   * Handles API errors by determining the appropriate response.
   * @param {Error} error - The error object.
   * @returns {string|object} The resulting response after handling the error.
   * @throws Will throw an error if it cannot handle the error.
   * 
   * How it works:
   * 1. Checks if the error is related to rate limiting and handles it if so
   * 2. Checks if the error is related to token limit exceeded and handles it if so
   * 3. If the error can't be handled, it sets the state to 'error', logs the error, and throws it
   * 
   * Usage example:
   * try {
   *   const result = await promptCell.handleApiError(error);
   *   if (typeof result === 'string') {
   *     console.log('Error handled, got response:', result);
   *   } else {
   *     console.log('Error handled, retry with:', result);
   *   }
   * } catch (e) {
   *   console.error('Unhandled API error:', e);
   * }
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * 
   * Role in overall program logic:
   * Crucial for graceful error handling in API interactions, attempting to recover
   * from common issues like rate limiting and token limit exceeded, and providing
   * clear error states when recovery is not possible.
   */
  async handleApiError(error) {
    if (error.message.includes('rate limit') || error.message.includes('Rate limit reached')) {
      const rateLimitResult = await this.handleRateLimit(error, this.metadata.model);
      if (rateLimitResult.retry) {
        this.metadata.model = rateLimitResult.model;
        return this.processWithAPI(); // Retry with new model or after waiting
      }
    }
    if (error.message.includes('Token limit exceeded')) {
      const tokenLimitResult = await handleTokenLimitExceeded(`processWithAPI:${this.metadata.model}`, this.getTokenCount());
      if (tokenLimitResult.status === 'use_larger_model') {
        this.metadata.model = tokenLimitResult.model;
        return this.processWithAPI(); // Retry with larger model
      } else if (tokenLimitResult.status === 'chunk_input') {
        return this.handleChunkedInput(tokenLimitResult.chunks);
      }
    }
    console.error(`Error processing cell ${this.metadata.id || 'unknown'} with API:`, error);
    this.setState('error');
    this.setError(error.message);
    this.logAction('processWithAPIFailed', { error: error.message });
    throw error;
  }

  /**
   * Handles chunked input by processing each chunk sequentially.
   * @param {Array} chunks - Array of input chunks.
   * @returns {string} The full concatenated response.
   * 
   * How it works:
   * 1. Initializes an empty string for the full response
   * 2. Iterates through each chunk in the provided array
   * 3. Processes each chunk using processWithAPI
   * 4. Concatenates the response from each chunk
   * 5. Returns the trimmed full response
   * 
   * Usage example:
   * const chunks = ['First part of the prompt', 'Second part of the prompt'];
   * const fullResponse = await promptCell.handleChunkedInput(chunks);
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * 
   * Role in overall program logic:
   * Allows processing of large inputs that exceed token limits by breaking them
   * into smaller chunks, processing each chunk separately, and combining the results.
   * This is crucial for handling long conversations or large documents.
   */
  async handleChunkedInput(chunks) {
    let fullResponse = '';
    for (const chunk of chunks) {
      const chunkResponse = await this.processWithAPI(chunk);
      fullResponse += `${chunkResponse} `;
    }
    return fullResponse.trim();
  }

  /**
   * Waits for the rate limit interval before making the next API call.
   * 
   * How it works:
   * 1. Calculates the time since the last API call
   * 2. If this time is less than the minimum interval, it waits for the remaining time
   * 3. Updates the lastApiCall timestamp
   * 
   * Usage example:
   * // This would typically be called internally before making an API call
   * await promptCell.waitForRateLimit();
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * 
   * Role in overall program logic:
   * Ensures that API calls are not made too frequently, preventing rate limit
   * errors and ensuring compliance with API usage guidelines.
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    if (timeSinceLastCall < this.minApiInterval) {
      await this.delay(this.minApiInterval - timeSinceLastCall);
    }
    this.lastApiCall = Date.now();
  }

  /**
   * Delays execution for a specified duration.
   * @param {number} ms - Milliseconds to delay.
   * 
   * How it works:
   * Returns a Promise that resolves after the specified number of milliseconds
   * 
   * Usage example:
   * await promptCell.delay(1000); // Waits for 1 second
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * 
   * Role in overall program logic:
   * Utility function used for implementing waiting periods, particularly useful
   * in rate limiting and error handling scenarios.
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Estimates the token count based on messages and prompt.
   * @returns {number} The estimated token count.
   * 
   * How it works:
   * 1. Combines all message contents and the current prompt into a single string
   * 2. Splits the string by whitespace to get a rough word count
   * 3. Returns this count as an estimate of the token count
   * 
   * Usage example:
   * const estimatedTokens = promptCell.getTokenCount();
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * 
   * Role in overall program logic:
   * Provides a rough estimate of token usage, which is crucial for managing
   * API requests within token limits and for implementing token-based features.
   * Note: This is a simplistic approach and could be improved with a proper tokenizer.
   */
  getTokenCount() {
    // Implement a more accurate token estimation using a tokenizer library if available.
    const text = this.messages.map(m => m.content).join(' ') + ' ' + this.prompt;
    return text.split(/\s+/).length;
  }

  /**
   * Checks if the token count is within the model's context window.
   * @returns {boolean} True if within limits, false otherwise.
   * 
   * How it works:
   * 1. Gets the current token count
   * 2. Retrieves the context window size for the current model
   * 3. Compares the token count to the context window
   * 4. Logs a warning and returns false if the limit is exceeded
   * 
   * Usage example:
   * if (!promptCell.checkTokenLimit()) {
   *   console.log('Token limit exceeded, need to chunk input');
   * }
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * - js/components/prompt-validator.js (potentially)
   * 
   * Role in overall program logic:
   * Ensures that the current conversation or prompt doesn't exceed the model's
   * token limit, which is crucial for preventing API errors and managing
   * conversation length.
   */
  checkTokenLimit() {
    const tokenCount = this.getTokenCount();
    const modelInfo = getModelInfo(this.metadata.model);
    if (modelInfo && tokenCount > modelInfo.contextWindow) {
      console.warn(`Token count (${tokenCount}) exceeds model's context window (${modelInfo.contextWindow})`);
      this.logAction('tokenLimitExceeded', { tokenCount, limit: modelInfo.contextWindow });
      return false;
    }
    return true;
  }

  /**
   * Adapts based on context.
   * @param {object} context - The context data.
   * @returns {*} Adapted result.
   * 
   * How it works:
   * Calls the adapt method from the methods object with the provided context
   * 
   * Usage example:
   * const adaptedResult = promptCell.adapt({ userPreference: 'technical' });
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * - js/components/adaptive-interface.js (potentially)
   * 
   * Role in overall program logic:
   * Allows the PromptCell to adapt its behavior or output based on contextual
   * information, enabling more dynamic and responsive interactions.
   */
  adapt(context) {
    return this.methods.adapt(context);
  }

  /**
   * Resonates with connected cells.
   * @param {Array} connectedCells - Array of connected cells.
   * @returns {*} Resonated result.
   * 
   * How it works:
   * 1. Maps the connected cells to an array of objects containing their prompts and metadata
   * 2. Calls the resonate method from the methods object with this data
   * 
   * Usage example:
   * const connectedCells = [cell1, cell2, cell3];
   * const resonatedResult = promptCell.resonate(connectedCells);
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * - js/components/cell-network.js (potentially)
   * 
   * Role in overall program logic:
   * Enables interaction between different PromptCells, allowing for more complex
   * and interconnected prompt structures and potentially collaborative AI interactions.
   */
  resonate(connectedCells) {
    const resonanceData = connectedCells.map(cell => ({
      prompt: cell.getPrompt(),
      metadata: cell.metadata
    }));
    return this.methods.resonate(resonanceData);
  }

  /**
   * Expands fractally.
   * @returns {*} Expanded result.
   * 
   * How it works:
   * Calls the fractalExpand method from the methods object
   * 
   * Usage example:
   * const expandedResult = promptCell.fractalExpand();
   * 
   * Files that use this function:
   * - js/api/prompt-cell.js (internal use)
   * - js/components/fractal-explorer.js (potentially)
   * 
   * Role in overall program logic:
   * Allows for complex expansion of the prompt or its results, potentially
   * creating nested or recursive structures. This could be used for generating
   * detailed outlines, exploring ideas in depth, or creating hierarchical content.
   */
  fractalExpand() {
    return this.methods.fractalExpand();
  }
}
