import { moaConfig } from '../config/config.js';
import { queueApiRequest, handleApiFailure } from '../api/api-core.js';
import { animateAgent, createMOADiagram, updateDiagram } from '../diagram/diagram.js';
import { addMessageToChat, updateMessageContent, formatContent } from './message-formatting.js';
import { estimateTokens } from '../api/modelInfo/model-info.js';
import { handleTokenLimitExceeded } from '../api/error-handling.js';
import { exponentialBackoff } from '../utils/backoff.js';
import { generateUniqueId } from '../utils/idGenerator.js';
import { openDatabase } from '../utils/database.js';
import { updateMetaLearningModel } from '../config/meta-learning.js';
import { generateAgentPrompt } from './prompts/generateAgentPrompt.js';
import { generateLayerPrompt } from './prompts/generateLayerPrompt.js';


function chunkInput(input, maxTokens, modelName) {
    const chunks = [];
    let currentChunk = '';
    const sentences = input.split(/(?<=[.!?])\s+/);
    
    for (const sentence of sentences) {
        const potentialChunk = currentChunk + sentence;
        if (estimateTokens([{ role: 'user', content: potentialChunk }], modelName) > maxTokens) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            
            if (estimateTokens([{ role: 'user', content: sentence }], modelName) > maxTokens) {
                const words = sentence.split(' ');
                for (const word of words) {
                    const potentialWordChunk = currentChunk + word + ' ';
                    if (estimateTokens([{ role: 'user', content: potentialWordChunk }], modelName) > maxTokens) {
                        if (currentChunk) {
                            chunks.push(currentChunk.trim());
                        }
                        currentChunk = word + ' ';
                    } else {
                        currentChunk = potentialWordChunk;
                    }
                }
            } else {
                currentChunk = sentence + ' ';
            }
        } else {
            currentChunk = potentialChunk;
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
}

function compressContext(context) {
    try {
        const encoder = new TextEncoder();
        const compressedData = fflate.compressSync(encoder.encode(context));
        return compressedData;
    } catch (error) {
        console.error('Error compressing context:', error);
        return null;
    }
}

async function storeCacheEntryInDatabase(cacheEntry) {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(['responses'], 'readwrite');
        const store = transaction.objectStore('responses');
        await store.put(cacheEntry);
        await transaction.complete;
    } catch (error) {
        console.error('Error storing cache entry in database:', error);
        throw error;
    }
}

function updateInMemoryCache(cache, key, entry) {
    if (cache.size >= moaConfig.caching.max_cache_size) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
    }
    cache.set(key, entry);
    
    // Implement a more sophisticated caching strategy
    if (cache.size > moaConfig.caching.max_cache_size) {
        implementLRUEviction(cache);
    }
    
    prioritizeCacheEntries(cache);
}

function estimateCompressedSize(data) {
    const compressed = compressContext(data);
    return compressed ? compressed.byteLength : 0;
}

async function optimizeCacheStorage(cache) {
    const compressionThreshold = 1024; // 1KB
    const compressedEntries = new Map();

    for (const [key, entry] of cache.entries()) {
        if (typeof entry.content === 'string' && entry.content.length > compressionThreshold) {
            const compressedContent = compressContext(entry.content);
            if (compressedContent) {
                compressedEntries.set(key, { ...entry, content: compressedContent, compressed: true });
            }
        }
    }

    for (const [key, compressedEntry] of compressedEntries.entries()) {
        cache.set(key, compressedEntry);
        await storeCacheEntryInDatabase(compressedEntry);
    }
}

function implementLRUEviction(cache) {
    const lruKey = [...cache.keys()].reduce((a, b) => cache.get(a).lastAccessed < cache.get(b).lastAccessed ? a : b);
    cache.delete(lruKey);
}

