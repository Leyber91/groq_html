import { moaConfig, updateMOAConfig as configUpdateMOAConfig } from '../config/config.js';
import { createMOADiagram } from './diagram.js';
import { nodeMap } from './nodeMap.js';
import {
  AGENT_FILL_COLOR,
  AGENT_HIGHLIGHT_FILL_COLOR,
  MAIN_MODEL_FILL_COLOR,
  MAIN_MODEL_HIGHLIGHT_FILL_COLOR,
  NODE_ANIMATION_DURATION,
  LINK_ANIMATION_DURATION,
  LINK_STROKE_COLOR,
  LINK_HIGHLIGHT_STROKE_COLOR,
} from './stylesConstants.js';
import { calculateConnectionStrength } from './helpers.js';

/**
 * Adds a new layer to the MOA configuration.
 * 
 * This function adds a new layer with a default agent to the MOA configuration
 * and triggers a diagram update.
 * 
 * Usage example:
 * addLayer();
 * 
 * Other files that use this function:
 * - js/components/LayerControls.js
 * - js/modules/configurationManager.js
 * 
 * Role in overall program logic:
 * This function allows for dynamic expansion of the MOA structure, enabling
 * users to add new layers of processing to the architecture.
 */
export function addLayer() {
  if (moaConfig && Array.isArray(moaConfig.layers)) {
    moaConfig.layers.push([{ model_name: 'llama3-8b-8192', temperature: 0.5 }]);
    createMOADiagram();
  } else {
    console.error('moaConfig is not properly defined');
  }
}

/**
 * Adds a new agent to a specific layer in the MOA configuration.
 * 
 * This function adds a new agent with default settings to a specified layer
 * and triggers a diagram update.
 * 
 * @param {number} layerIndex - The index of the layer to add the agent to.
 * 
 * Usage example:
 * addAgent(2);
 * 
 * Other files that use this function:
 * - js/components/LayerControls.js
 * - js/modules/configurationManager.js
 * 
 * Role in overall program logic:
 * This function allows for fine-grained control over the MOA structure,
 * enabling users to add new processing units (agents) to specific layers.
 */
export function addAgent(layerIndex) {
  if (moaConfig && Array.isArray(moaConfig.layers) && moaConfig.layers[layerIndex]) {
    moaConfig.layers[layerIndex].push({
      model_name: 'llama3-8b-8192',
      temperature: 0.5,
    });
    createMOADiagram();
  } else {
    console.error('Invalid layer index or moaConfig is not properly defined');
  }
}

/**
 * Removes a layer from the MOA configuration.
 * 
 * This function removes a specified layer from the MOA configuration,
 * ensuring that at least one layer remains, and triggers a diagram update.
 * 
 * @param {number} layerIndex - The index of the layer to remove.
 * 
 * Usage example:
 * removeLayer(1);
 * 
 * Other files that use this function:
 * - js/components/LayerControls.js
 * - js/modules/configurationManager.js
 * 
 * Role in overall program logic:
 * This function allows for the simplification of the MOA structure by
 * removing unnecessary layers, while maintaining the integrity of the architecture.
 */
export function removeLayer(layerIndex) {
  if (moaConfig.layers.length > 1) {
    moaConfig.layers.splice(layerIndex, 1);
    createMOADiagram();
  } else {
    console.warn('Cannot remove the last layer.');
  }
}

/**
 * Removes an agent from a specific layer in the MOA configuration.
 * 
 * This function removes a specified agent from a layer, ensuring that
 * at least one agent remains in the layer, and triggers a diagram update.
 * 
 * @param {number} layerIndex - The index of the layer containing the agent.
 * @param {number} agentIndex - The index of the agent to remove.
 * 
 * Usage example:
 * removeAgent(2, 1);
 * 
 * Other files that use this function:
 * - js/components/LayerControls.js
 * - js/modules/configurationManager.js
 * 
 * Role in overall program logic:
 * This function allows for fine-tuning of the MOA structure by removing
 * specific agents from layers, providing flexibility in architecture design.
 */
