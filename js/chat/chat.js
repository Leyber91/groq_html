import { moaConfig } from '../config/config.js';
import { queueApiRequest, handleApiFailure } from '../api/api-core.js';
import { animateAgent, updateDiagram } from '../diagram/diagram.js';
import { addMessageToChat, updateMessageContent, formatContent } from './message-formatting.js';
import { estimateTokens } from '../api/model-info.js';
import { handleTokenLimitExceeded } from '../api/error-handling.js';

export async function chatWithMOA(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) {
        console.error('Chat messages container not found');
        return;
    }
    
    const userMessageDiv = addMessageToChat('user', message, chatMessages);
    
    let context = message;
    let totalTokens = 0;

    for (let i = 0; i < moaConfig.layers.length; i++) {
        const layer = moaConfig.layers[i];
        const layerMessageDiv = addMessageToChat('layer', `Layer ${i + 1}: Initializing...`, chatMessages);

        try {
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

                const response = await queueApiRequest(agent.model_name, [{ role: 'user', content: context }], agent.temperature);
                context = typeof response === 'object' ? JSON.stringify(response, null, 2) : response;
                totalTokens += estimatedTokens;

                updateMessageContent(layerMessageDiv, `Layer ${i + 1}: ${formatContent(context)}`);
                updateDiagram(i, agent.model_name, 'success');
            }
            await animateAgent(i);
        } catch (error) {
            console.error(`Error in Layer ${i + 1}:`, error);
            updateMessageContent(layerMessageDiv, `Layer ${i + 1}: Error: ${error.message}`);
            updateDiagram(i, 'error', 'failure');
            
            const result = await handleApiFailure(`Layer ${i + 1}`);
            if (result.status !== 'success') {
                break;
            }
        }
    }

    addMessageToChat('assistant', formatContent(context), chatMessages);
    console.log(`Total tokens used: ${totalTokens}`);
}