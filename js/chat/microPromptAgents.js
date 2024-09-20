import { getSystemContext } from '../utils/systemContext.js';
import { getModelInfo } from '../config/model-config.js';

export class MicroPromptAgent {
  /**
   * Constructor for the MicroPromptAgent class.
   * 
   * @param {number} layerIndex - The index of the layer this agent belongs to.
   * @param {number} agentIndex - The index of this agent within its layer.
   * @param {Object} diagramStructure - The structure of the diagram this agent is part of.
   * 
   * Usage example:
   * const agent = new MicroPromptAgent(0, 1, { layers: [...] });
   * 
   * This constructor is used in:
   * - js/chat/agentManager.js
   * - js/chat/layerManager.js
   * 
   * Role in program logic:
   * Initializes a new MicroPromptAgent with specific layer and agent indices,
   * setting up initial states for prompt and code history, prompt strategy,
   * and storing the diagram structure. This forms the foundation for the
   * agent's operations within the self-evolving code system.
   */
  constructor(layerIndex, agentIndex, diagramStructure) {
    this.layerIndex = layerIndex;
    this.agentIndex = agentIndex;
    this.promptHistory = [];
    this.codeHistory = [];
    this.promptStrategy = {
      clarity: 0.5,
      taskFocus: 0.5,
      innovationLevel: 0.5,
    };
    this.diagramStructure = diagramStructure;
  }

  /**
   * Adapts a base prompt based on various inputs to create a tailored prompt for the agent.
   * 
   * @param {string} basePrompt - The initial prompt to be adapted.
   * @param {string} task - The specific task to be addressed.
   * @param {Object} userNeeds - Object containing user requirements and preferences.
   * @param {Object} diagramStructure - The current structure of the system diagram.
   * @returns {string} The adapted prompt tailored for the current context.
   * 
   * Usage example:
   * const adaptedPrompt = agent.adaptPrompt("Base prompt", "Optimize performance", { complexity: "high" }, { layers: [...] });
   * 
   * This function is used in:
   * - js/chat/promptManager.js
   * - js/chat/agentInteraction.js
   * 
   * Role in program logic:
   * This function is crucial in tailoring the AI's behavior to the specific task,
   * user needs, and system context. It integrates information from various sources
   * to create a comprehensive prompt that guides the AI's response, ensuring
   * relevance and effectiveness in the self-evolving code system.
   */
  adaptPrompt(basePrompt, task, userNeeds, diagramStructure) {
    const systemContext = getSystemContext();
    const selectedModel = this.selectAppropriateModel(task, userNeeds);
    const modelInfo = getModelInfo(selectedModel) || {
      description: 'Unknown model',
      strengths: [],
      contextWindow: 'Unknown',
    };

    const adaptedPrompt = `${basePrompt}

Task: ${task}

User Needs: ${JSON.stringify(userNeeds, null, 2)}

Current Diagram Structure:
${JSON.stringify(diagramStructure, null, 2)}

Your role: You are Agent ${this.agentIndex + 1} in Layer ${
      this.layerIndex + 1
    } of a self-evolving code system. 
${this.defineAgentRole(userNeeds, diagramStructure)}

System Context: ${systemContext}

Model Capabilities: This prompt is optimized for ${modelInfo.description}. 
Strengths: ${modelInfo.strengths.join(', ')}
Context Window: ${modelInfo.contextWindow} tokens

Instructions:
1. Analyze the given task and user needs.
2. Consider the current diagram structure and your specific role within it.
3. Utilize Groq's API capabilities to fetch relevant models and data as needed.
4. Implement quantum-inspired reasoning to generate innovative solutions.
5. Generate insights and code snippets that contribute to the self-evolving nature of the system.
6. Focus on ${userNeeds.primaryObjective || 'the main objective'} while considering the system's complexity.
7. Adapt your response to a ${
      userNeeds.domainKnowledge || 'general'
    } level of domain knowledge.
8. Address the ${userNeeds.urgency || 'given'} urgency and ${
      userNeeds.complexity || 'appropriate'
    } complexity of the task.
9. Incorporate the following self-improvement mechanisms in your code:
   a. Performance monitoring
   b. Automated testing
   c. Dynamic code generation
   d. Feedback loops for continuous enhancement
10. If improving existing code, reference and build upon the latest version:
   ${
     this.codeHistory.length > 0
       ? this.codeHistory[this.codeHistory.length - 1]
       : 'No existing code yet.'
   }
11. Leverage Groq's API for advanced functionalities such as multi-model integrations and rate limit management.

Additional Context: ${
      JSON.stringify(userNeeds.additionalContext) ||
      'No additional context provided'
    }

Provide your insights, code snippets, or pseudocode that demonstrate how you contribute to the self-evolving system. Ensure your response is clear, concise, and directly addresses the task and user needs.`;

    this.promptHistory.push(adaptedPrompt);
    return adaptedPrompt;
  }

  /**
   * Defines the specific role of the agent based on user needs and diagram structure.
   * 
   * @param {Object} userNeeds - Object containing user requirements and preferences.
   * @param {Object} diagramStructure - The current structure of the system diagram.
   * @returns {string} A description of the agent's specialized role.
   * 
   * Usage example:
   * const agentRole = agent.defineAgentRole({ complexity: "high" }, { layers: [...] });
   * 
   * This function is used in:
   * - js/chat/microPromptAgents.js (internally)
   * - js/chat/agentManager.js
   * 
   * Role in program logic:
   * This function dynamically determines the agent's specialized role within the
   * self-evolving code system. It analyzes user needs and the current system
   * structure to assign a specific focus or expertise to the agent, enhancing
   * the system's ability to address diverse and complex tasks effectively.
   */
  defineAgentRole(userNeeds, diagramStructure) {
    // Implement the logic to define the agent's role based on userNeeds and diagramStructure
    return 'You specialize in optimizing code performance and scalability.';
  }

  /**
   * Selects an appropriate AI model based on the given task and user needs.
   * 
   * @param {string} task - The specific task to be addressed.
   * @param {Object} userNeeds - Object containing user requirements and preferences.
   * @returns {string} The identifier of the selected AI model.
   * 
   * Usage example:
   * const modelId = agent.selectAppropriateModel("Optimize performance", { complexity: "high" });
   * 
   * This function is used in:
   * - js/chat/microPromptAgents.js (internally)
   * - js/chat/modelSelector.js
   * 
   * Role in program logic:
   * This function plays a crucial role in optimizing the system's performance
   * by selecting the most suitable AI model for a given task and user requirements.
   * It ensures that the system leverages the most appropriate AI capabilities
   * for each specific scenario, enhancing overall efficiency and effectiveness.
   */
  selectAppropriateModel(task, userNeeds) {
    // Implement logic to select the model based on the task and user needs
    return 'gpt-3.5-turbo';
  }
}