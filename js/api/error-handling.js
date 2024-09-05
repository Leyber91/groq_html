import { API_ENDPOINT, API_KEY, rateLimits } from '../config/config.js';
import { availableModels, getModelInfo } from './model-info.js';
import { initializeTokenBuckets, refillTokenBuckets, tokenBuckets } from './rate-limiting.js';

function logError(error, context) {
    console.error(`Error in ${context}:`, error);
    // Add more sophisticated error logging
    if (typeof Sentry !== 'undefined') {
        Sentry.captureException(error, { extra: { context } });
    }
    // Log to local storage for debugging
    const errorLog = JSON.parse(localStorage.getItem('errorLog') || '[]');
    errorLog.push({ timestamp: new Date().toISOString(), context, error: error.message });
    localStorage.setItem('errorLog', JSON.stringify(errorLog.slice(-100))); // Keep last 100 errors
}

async function withErrorHandling(apiCall, context) {
    try {
        return await apiCall();
    } catch (error) {
        logError(error, context);
        
        // Check for specific error types and handle accordingly
        if (error.message.includes('Rate limit exceeded')) {
            // Implement rate limit handling logic
            await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for a minute
            refillTokenBuckets();
            return await apiCall(); // Retry the call
        } else if (error.message.includes('Token limit exceeded')) {
            // Implement token limit handling logic
            const model = context.split(':')[1]; // Assuming context is in format "operation:model"
            const bucket = tokenBuckets.get(model);
            if (bucket) {
                await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for a minute
                refillTokenBuckets();
                return await apiCall(); // Retry the call
            }
        } else if (error.message.includes('API request failed')) {
            // Implement API failure handling logic
            console.warn(`API request failed for ${context}. Retrying...`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
            return await apiCall(); // Retry the call
        }
        
        // If we can't handle the error, re-throw it
        throw error;
    }
}

export { logError, withErrorHandling };
