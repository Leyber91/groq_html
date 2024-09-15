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

export function addLayer() {
  if (moaConfig && Array.isArray(moaConfig.layers)) {
    moaConfig.layers.push([{ model_name: 'llama3-8b-8192', temperature: 0.5 }]);
    createMOADiagram();
  } else {
    console.error('moaConfig is not properly defined');
  }
}

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

export function removeLayer(layerIndex) {
  if (moaConfig.layers.length > 1) {
    moaConfig.layers.splice(layerIndex, 1);
    createMOADiagram();
  } else {
    alert('Cannot remove the last layer.');
  }
}

export function removeAgent(layerIndex, agentIndex) {
  if (moaConfig.layers[layerIndex].length > 1) {
    moaConfig.layers[layerIndex].splice(agentIndex, 1);
    createMOADiagram();
  } else {
    alert('Cannot remove the last agent in a layer.');
  }
}

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
      newConfig.main_model = moaConfig.main_model;
      newConfig.main_temperature = moaConfig.main_temperature;
    }
  });

  // Update the global moaConfig
  configUpdateMOAConfig(newConfig);
  createMOADiagram();
}

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

  // Update the model name in the dropdown
  agentNode.select('.agent-model').property('value', modelName);

  // Animate the node based on status
  agentNode
    .select('circle')
    .transition()
    .duration(NODE_ANIMATION_DURATION)
    .attr('fill', status === 'success' ? '#4CAF50' : '#FF5252')
    .transition()
    .duration(NODE_ANIMATION_DURATION)
    .attr('fill', AGENT_FILL_COLOR);

  // Update the node label
  agentNode.select('text').text(`A${agentIndex}`);

  // Update the node in the global nodeMap
  if (nodeMap.has(nodeId)) {
    const updatedNode = nodeMap.get(nodeId);
    updatedNode.model_name = modelName;
    nodeMap.set(nodeId, updatedNode);
  }

  // Update node connections
  updateNodeConnections(layerIndex, agentIndex);
}

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

      // Check if nodes exist
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
