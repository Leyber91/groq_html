// Import Bottleneck from CDN
const bottleneckScript = document.createElement('script');
bottleneckScript.src = 'https://cdn.jsdelivr.net/npm/bottleneck@2/bottleneck.min.js';
document.head.appendChild(bottleneckScript);

// Wait for Bottleneck to load before configuring
bottleneckScript.onload = () => {
    // Configure Bottleneck
    const limiter = new Bottleneck({
        reservoir: 6000, // Total tokens per minute
        reservoirRefreshAmount: 6000,
        reservoirRefreshInterval: 60 * 1000, // Refresh every minute
        maxConcurrent: 5, // Adjust based on your needs
        minTime: 200, // Minimum time between requests
    });

    // Wrap your API request function with limiter and retry
    async function queueApiRequest(messages, options = {}) {
        return limiter.schedule(() => scheduleRequest(options.model, messages, options));
    }

    // Make queueApiRequest available globally
    window.queueApiRequest = queueApiRequest;
};

import { scheduleRequest } from '../utils/rateLimiter.js';

export { queueApiRequest };