function prioritizeCacheEntries(cache) {
    const priorityThreshold = 0.8; // 80% of max cache size
    const sortedEntries = [...cache.entries()].sort((a, b) => b[1].accessCount - a[1].accessCount);
    const priorityCount = Math.floor(cache.size * priorityThreshold);
    
    for (let i = 0; i < priorityCount; i++) {
        const [key, entry] = sortedEntries[i];
        cache.set(key, { ...entry, priority: true });
    }
}

async function maintainCache(cache) {
    await optimizeCacheStorage(cache);
    
    // Implement additional cache maintenance strategies
    removeStaleEntries(cache);
    updateCacheStatistics(cache);
    
    if (shouldRebalanceCache(cache)) {
        await rebalanceCache(cache);
    }
}

function removeStaleEntries(cache) {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
        if (now - entry.lastAccessed > moaConfig.caching.stale_threshold) {
            cache.delete(key);
        }
    }
}

function updateCacheStatistics(cache) {
    let hitCount = 0;
    let missCount = 0;
    
    for (const entry of cache.values()) {
        hitCount += entry.hitCount || 0;
        missCount += entry.missCount || 0;
    }
    
    const hitRatio = hitCount / (hitCount + missCount);
    console.log(`Cache hit ratio: ${hitRatio.toFixed(2)}`);
}

function shouldRebalanceCache(cache) {
    // Implement logic to determine if cache rebalancing is needed
    return cache.size > moaConfig.caching.rebalance_threshold;
}

async function rebalanceCache(cache) {
    // Implement cache rebalancing logic
    const partitionCount = 4; // Example: divide cache into 4 partitions
    const partitionSize = Math.ceil(cache.size / partitionCount);
    
    const partitions = new Array(partitionCount).fill().map(() => new Map());
    
    [...cache.entries()].forEach(([key, value], index) => {
        const partitionIndex = Math.floor(index / partitionSize);
        partitions[partitionIndex].set(key, value);
    });
    
    // Clear the original cache and repopulate with balanced partitions
    cache.clear();
    for (const partition of partitions) {
        for (const [key, value] of partition.entries()) {
            cache.set(key, value);
        }
    }
}

