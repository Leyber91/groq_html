// js/lib/groqAPI.js
import { API_ENDPOINT, API_KEY } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { withErrorHandling } from '../api/error-handling.js';
async function streamGroqAPI(model, messages, temperature, updateCallback) {
    try {
        const response = await fetch(`${API_ENDPOINT}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model, messages, temperature })
        });
        if (!response.ok) {
            throw new Error(`Groq API error: ${response.statusText}`);
        }
        const data = await response.json();
        updateCallback(data);
        return data.choices[0].message.content;
    } catch (error) {
        logger.error(`Error in streamGroqAPI: ${error.message}`);
        throw error;
    }
}
export const enhancedStreamGroqAPI = withErrorHandling(
    async (model, messages, temperature, updateCallback) => {
        if (!model) {
            throw new Error('Model parameter is missing or undefined in enhancedStreamGroqAPI');
        }
        return await streamGroqAPI(model, messages, temperature, updateCallback);
    },
    'enhancedStreamGroqAPI'
);