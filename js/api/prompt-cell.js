import { handleGracefulDegradation } from './error-handling.js';
import { selectAlternativeModel, queueApiRequest } from './api-core.js';
import { MODEL_INFO, getModelInfo, isModelAvailable, getModelRateLimits } from '../config/model-config.js';

export class PromptCell {
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

  setState(newState) {
    this.state = newState;
    this.logAction('setState', { newState });
  }

  setError(error) {
    this.error = error;
    this.logAction('setError', { error });
  }

  addMessage(message) {
    this.messages.push(message);
    this.logAction('addMessage', { message });
  }

  getMessages() {
    return this.messages;
  }

  getPrompt() {
    return this.prompt;
  }

  updatePrompt(newPrompt) {
    const oldPrompt = this.prompt;
    this.prompt = newPrompt;
    this.logAction('updatePrompt', { oldPrompt, newPrompt });
  }

  toString() {
    return `PromptCell: "${this.prompt.substring(0, 30)}..." (${this.state})`;
  }

  async handleRateLimit(error, model) {
    console.warn(`Rate limit reached for model ${model}. Attempting to recover...`);
    this.logAction('handleRateLimit', { model, error: error.message });
    
    const waitTime = this.extractWaitTime(error.message);
    if (waitTime) {
      console.log(`Waiting for ${waitTime}ms before retrying...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
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

  extractWaitTime(errorMessage) {
    const match = errorMessage.match(/Please try again in (\d+(\.\d+)?)s/);
    return match ? Math.ceil(parseFloat(match[1]) * 1000) : null;
  }

  logAction(action, details) {
    this.history.push({
      action,
      timestamp: Date.now(),
      details
    });
  }

  getHistory() {
    return this.history;
  }

  async updateCallback(partialResponse) {
    console.log(`Partial response for cell ${this?.metadata?.id || 'unknown'}:`, partialResponse);
  }

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

  async handleChunkedInput(chunks) {
    let fullResponse = '';
    for (const chunk of chunks) {
      const chunkResponse = await this.processWithAPI(chunk);
      fullResponse += chunkResponse + ' ';
    }
    return fullResponse.trim();
  }

  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    if (timeSinceLastCall < this.minApiInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minApiInterval - timeSinceLastCall));
    }
    this.lastApiCall = Date.now();
  }

  getTokenCount() {
    // This is a simple estimation. For more accurate results, use a proper tokenizer.
    const text = this.messages.map(m => m.content).join(' ') + ' ' + this.prompt;
    return text.split(/\s+/).length;
  }

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

  adapt(context) {
    return this.methods.adapt(context);
  }

  resonate(connectedCells) {
    const resonanceData = connectedCells.map(cell => ({
      prompt: cell.getPrompt(),
      metadata: cell.metadata
    }));
    return this.methods.resonate(resonanceData);
  }

  fractalExpand() {
    return this.methods.fractalExpand();
  }
}