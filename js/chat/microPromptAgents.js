import { getSystemContext } from '../utils/systemContext.js';
import { getModelInfo } from '../config/model-config.js';

export class MicroPromptAgent {
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

  defineAgentRole(userNeeds, diagramStructure) {
    // Implement the logic to define the agent's role based on userNeeds and diagramStructure
    return 'You specialize in optimizing code performance and scalability.';
  }

  selectAppropriateModel(task, userNeeds) {
    // Implement logic to select the model based on the task and user needs
    return 'gpt-3.5-turbo';
  }
}