export function removeAgent(layerIndex, agentIndex) {
  if (moaConfig.layers[layerIndex] && moaConfig.layers[layerIndex].length > 1) {
    moaConfig.layers[layerIndex].splice(agentIndex, 1);
    createMOADiagram();
  } else {
    console.warn('Cannot remove the last agent in a layer.');
  }
}

/**
 * Updates the MOA configuration based on the current diagram state.
 * 
 * This function collects the current state of all nodes in the diagram
 * and updates the MOA configuration accordingly.
 * 
 * Usage example:
 * updateMOAConfig();
 * 
 * Other files that use this function:
 * - js/components/ConfigPanel.js
 * - js/modules/diagramUpdater.js
 * 
 * Role in overall program logic:
 * This function is crucial for maintaining synchronization between the
 * visual representation of the MOA and its underlying configuration data.
 */
export function updateMOAConfig() {
  const svg = d3.select('#moa-diagram svg');
  const newConfig = {
    layers: [],
    main_model: moaConfig.main_model,
    main_temperature: moaConfig.main_temperature,
  };

  svg.selectAll('.node').each(function (d) {
    const node = d3.select(this);
    const modelSelect = node.select('.agent-model');
    const tempInput = node.select('.agent-temperature');

    if (d.id !== 'main_model') {
      const [layer, agent] = d.id
        .split('_')
        .map((part) => parseInt(part.replace(/\D/g, '')));
      if (!newConfig.layers[layer]) {
        newConfig.layers[layer] = [];
      }
      newConfig.layers[layer][agent] = {
        model_name: modelSelect.property('value'),
        temperature: parseFloat(tempInput.property('value')),
      };
    } else {
      newConfig.main_model = modelSelect.property('value');
      newConfig.main_temperature = parseFloat(tempInput.property('value'));
    }
  });

  configUpdateMOAConfig(newConfig);
  createMOADiagram();
}

/**
 * Animates an agent in the diagram to indicate activity.
 * 
 * This function applies a visual animation to agents in a specific layer,
 * as well as the main model if it's the last layer.
 * 
 * @param {number} index - The index of the layer to animate.
 * 
 * Usage example:
 * animateAgent(1);
 * 
 * Other files that use this function:
 * - js/components/DiagramAnimator.js
 * - js/modules/processingSimulator.js
 * 
 * Role in overall program logic:
 * This function enhances the visual feedback of the MOA diagram,
 * helping users understand the flow of processing through the architecture.
 */
export function animateAgent(index) {
  const svg = d3.select('#moa-diagram svg');
  const nodes = svg.selectAll('.node');
  const links = svg.selectAll('line');

  nodes
    .filter((d) => d.layer === index)
    .select('circle')
    .transition()
    .duration(NODE_ANIMATION_DURATION)
    .attr('fill', AGENT_HIGHLIGHT_FILL_COLOR)
    .transition()
    .duration(NODE_ANIMATION_DURATION)
    .attr('fill', AGENT_FILL_COLOR);

  links
    .filter((d) => {
      const sourceNode = nodes.data().find((n) => n.id === d.source.id);
      return sourceNode && sourceNode.layer === index;
    })
    .transition()
    .duration(LINK_ANIMATION_DURATION)
    .attr('stroke', LINK_HIGHLIGHT_STROKE_COLOR)
    .attr('stroke-width', 4)
    .transition()
    .duration(LINK_ANIMATION_DURATION)
    .attr('stroke', LINK_STROKE_COLOR)
    .attr('stroke-width', 2);

  if (index === moaConfig.layers.length - 1) {
    nodes
      .filter((d) => d.id === 'main_model')
      .select('circle')
      .transition()
      .duration(NODE_ANIMATION_DURATION)
      .attr('fill', MAIN_MODEL_HIGHLIGHT_FILL_COLOR)
      .transition()
      .duration(NODE_ANIMATION_DURATION)
      .attr('fill', MAIN_MODEL_FILL_COLOR);
  }
}

