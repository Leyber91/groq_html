import { moaConfig } from '../config/config.js';
import { calculateConnectionStrength } from './helpers.js';
import { nodeMap } from './nodeMap.js';

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
    });
  });

  return { nodes, links };
}
