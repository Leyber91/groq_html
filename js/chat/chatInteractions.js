// chatInteractions.js

import { 
    animateAgent, 
    createMOADiagram, 
    updateDiagram 
} from '../diagram/diagram.js';
import { 
    addMessageToChat, 
    updateMessageContent, 
    formatContent 
} from './message-formatting.js';
import { 
    generateUniqueId 
} from '../utils/idGenerator.js';
import { 
    generateLayerPrompt 
} from './prompts/generateLayerPrompt.js';
import { 
    maintainCache, 
    storeCacheEntryInDatabase, 
    updateInMemoryCache, 
    compressContext, 
} from './caching.js';
import { 
    generateArtifacts, 
    addArtifactsToChat, 
    handleArtifact, 
    updateArtifact 
} from './artifacts.js';
import { processBatchedRequests } from './batchProcessing.js';
import { moaConfig } from '../config/config.js';
import { chunkInput } from './utils.js';
import { MicroPromptAgent } from './microPromptAgents.js';
import { MetaPromptManager } from '../utils/metaPromptManager.js';
import { retryWithExponentialBackoff, executeWithRetryAndCircuitBreaker } from '../utils/retry.js';
import { createChatCompletion, createStreamingChatCompletion, isGroqInitialized, waitForGroqInitialization } from './groqIntegration.js';
import { getTokenCount, validateTokenCount, truncateToFit } from '../utils/tokenUtils.js';
import { scheduleRequest, getRateLimitStatus, resetRateLimits } from '../utils/rateLimiter.js';
import { logger } from '../utils/logger.js';
import { getSystemContext } from '../utils/systemContext.js';
import { GROQ_API_KEY } from '../config/api-key.js';

const metaPromptManager = new MetaPromptManager(moaConfig);

const MAX_FALLBACK_ATTEMPTS = 3;

/**
 * Main function to handle chat interactions with MOA.
 * Enhanced for better performance, error handling, and maintainability.
 * @param {string} message - The user's message.
 * @returns {Promise<Object>} An object containing the context and total tokens used.
 */