/**
 * Updates a specific agent in the diagram.
 * 
 * This function updates the visual representation and data of a specific agent,
 * including its model and status.
 * 
 * @param {number} layerIndex - The index of the layer containing the agent.
 * @param {number} agentIndex - The index of the agent to update.
 * @param {string} modelName - The new model name for the agent.
 * @param {string} status - The new status of the agent ('success' or 'failure').
 * 
 * Usage example:
 * updateDiagram(2, 1, 'new-model-name', 'success');
 * 
 * Other files that use this function:
 * - js/components/AgentUpdater.js
 * - js/modules/simulationController.js
 * 
 * Role in overall program logic:
 * This function is essential for reflecting real-time changes in the MOA,
 * such as model updates or processing status changes, in the diagram.
 */
export function updateDiagram(layerIndex, agentIndex, modelName, status) {
  if (layerIndex === undefined || agentIndex === undefined) {
    console.error(
      `Invalid layer or agent index: Layer ${layerIndex}, Agent ${agentIndex}`
    );
    return;
  }

  const nodeId = `layer${layerIndex}_agent${agentIndex}`;
  const svg = d3.select('#moa-diagram svg');
  const agentNode = svg.select(`.node[data-id="${nodeId}"]`);

  if (agentNode.empty()) {
    console.warn(
      `Node not found for Layer ${layerIndex}, Agent ${agentIndex}. Recreating diagram...`
    );
    createMOADiagram();
    return;
  }

  agentNode.select('.agent-model').property('value', modelName);

  agentNode
    .select('circle')
    .transition()
    .duration(NODE_ANIMATION_DURATION)
    .attr('fill', status === 'success' ? '#4CAF50' : '#FF5252')
    .transition()
    .duration(NODE_ANIMATION_DURATION)
    .attr('fill', AGENT_FILL_COLOR);

  agentNode.select('text').text(`A${agentIndex}`);

  if (nodeMap.has(nodeId)) {
    const updatedNode = nodeMap.get(nodeId);
    updatedNode.model_name = modelName;
    nodeMap.set(nodeId, updatedNode);
  }

  updateNodeConnections(layerIndex, agentIndex);
}

/**
 * Updates the connections for a specific node in the diagram.
 * 
 * This function recalculates and updates the visual representation of
 * connections for a given node based on the current configuration.
 * 
 * @param {number} layerIndex - The index of the layer containing the node.
 * @param {number} agentIndex - The index of the agent (node) to update connections for.
 * 
 * Usage example:
 * updateNodeConnections(1, 2);
 * 
 * Other files that use this function:
 * - This function is private and used internally by updateDiagram
 * 
 * Role in overall program logic:
 * This function ensures that the visual representation of connections
 * between nodes accurately reflects the current state of the MOA configuration.
 */
function updateNodeConnections(layerIndex, agentIndex) {
  const svg = d3.select('#moa-diagram svg');
  const links = svg.selectAll('.links line');

  links.each(function (d) {
    const link = d3.select(this);
    const sourceId = d.source.id || d.source;
    const targetId = d.target.id || d.target;

    if (
      sourceId === `layer${layerIndex}_agent${agentIndex}` ||
      targetId === `layer${layerIndex}_agent${agentIndex}`
    ) {
      const sourceNode = nodeMap.get(sourceId);
      const targetNode = nodeMap.get(targetId);

      if (!sourceNode || !targetNode) {
        console.warn(`Node not found for source ${sourceId} or target ${targetId}`);
        return;
      }

      const weight = calculateConnectionStrength(sourceNode, targetNode);
      link
        .transition()
        .duration(LINK_ANIMATION_DURATION)
        .attr('stroke-width', Math.sqrt(weight))
        .attr('stroke', LINK_STROKE_COLOR);
    }
  });
}
