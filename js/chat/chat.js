import { moaConfig } from '../config/config.js';
import { queueApiRequest } from '../api/api-core.js';
import { animateAgent } from '../diagram/diagram.js';
import { addMessageToChat, updateMessageContent } from './message-formatting.js';

export async function chatWithMOA(message) {
    const chatMessages = document.getElementById('chat-messages');
    
    const userMessageDiv = addMessageToChat('user', message, chatMessages);
    
    let context = message;
    for (let i = 0; i < moaConfig.layers.length; i++) {
        const layer = moaConfig.layers[i];
        const layerMessageDiv = addMessageToChat('layer', `Layer ${i + 1}: Processing...`, chatMessages);

        try {
            for (const agent of layer) {
                const response = await queueApiRequest(agent.model_name, [{ role: 'user', content: context }], agent.temperature);
                context = response;
                updateMessageContent(layerMessageDiv, `Layer ${i + 1}: ${response}`);
            }
            animateAgent(i);
        } catch (error) {
            console.error('Error:', error);
            updateMessageContent(layerMessageDiv, `Layer ${i + 1}: Error: ${error.message}`);
        }
    }

    addMessageToChat('assistant', context, chatMessages);
}