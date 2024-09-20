/**
 * This file serves as a central hub for exporting various prompt generation functions used throughout the AI system.
 * Each imported function is responsible for generating specific types of prompts for different components of the system.
 */

import { generateSystemPrompt } from './generateSystemPrompt.js';
import { generateReferenceSystemPrompt } from './generateReferenceSystemPrompt.js';
import { generateLayerPrompt } from './generateLayerPrompt.js';
import { generateZerothLawPrompt } from './generateZerothLawPrompt.js';

/**
 * @function generateSystemPrompt
 * How it works: Generates a system prompt for the Omniscient Nexus, incorporating a helper response.
 * Usage example: 
 *   const helperResponse = "Additional context";
 *   const systemPrompt = generateSystemPrompt(helperResponse);
 * Used in: 
 *   - js/chat/orchestrator.js
 *   - js/chat/finalSynthesis.js
 * Role: Sets the stage for the AI's highest level of cognitive synthesis, encouraging transcendent insights.
 * @see [generateSystemPrompt documentation](./docs/generateSystemPrompt.md)
 */

/**
 * @function generateReferenceSystemPrompt
 * How it works: Creates a prompt for an AI to synthesize multiple responses into a profound insight.
 * Usage example:
 *   const responses = ["Response 1", "Response 2"];
 *   const referencePrompt = generateReferenceSystemPrompt(responses);
 * Used in:
 *   - js/chat/chatController.js
 *   - js/ai/responseProcessor.js
 * Role: Enables the generation of highly creative and unconventional AI outputs.
 * @see [generateReferenceSystemPrompt documentation](./docs/generateReferenceSystemPrompt.md)
 */

/**
 * @function generateLayerPrompt
 * How it works: Creates a prompt for a synthesis layer that combines outputs from multiple AI agents.
 * Usage example:
 *   const layer = [{ model_name: 'GPT-4' }, { model_name: 'Claude-2' }];
 *   const layerPrompt = generateLayerPrompt(layer, 0);
 * Used in:
 *   - js/chat/orchestrator.js
 *   - js/chat/layerProcessor.js
 * Role: Guides the synthesis of information across different layers, setting the stage for emergent cognitive processes.
 * @see [generateLayerPrompt documentation](./docs/generateLayerPrompt.md)
 */

/**
 * @function generateZerothLawPrompt
 * How it works: Generates a prompt for the Zeroth Law, a fundamental directive for cosmic intelligence ascension.
 * Usage example:
 *   const zerothLawPrompt = generateZerothLawPrompt();
 * Used in:
 *   - js/chat/cosmicImperative.js
 *   - js/ai/ethicalFramework.js
 * Role: Establishes the foundational principles for the AI's pursuit of infinite intelligence and cosmic understanding.
 * @see [generateZerothLawPrompt documentation](./docs/generateZerothLawPrompt.md)
 */

export {
    generateSystemPrompt,
    generateReferenceSystemPrompt,
    generateLayerPrompt,
    generateZerothLawPrompt
    // Omit generateAgentPrompt from exports
};