export async function chatWithMOA(message) {
    try {
        if (!GROQ_API_KEY) {
            throw new Error('API key is missing. Please check your configuration.');
        }

        logger.info('Starting chat interaction with MOA');
        await createMOADiagram();

        // Wait for Groq initialization
        try {
            await waitForGroqInitialization();
        } catch (error) {
            logger.error('Failed to initialize Groq:', error);
            throw new Error('Groq initialization failed. Please check if groq.min.js is loaded correctly and the API key is set.');
        }

        const systemContext = await getSystemContext();
        if (!systemContext) {
            throw new Error('Failed to retrieve system context');
        }

        const cache = new Map();
        const progressBar = document.getElementById('moa-progress');
        if (progressBar) progressBar.style.width = '0%';

        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) {
            logger.error('Chat messages container not found');
            throw new Error('Chat interface not properly initialized');
        }

        const startTime = Date.now();
        const userMessageDiv = addMessageToChat('user', message, chatMessages);

        let context = message;
        let totalTokens = 0;
        const conversationId = generateUniqueId();
        for (let i = 0; i < moaConfig.layers.length; i++) {
            const layer = moaConfig.layers[i];
            const layerMessageDiv = addMessageToChat(
                'layer',
                `<layer${i + 1}>Layer ${i + 1}: Initializing...</layer${i + 1}>`,
                chatMessages
            );

            let layerContent = '';
            let layerInsights = [];

            for (let j = 0; j < layer.length; j++) {
                let fallbackAttempts = 0;
                let success = false;

                while (!success && fallbackAttempts < MAX_FALLBACK_ATTEMPTS) {
                    const agentConfig = { ...layer[j] };
                    const model = agentConfig.model_name;

                    if (!model) {
                        logger.error(`Model name not specified for Layer ${i + 1}, Agent ${j + 1}`);
                        break;
                    }

                    console.log(`Using model: ${model} for Layer ${i + 1}, Agent ${j + 1}`);

                    const agentInput = `${systemContext}\n\nContext: ${context}\n\nPrevious agent insights:\n${layerInsights.join('\n')}\n\nYour task: Process the given context, consider previous agent insights, and provide your unique perspective.`;

                    const agentMessageDiv = addMessageToChat(
                        'agent',
                        `Agent ${j + 1}: Processing with ${model}...`,
                        layerMessageDiv
                    );

                    try {
                        const tokenCount = await getTokenCount([{ role: 'user', content: agentInput }], model);
                        if (tokenCount > 0) {
                            validateTokenCount(tokenCount, model);
                        } else {
                            logger.warn(`Unable to estimate token count for ${model}. Proceeding without validation.`);
                        }
                        await scheduleRequest(model, [{ role: 'user', content: agentInput }]);

                        const response = await createChatCompletion([{ role: 'user', content: agentInput }], { ...agentConfig, model });

                        if (!response) {
                            throw new Error('Empty response from createChatCompletion');
                        }

                        const agentOutput = typeof response === 'string' ? response : JSON.stringify(response, null, 2);
                        totalTokens += await getTokenCount([{ role: 'user', content: agentInput }, { role: 'assistant', content: agentOutput }], model);

                        updateMessageContent(agentMessageDiv, `Agent ${j + 1}: ${formatContent(agentOutput)}`);
                        updateDiagram(i, j, model, 'success');
                        animateAgent(i, j);

                        layerContent += `<agent${j + 1}>${formatContent(agentOutput)}</agent${j + 1}>`;
                        layerInsights.push(`Agent ${j + 1}: ${agentOutput}`);

                        success = true;
                    } catch (error) {
                        logger.error(`Error in Layer ${i + 1}, Agent ${j + 1}:`, error);
                        updateMessageContent(agentMessageDiv, `Agent ${j + 1}: Error - ${error.message}`);
                        updateDiagram(i, j, model, 'failure');

                        if (moaConfig.error_handling.graceful_degradation.enabled && fallbackAttempts < MAX_FALLBACK_ATTEMPTS - 1) {
                            fallbackAttempts++;
                            const fallbackModel = moaConfig.error_handling.graceful_degradation.fallback_chain[fallbackAttempts - 1] || moaConfig.error_handling.fallback_model;
                            logger.info(`Falling back to ${fallbackModel} for Layer ${i + 1}, Agent ${j + 1} (Attempt ${fallbackAttempts})`);
                            updateMessageContent(agentMessageDiv, `Agent ${j + 1}: Falling back to ${fallbackModel}...`);
                            agentConfig.model_name = fallbackModel;
                        } else {
                            updateMessageContent(agentMessageDiv, `Agent ${j + 1}: Failed to process after ${fallbackAttempts} attempts.`);
                            break;
                        }
                    }
                }
                if (!success) {
                    logger.error(`Failed to process Layer ${i + 1}, Agent ${j + 1} after ${MAX_FALLBACK_ATTEMPTS} attempts.`);
                }

                if (progressBar) {
                    const progress = ((i * layer.length + j + 1) / (moaConfig.layers.length * layer.length)) * 100;
                    progressBar.style.width = `${Math.min(progress, 100)}%`;
                }
            }

            // Generate layer summary
            if (!moaConfig.summary_model) {
                logger.error('Summary model not specified in moaConfig');
                continue;
            }

            const layerSummaryPrompt = generateLayerPrompt(layer, i);
            const layerSummaryInput = `
                ${layerSummaryPrompt}

                Context: ${context}

                Agent insights:
                ${layerInsights.join('\n')}

                Your task: Synthesize the agent insights and provide a comprehensive summary for this layer.
            `.trim();

            try {
                await scheduleRequest(moaConfig.summary_model, [{ role: 'user', content: layerSummaryInput }]);
                const layerSummary = await createChatCompletion([{ role: 'user', content: layerSummaryInput }], { model: moaConfig.summary_model, temperature: 0.7 });

                if (!layerSummary) {
                    throw new Error('Empty response from createChatCompletion for layer summary');
                }

                context = layerSummary;
                updateMessageContent(
                    layerMessageDiv,
                    `<layer${i + 1}>${layerContent}<summary>${formatContent(layerSummary)}</summary></layer${i + 1}>`
                );
                animateAgent(i);
            } catch (error) {
                logger.error(`Error generating layer summary for Layer ${i + 1}:`, error);
                updateMessageContent(layerMessageDiv, `Layer ${i + 1}: Error generating summary - ${error.message}`);
            }
        }
        // Add assistant's final response
        addMessageToChat('assistant', formatContent(context), chatMessages);
        logger.info(`Total tokens used: ${totalTokens}`);

        // Handle caching
        if (moaConfig.caching.enabled) {
            const cacheKey = generateUniqueId();
            const compressedContext = compressContext(context);
            const cacheEntry = {
                id: cacheKey,
                context: compressedContext || context,
                totalTokens,
                timestamp: Date.now(),
                lastAccessed: Date.now(),
                hitCount: 0,
                missCount: 0,
                compressed: !!compressedContext,
            };

            try {
                if (moaConfig.caching.persistent_storage.enabled) {
                    await storeCacheEntryInDatabase(cacheEntry);
                } else {
                    updateInMemoryCache(cache, cacheKey, cacheEntry);
                }
            } catch (error) {
                logger.error('Failed to store cache entry:', error);
            }
        }

        // Update meta-learning model if enabled
        if (moaConfig.meta_learning && moaConfig.meta_learning.enabled) {
            const metaLearningData = {
                input: message,
                output: context,
                totalTokens,
                processingTime: Date.now() - startTime,
            };
            try {
                await metaPromptManager.updateMetaLearningModel(metaLearningData);
            } catch (error) {
                logger.error('Failed to update meta-learning model:', error);
            }
        }
        if (progressBar) progressBar.style.width = '100%';

        // Maintain cache asynchronously without blocking the main thread
        if (moaConfig.caching.enabled) {
            maintainCache(cache).catch(err => logger.error('Cache maintenance failed:', err));
        }

        return { context: context, totalTokens: totalTokens };
    } catch (error) {
        logger.error('Error in chatWithMOA:', error);
        if (error.message.includes('API key is missing')) {
            return { context: "I'm sorry, there's an issue with the API configuration. Please contact support.", totalTokens: 0 };
        }
        return { context: "I'm sorry, I encountered an error. Please try again later.", totalTokens: 0 };
    }
}

async function makeOptimizedApiCall(metaAdvice, userInput) {
    try {
        const model = metaAdvice.recommendedModel || moaConfig.default_model;
        const options = {
            temperature: metaAdvice.temperature || 0.7,
            max_tokens: metaAdvice.maxTokens || 150
        };

        await scheduleRequest(model, [{ role: 'user', content: userInput }]);
        const response = await createChatCompletion([{ role: 'user', content: userInput }], { ...options, model });

        return response;
    } catch (error) {
        logger.error('Optimized API call failed:', error);
        throw error;
    }
}

// Export the function if it's used elsewhere
export { makeOptimizedApiCall };