export async function chatWithMOA(message) {
    await createMOADiagram();
    
    const cache = new Map();
    const progressBar = document.getElementById('moa-progress');
    if (progressBar) progressBar.style.width = '0%';

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
        const layerMessageDiv = addMessageToChat('layer', `<layer${i + 1}>Layer ${i + 1}: Initializing...</layer${i + 1}>`, chatMessages);

        let layerContent = '';
        let layerInsights = [];

        for (let j = 0; j < layer.length; j++) {
            const agent = layer[j];
            if (!agent.model_name) {
                console.error(`Model name not specified for Layer ${i + 1}, Agent ${j + 1}`);
                continue;
            }
            const agentMessageDiv = addMessageToChat('agent', `Agent ${j + 1}: Processing with ${agent.model_name}...`, layerMessageDiv);
            
            const estimatedTokens = estimateTokens([{ role: 'user', content: context }], agent.model_name);
            if (estimatedTokens > agent.token_limit) {
                const result = await handleTokenLimitExceeded(agent.model_name, estimatedTokens);
                if (result.status === 'use_larger_model') {
                    agent.model_name = result.model;
                    console.log(`Switching to larger model: ${result.model}`);
                } else if (result.status === 'chunk_input') {
                    console.log('Chunking input due to token limit exceeded');
                    const chunks = chunkInput(context, agent.token_limit, agent.model_name);
                    let chunkResults = [];
                    for (const chunk of chunks) {
                        const chunkResponse = await queueApiRequest(agent.model_name, [{ role: 'user', content: chunk }], agent.temperature, conversationId);
                        chunkResults.push(chunkResponse);
                    }
                    context = chunkResults.join(' '); // Combine chunk results
                } else {
                    throw new Error(result.message);
                }
            }

            try {
                const agentPrompt = generateAgentPrompt(agent, i, j);
                const agentInput = `${agentPrompt}\n\nContext: ${context}\n\nPrevious agent insights: ${layerInsights.join('\n')}\n\nYour task: Process the given context, consider previous agent insights, and provide your unique perspective.`;

                const response = await exponentialBackoff(async () => {
                    return await queueApiRequest(agent.model_name, [{ role: 'user', content: agentInput }], agent.temperature, conversationId);
                }, {
                    maxRetries: moaConfig.error_handling.max_retries,
                    initialDelay: moaConfig.error_handling.retry_delay,
                    maxDelay: moaConfig.error_handling.exponential_backoff.max_delay
                });

                const agentOutput = typeof response === 'object' ? JSON.stringify(response, null, 2) : response;
                totalTokens += estimatedTokens;

                updateMessageContent(agentMessageDiv, `Agent ${j + 1}: ${formatContent(agentOutput)}`);
                updateDiagram(i, j, agent.model_name, 'success');
                animateAgent(i, j);
                
                layerContent += `<agent${j + 1}>${formatContent(agentOutput)}</agent${j + 1}>`;
                layerInsights.push(`Agent ${j + 1}: ${agentOutput}`);
            } catch (error) {
                console.error(`Error in Layer ${i + 1}, Agent ${j + 1}:`, error);
                updateMessageContent(agentMessageDiv, `<agent${j + 1}>Error: ${error.message}</agent${j + 1}>`);
                updateDiagram(i, j, agent.model_name, 'failure');
                
                const result = await handleApiFailure(`Layer ${i + 1}, Agent ${j + 1}`);
                if (result.status !== 'success') {
                    if (moaConfig.error_handling.graceful_degradation.enabled) {
                        const fallbackModel = moaConfig.error_handling.graceful_degradation.fallback_chain[i] || moaConfig.error_handling.fallback_model;
                        updateMessageContent(agentMessageDiv, `<agent${j + 1}>Falling back to ${fallbackModel}...</agent${j + 1}>`);
                        agent.model_name = fallbackModel;
                        j--; // Retry this agent with the fallback model
                    } else {
                        break;
                    }
                }
            }

            if (progressBar) {
                const progress = ((i * layer.length + j + 1) / (moaConfig.layers.length * layer.length)) * 100;
                progressBar.style.width = `${progress}%`;
            }
        }

        // Generate layer summary
        if (!moaConfig.summary_model) {
            console.error('Summary model not specified in moaConfig');
            continue;
        }
        const layerSummaryPrompt = generateLayerPrompt(layer, i);
        const layerSummaryInput = `${layerSummaryPrompt}\n\nContext: ${context}\n\nAgent insights:\n${layerInsights.join('\n')}\n\nYour task: Synthesize the agent insights and provide a comprehensive summary for this layer.`;

        const layerSummary = await queueApiRequest(moaConfig.summary_model, [{ role: 'user', content: layerSummaryInput }], 0.7, conversationId);

        context = layerSummary; // Update context for the next layer
        updateMessageContent(layerMessageDiv, `<layer${i + 1}>${layerContent}<summary>${formatContent(layerSummary)}</summary></layer${i + 1}>`);
        await animateAgent(i);
    }

    addMessageToChat('assistant', formatContent(context), chatMessages);
    console.log(`Total tokens used: ${totalTokens}`);

    if (moaConfig.caching.enabled) {
        const cacheKey = generateUniqueId();
        const compressedContext = compressContext(context);
        const cacheEntry = {
            id: cacheKey,
            context: compressedContext,
            totalTokens: totalTokens,
            timestamp: Date.now()
        };
    
        if (moaConfig.caching.persistent_storage.enabled) {
            await storeCacheEntryInDatabase(cacheEntry);
        } else {
            updateInMemoryCache(cache, cacheKey, cacheEntry);
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

    if (progressBar) progressBar.style.width = '100%';

    return { context, totalTokens };
}