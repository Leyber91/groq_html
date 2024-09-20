import { moaConfig } from '../config/config.js';
import { calculateConnectionStrength } from './helpers.js';
import { nodeMap } from './nodeMap.js';

/**
 * Creates nodes and links for the MOA diagram based on the configuration.
 * 
 * This function:
 * 1. Iterates through layers and agents in the MOA configuration
 * 2. Creates node objects for each agent and the main model
 * 3. Establishes links between nodes (inter-layer, self, forward, and to main model)
 * 4. Calculates positions for nodes based on diagram dimensions
 * 5. Stores node data in the global nodeMap
 * 
 * @param {Object} options - Configuration options for diagram dimensions
 * @param {number} options.diagramWidth - Width of the diagram
 * @param {number} options.diagramHeight - Height of the diagram
 * @param {Object} options.margin - Margins for the diagram
 * @param {number} options.layerWidth - Width between layers
 * @param {number} options.layerHeight - Height of each layer
 * @returns {Object} An object containing arrays of nodes and links
 * 
 * Usage example:
 * const diagramConfig = {
 *   diagramWidth: 800,
 *   diagramHeight: 600,
 *   margin: { top: 20, right: 20, bottom: 20, left: 20 },
 *   layerWidth: 200,
 *   layerHeight: 150
 * };
 * const { nodes, links } = createNodesAndLinks(diagramConfig);
 * 
 * Other files that use this function:
 * - js/diagram/diagramRenderer.js
 * - js/diagram/updateDiagram.js
 * 
 * Role in overall program logic:
 * This function is crucial for generating the data structure that represents
 * the Multi-Agent Organization (MOA) diagram. It translates the configuration
 * into a format that can be visualized using D3.js, enabling the creation of
 * an interactive force-directed graph representing the MOA structure.
 */
export function createNodesAndLinks({
  diagramWidth,
  diagramHeight,
  margin,
  layerWidth,
  layerHeight,
}) {
  const nodes = [];
  const links = [];

  moaConfig.layers.forEach((layer, layerIndex) => {
    const layerX = margin.left + (layerIndex + 1) * layerWidth;
    layer.forEach((agent, agentIndex) => {
      const agentY =
        margin.top + (agentIndex + 1) * (layerHeight / (layer.length + 1));
      const nodeId = `layer${layerIndex}_agent${agentIndex}`;
      const nodeData = {
        id: nodeId,
        x: layerX,
        y: agentY,
        layer: layerIndex,
        agent: agentIndex,
        ...agent,
        type: 'agent',
      };
      nodes.push(nodeData);
      nodeMap.set(nodeId, nodeData);

      // Connect to previous layer nodes
      if (layerIndex > 0) {
        moaConfig.layers[layerIndex - 1].forEach((prevAgent, prevAgentIndex) => {
          const prevNodeId = `layer${layerIndex - 1}_agent${prevAgentIndex}`;
          const connectionStrength = calculateConnectionStrength(prevAgent, agent);
          links.push({
            source: prevNodeId,
            target: nodeId,
            weight: connectionStrength,
            type: 'inter-layer',
          });
        });
      }

      // Add self-connection for recurrent behavior
      links.push({
        source: nodeId,
        target: nodeId,
        weight: 0.5,
        type: 'self',
      });

      // Connect to next layer nodes (if not the last layer)
      if (layerIndex < moaConfig.layers.length - 1) {
        moaConfig.layers[layerIndex + 1].forEach((nextAgent, nextAgentIndex) => {
          const nextNodeId = `layer${layerIndex + 1}_agent${nextAgentIndex}`;
          links.push({
            source: nodeId,
            target: nextNodeId,
            weight: 1,
            type: 'forward',
          });
        });
      }
    });
  });

  // Add main model node
  const mainModelNode = {
    id: 'main_model',
    x: margin.left + diagramWidth,
    y: margin.top + diagramHeight / 2,
    model_name: moaConfig.main_model,
    temperature: moaConfig.main_temperature,
    type: 'main_model',
  };
  nodes.push(mainModelNode);
  nodeMap.set('main_model', mainModelNode);

  // Connect last layer to main model
  const lastLayerIndex = moaConfig.layers.length - 1;
  moaConfig.layers[lastLayerIndex].forEach((agent, agentIndex) => {
    links.push({
      source: `layer${lastLayerIndex}_agent${agentIndex}`,
      target: 'main_model',
      weight: 1,
      type: 'to-main-model',
    });
  });

  return { nodes, links };
}
