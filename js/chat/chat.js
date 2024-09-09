import { moaConfig } from '../config/config.js';
import { queueApiRequest, handleApiFailure } from '../api/api-core.js';
import { animateAgent, updateDiagram } from '../diagram/diagram.js';
import { addMessageToChat, updateMessageContent, formatContent } from './message-formatting.js';
import { estimateTokens } from '../api/model-info.js';
import { handleTokenLimitExceeded } from '../api/error-handling.js';
import { exponentialBackoff } from '../utils/backoff.js';
import { generateUniqueId } from '../utils/idGenerator.js';
import { openDatabase } from '../utils/database.js';
import { updateMetaLearningModel } from '../config/meta-learning.js';


export async function chatWithMOA(message) {
    const chatMessages = document.getElementById('chat-messages');
    const startTime = Date.now();
    if (!chatMessages) {
        console.error('Chat messages container not found');
        return;
    }
    
    const userMessageDiv = addMessageToChat('user', message, chatMessages);
    
    let context = message;
    let totalTokens = 0;
    const conversationId = generateUniqueId();

    for (let i = 0; i < moaConfig.layers.length; i++) {
        const layer = moaConfig.layers[i];
        const layerMessageDiv = addMessageToChat('layer', `Layer ${i + 1}: Initializing...`, chatMessages);

        for (const agent of layer) {
            updateMessageContent(layerMessageDiv, `Layer ${i + 1}: Processing with ${agent.model_name}...`);
            
            const estimatedTokens = estimateTokens([{ role: 'user', content: context }], agent.model_name);
            if (estimatedTokens > agent.token_limit) {
                const result = await handleTokenLimitExceeded(`Layer ${i + 1}:${agent.model_name}`);
                if (result.status === 'use_larger_model') {
                    agent.model_name = result.model;
                } else {
                    throw new Error(result.message);
                }
            }

            try {
                const response = await exponentialBackoff(async () => {
                    return await queueApiRequest(agent.model_name, [{ role: 'user', content: context }], agent.temperature, conversationId);
                }, {
                    maxRetries: moaConfig.error_handling.max_retries,
                    initialDelay: moaConfig.error_handling.retry_delay,
                    maxDelay: moaConfig.error_handling.exponential_backoff.max_delay
                });

                context = typeof response === 'object' ? JSON.stringify(response, null, 2) : response;
                totalTokens += estimatedTokens;

                updateMessageContent(layerMessageDiv, `Layer ${i + 1}: ${formatContent(context)}`);
                updateDiagram(i, agent.model_name, 'success');
            } catch (error) {
                console.error(`Error in Layer ${i + 1}:`, error);
                updateMessageContent(layerMessageDiv, `Layer ${i + 1}: Error: ${error.message}`);
                updateDiagram(i, agent.model_name, 'failure');
                
                const result = await handleApiFailure(`Layer ${i + 1}`);
                if (result.status !== 'success') {
                    if (moaConfig.error_handling.graceful_degradation.enabled) {
                        const fallbackModel = moaConfig.error_handling.graceful_degradation.fallback_chain[i] || moaConfig.error_handling.fallback_model;
                        updateMessageContent(layerMessageDiv, `Layer ${i + 1}: Falling back to ${fallbackModel}...`);
                        agent.model_name = fallbackModel;
                        i--; // Retry this layer with the fallback model
                    } else {
                        break;
                    }
                }
            }
        }
        await animateAgent(i);
    }

    addMessageToChat('assistant', formatContent(context), chatMessages);
    console.log(`Total tokens used: ${totalTokens}`);

    if (moaConfig.caching.enabled) {
        const cacheKey = generateUniqueId();
        const compressedContext = fflate.compressSync(new TextEncoder().encode(context));
        const cacheEntry = {
            id: cacheKey,
            context: compressedContext,
            totalTokens: totalTokens,
            timestamp: Date.now()
        };
    
        if (moaConfig.caching.persistent_storage.enabled) {
            const db = await openDatabase();
            const transaction = db.transaction(['responses'], 'readwrite');
            const store = transaction.objectStore('responses');
            await store.put(cacheEntry);
        } else {
            // In-memory LRU cache
            if (cache.size >= moaConfig.caching.max_cache_size) {
                const oldestKey = cache.keys().next().value;
                cache.delete(oldestKey);
            }
            cache.set(cacheKey, cacheEntry);
        }
    }

    if (moaConfig.meta_learning.enabled) {
        const metaLearningData = {
            input: message,
            output: context,
            totalTokens: totalTokens,
            processingTime: Date.now() - startTime
        };
        await updateMetaLearningModel(metaLearningData);
    }

    return { context, totalTokens };
}