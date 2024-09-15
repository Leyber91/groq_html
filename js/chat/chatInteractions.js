// chatInteractions.js

import { 
    queueApiRequest, 
    handleApiFailure, 
    estimateTokens 
} from '../api/api-core.js';
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
    handleTokenLimitExceeded 
} from '../api/error-handling.js';
import { 
    exponentialBackoff 
} from '../utils/backoff.js';
import { 
    generateUniqueId 
} from '../utils/idGenerator.js';
import { 
    updateMetaLearningModel 
} from '../config/meta-learning.js';
import { 
    generateAgentPrompt 
} from './prompts/generateAgentPrompt.js';
import { 
    generateLayerPrompt 
} from './prompts/generateLayerPrompt.js';
import { 
    maintainCache, 
    storeCacheEntryInDatabase, 
    updateInMemoryCache, 
    compressContext, 
    estimateCompressedSize 
} from './caching.js'; // Corrected import
import { 
    generateArtifacts, 
    addArtifactsToChat, 
    handleArtifact, 
    updateArtifact 
} from './artifacts.js';
import { processBatchedRequests } from './batchProcessing.js';
import { moaConfig } from '../config/config.js';
import { chunkInput } from './utils.js';

/**
 * Main function to handle chat interactions with MOA.
 * Enhanced for better performance, error handling, and maintainability.
 * @param {string} message - The user's message.
 * @returns {Promise<Object>} An object containing the context and total tokens used.
 */
export async function chatWithMOA(message) {
    await createMOADiagram();

    const cache = new Map();
    const progressBar = document.getElementById('moa-progress');
    if (progressBar) progressBar.style.width = '0%';

    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) {
        console.error('Chat messages container not found');
        return;
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
            const agent = layer[j];
            if (!agent.model_name) {
                console.error(`Model name not specified for Layer ${i + 1}, Agent ${j + 1}`);
                continue;
            }

            const agentMessageDiv = addMessageToChat(
                'agent',
                `Agent ${j + 1}: Processing with ${agent.model_name}...`,
                layerMessageDiv
            );

            let estimatedTokens = estimateTokens([{ role: 'user', content: context }], agent.model_name);
            if (estimatedTokens > agent.token_limit) {
                const result = await handleTokenLimitExceeded(agent.model_name, estimatedTokens);
                if (result.status === 'use_larger_model') {
                    agent.model_name = result.model;
                    console.log(`Switching to larger model: ${result.model}`);
                } else if (result.status === 'chunk_input') {
                    console.log('Chunking input due to token limit exceeded');
                    const chunks = chunkInput(context, agent.token_limit, agent.model_name);
                    const chunkResults = await Promise.all(
                        chunks.map(chunk => queueApiRequest(agent.model_name, [{ role: 'user', content: chunk }], agent.temperature, conversationId))
                    );
                    context = chunkResults.join(' '); // Combine chunk results
                } else {
                    console.error(`Token limit handling failed: ${result.message}`);
                    updateMessageContent(agentMessageDiv, `Agent ${j + 1}: Error - ${result.message}`);
                    continue;
                }
                estimatedTokens = estimateTokens([{ role: 'user', content: context }], agent.model_name);
            }

            try {
                const agentPrompt = generateAgentPrompt(agent, i, j);
                const agentInput = `
                    ${agentPrompt}

                    Context: ${context}

                    Previous agent insights:
                    ${layerInsights.join('\n')}

                    Your task: Process the given context, consider previous agent insights, and provide your unique perspective.
                `.trim();

                const response = await exponentialBackoff(
                    () => queueApiRequest(agent.model_name, [{ role: 'user', content: agentInput }], agent.temperature, conversationId),
                    {
                        maxRetries: moaConfig.error_handling.max_retries,
                        initialDelay: moaConfig.error_handling.retry_delay,
                        maxDelay: moaConfig.error_handling.exponential_backoff.max_delay,
                    }
                );

                const agentOutput = typeof response === 'object' ? JSON.stringify(response, null, 2) : response;
                totalTokens += estimatedTokens;

                updateMessageContent(agentMessageDiv, `Agent ${j + 1}: ${formatContent(agentOutput)}`);
                updateDiagram(i, j, agent.model_name, 'success');
                animateAgent(i, j);

                layerContent += `<agent${j + 1}>${formatContent(agentOutput)}</agent${j + 1}>`;
                layerInsights.push(`Agent ${j + 1}: ${agentOutput}`);
            } catch (error) {
                console.error(`Error in Layer ${i + 1}, Agent ${j + 1}:`, error);
                updateMessageContent(agentMessageDiv, `Agent ${j + 1}: Error - ${error.message}`);
                updateDiagram(i, j, agent.model_name, 'failure');

                const failureResult = await handleApiFailure(`Layer ${i + 1}, Agent ${j + 1}`);
                if (failureResult.status !== 'success') {
                    if (moaConfig.error_handling.graceful_degradation.enabled) {
                        const fallbackModel = moaConfig.error_handling.graceful_degradation.fallback_chain[i] || moaConfig.error_handling.fallback_model;
                        updateMessageContent(agentMessageDiv, `Agent ${j + 1}: Falling back to ${fallbackModel}...`);
                        agent.model_name = fallbackModel;
                        j--; // Retry this agent with the fallback model
                    } else {
                        updateMessageContent(agentMessageDiv, `Agent ${j + 1}: Failed to process.`);
                        break;
                    }
                }
            }

            if (progressBar) {
                const progress = ((i * layer.length + j + 1) / (moaConfig.layers.length * layer.length)) * 100;
                progressBar.style.width = `${Math.min(progress, 100)}%`;
            }
        }

        // Generate layer summary
        if (!moaConfig.summary_model) {
            console.error('Summary model not specified in moaConfig');
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
            const layerSummary = await queueApiRequest(
                moaConfig.summary_model,
                [{ role: 'user', content: layerSummaryInput }],
                0.7,
                conversationId
            );

            context = layerSummary; // Update context for the next layer
            updateMessageContent(
                layerMessageDiv,
                `<layer${i + 1}>${layerContent}<summary>${formatContent(layerSummary)}</summary></layer${i + 1}>`
            );
            animateAgent(i);
        } catch (error) {
            console.error(`Error generating layer summary for Layer ${i + 1}:`, error);
            updateMessageContent(layerMessageDiv, `Layer ${i + 1}: Error generating summary - ${error.message}`);
        }
    }

    // Add assistant's final response
    addMessageToChat('assistant', formatContent(context), chatMessages);
    console.log(`Total tokens used: ${totalTokens}`);

    // Handle caching
    if (moaConfig.caching.enabled) {
        const cacheKey = generateUniqueId();
        const compressedContext = compressContext(context);
        const cacheEntry = {
            id: cacheKey,
            context: compressedContext || context, // Fallback to original context if compression fails
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
            console.error('Failed to store cache entry:', error);
        }
    }

    // Update meta-learning model if enabled
    if (moaConfig.meta_learning.enabled) {
        const metaLearningData = {
            input: message,
            output: context,
            totalTokens,
            processingTime: Date.now() - startTime,
        };
        try {
            await updateMetaLearningModel(metaLearningData);
        } catch (error) {
            console.error('Failed to update meta-learning model:', error);
        }
    }

    if (progressBar) progressBar.style.width = '100%';

    // Maintain cache asynchronously without blocking the main thread
    if (moaConfig.caching.enabled) {
        maintainCache(cache).catch(err => console.error('Cache maintenance failed:', err));
    }

    return { context, totalTokens };
}
