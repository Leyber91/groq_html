/**
 * This file sets up rate limiting for API requests using the Bottleneck library.
 * It dynamically loads Bottleneck from a CDN and configures it to manage API request rates.
 */

// Import Bottleneck from CDN
const bottleneckScript = document.createElement('script');
bottleneckScript.src = 'https://cdn.jsdelivr.net/npm/bottleneck@2/bottleneck.min.js';
document.head.appendChild(bottleneckScript);

// Wait for Bottleneck to load before configuring
bottleneckScript.onload = () => {
    /**
     * Configures the Bottleneck limiter with specific rate limiting parameters.
     * 
     * How it works:
     * - Creates a new Bottleneck instance with defined rate limiting rules
     * - Sets up a reservoir of 6000 tokens that refreshes every minute
     * - Limits concurrent requests and sets a minimum time between requests
     * 
     * @type {Bottleneck}
     */
    const limiter = new Bottleneck({
        reservoir: 6000, // Total tokens per minute
        reservoirRefreshAmount: 6000,
        reservoirRefreshInterval: 60 * 1000, // Refresh every minute
        maxConcurrent: 5, // Adjust based on your needs
        minTime: 200, // Minimum time between requests
    });

    /**
     * Queues an API request using the configured Bottleneck limiter.
     * 
     * How it works:
     * - Wraps the scheduleRequest function with the Bottleneck limiter
     * - Ensures that API requests adhere to the configured rate limits
     * 
     * Usage example:
     * ```
     * const messages = [{ role: "user", content: "Hello, AI!" }];
     * const options = { model: "gpt-3.5-turbo" };
     * const response = await queueApiRequest(messages, options);
     * ```
     * 
     * @param {Array} messages - The messages to be sent in the API request
     * @param {Object} options - Additional options for the API request
     * @returns {Promise} A promise that resolves with the API response
     * 
     * Used in:
     * - js/chat/chatController.js
     * - js/ai/responseProcessor.js
     * 
     * Role in program logic:
     * This function is crucial for managing API request rates, preventing rate limit
     * errors, and ensuring smooth communication with the AI service provider.
     * 
     * @see [API Rate Limiting Documentation](./docs/apiRateLimiting.md)
     */
    async function queueApiRequest(messages, options = {}) {
        return limiter.schedule(() => scheduleRequest(options.model, messages, options));
    }

    // Make queueApiRequest available globally
    window.queueApiRequest = queueApiRequest;
};

import { scheduleRequest } from '../utils/rateLimiter.js';

export { queueApiRequest };