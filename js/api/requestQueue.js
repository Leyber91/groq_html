// requestQueue.js
import { logger } from '../utils/logger.js';
/**
 * Manages the API request queue with prioritization.
 */
export class RequestQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }
  /**
   * Inserts a request into the queue based on priority.
   * @param {Object} request - The request object.
   */
  insertRequest(request) {
    if (request.priority === 'high') {
      this.queue.unshift(request);
    } else if (request.priority === 'low') {
      this.queue.push(request);
    } else {
      // Normal priority
      const normalIndex = this.queue.findIndex(item => item.priority === 'low');
      if (normalIndex === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(normalIndex, 0, request);
      }
    }
    logger.debug(`Inserted request into queue: ${JSON.stringify(request)}`);
  }
  /**
   * Retrieves the next batch of requests.
   * @param {number} batchSize - Number of requests to retrieve.
   * @returns {Array<Object>} - The batch of requests.
   */
  getBatch(batchSize) {
    return this.queue.splice(0, batchSize);
  }
  /**
   * Checks if the queue is empty.
   * @returns {boolean} - True if empty, else false.
   */
  isEmpty() {
    return this.queue.length === 0;
  }
  /**
   * Sets the processing state.
   * @param {boolean} state - Processing state.
   */
  setProcessingState(state) {
    this.isProcessing = state;
  }
  /**
   * Gets the current processing state.
   * @returns {boolean} - Processing state.
   */
  getProcessingState() {
    return this.isProcessing;
  }
}
