import { handleGracefulDegradation } from './error-handling.js';
import { selectAlternativeModel, queueApiRequest } from './api-core.js';
import { MODEL_INFO, getModelInfo, isModelAvailable, getModelRateLimits } from '../config/model-config.js';

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
   */
  setState(newState) {
    this.state = newState;
    this.logAction('setState', { newState });
  }

  /**
   * Sets an error message.
   * @param {string} error - The error message.
   */
  setError(error) {
    this.error = error;
    this.logAction('setError', { error });
  }

  /**
   * Adds a message to the messages array.
   * @param {object} message - The message object.
   */
  addMessage(message) {
    this.messages.push(message);
    this.logAction('addMessage', { message });
  }

  /**
   * Retrieves all messages.
   * @returns {Array} The messages array.
   */
  getMessages() {
    return this.messages;
  }

  /**
   * Retrieves the current prompt.
   * @returns {string} The prompt text.
   */
  getPrompt() {
    return this.prompt;
  }

  /**
   * Updates the prompt text.
   * @param {string} newPrompt - The new prompt text.
   */
  updatePrompt(newPrompt) {
    const oldPrompt = this.prompt;
    this.prompt = newPrompt;
    this.logAction('updatePrompt', { oldPrompt, newPrompt });
  }

  /**
   * Returns a string representation of the PromptCell.
   * @returns {string} The string representation.
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
   */
  extractWaitTime(errorMessage) {
    const match = errorMessage.match(/Please try again in (\d+(\.\d+)?)s/);
    return match ? Math.ceil(parseFloat(match[1]) * 1000) : null;
  }

  /**
   * Logs an action with details.
   * @param {string} action - The action name.
   * @param {object} details - Additional details about the action.
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
   */
  getHistory() {
    return this.history;
  }

  /**
   * Callback for partial responses.
   * @param {object} partialResponse - The partial response data.
   */
  async updateCallback(partialResponse) {
    console.log(`Partial response for cell ${this?.metadata?.id || 'unknown'}:`, partialResponse);
  }

  /**
   * Processes the prompt with the API.
   * @returns {string} The resulting response.
   * @throws Will throw an error if processing fails.
   */
  async processWithAPI() {
    if (!this.metadata.model || !isModelAvailable(this.metadata.model)) {
      throw new Error('Invalid or unavailable model specified for API processing');
    }

    try {
      this.setState('processing');
      await this.waitForRateLimit();

      const messages = this.getMessages();
      const apiInput = messages.length > 0 ? messages.slice(-1) : [{ role: 'user', content: this.prompt }];

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
   * @returns {string} The resulting response after handling the error.
   * @throws Will throw an error if it cannot handle the error.
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
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Estimates the token count based on messages and prompt.
   * @returns {number} The estimated token count.
   */
  getTokenCount() {
    // This is a simple estimation. For more accurate results, use a proper tokenizer.
    const text = this.messages.map(m => m.content).join(' ') + ' ' + this.prompt;
    return text.split(/\s+/).length;
  }

  /**
   * Checks if the token count is within the model's context window.
   * @returns {boolean} True if within limits, false otherwise.
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
   */
  adapt(context) {
    return this.methods.adapt(context);
  }

  /**
   * Resonates with connected cells.
   * @param {Array} connectedCells - Array of connected cells.
   * @returns {*} Resonated result.
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
   */
  fractalExpand() {
    return this.methods.fractalExpand();
  }
}