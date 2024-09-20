import { moaConfig, availableModels } from '../config/config.js';
import {
  NODE_RADIUS,
  MAIN_MODEL_FILL_COLOR,
  AGENT_FILL_COLOR,
  NODE_GLOW_FILTER,
} from './stylesConstants.js';
import { createControlButtons } from './controlButtons.js';

/**
 * Creates node elements for a D3.js force-directed graph.
 * 
 * This function:
 * 1. Appends a group element for each node
 * 2. Adds circles, labels, and forms to each node
 * 3. Sets up drag behavior for the nodes
 * 4. Creates control buttons for the graph
 * 
 * @param {d3.Selection} svg - The SVG element to append nodes to
 * @param {Array} nodes - Array of node data objects
 * @param {d3.Simulation} simulation - The D3 force simulation object
 * @returns {d3.Selection} The created node elements
 * 
 * Usage example:
 * const svg = d3.select('svg');
 * const nodes = [{id: 'main_model'}, {id: 'agent1', agent: 1}];
 * const simulation = d3.forceSimulation(nodes);
 * const nodeElements = createNodeElements(svg, nodes, simulation);
 * 
 * Used in files:
 * - js/diagram/diagram.js (assumed)
 * 
 * Role in program logic:
 * This function is crucial for rendering the visual representation of the multi-agent system.
 * It creates interactive node elements that represent the main model and agent models in the diagram.
 */
export function createNodeElements(svg, nodes, simulation) {
  const node = svg
    .append('g')
    .attr('class', 'nodes')
    .selectAll('.node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('data-id', (d) => d.id)
    .call(createNodeDragBehavior(simulation));

  addNodeCircles(node);
  addNodeLabels(node);
  addNodeForms(node);

  createControlButtons(svg);

  return node;
}

/**
 * Adds circular visual representations to each node.
 * 
 * This function:
 * 1. Appends a circle element to each node
 * 2. Sets the radius, fill color, and glow effect
 * 
 * @param {d3.Selection} node - The node elements to add circles to
 * 
 * Usage example:
 * const nodes = d3.selectAll('.node');
 * addNodeCircles(nodes);
 * 
 * Used in files:
 * - js/diagram/nodeElements.js (current file)
 * 
 * Role in program logic:
 * This function creates the visual representation of each node in the diagram,
 * differentiating between the main model and agent models through color.
 */
function addNodeCircles(node) {
  node
    .append('circle')
    .attr('r', NODE_RADIUS)
    .attr('fill', (d) => (d.id === 'main_model' ? MAIN_MODEL_FILL_COLOR : AGENT_FILL_COLOR))
    .attr('filter', NODE_GLOW_FILTER);
}

/**
 * Adds text labels to each node.
 * 
 * This function:
 * 1. Appends a text element to each node
 * 2. Positions the text in the center of the node
 * 3. Sets the text content based on the node type (Main or Agent)
 * 
 * @param {d3.Selection} node - The node elements to add labels to
 * 
 * Usage example:
 * const nodes = d3.selectAll('.node');
 * addNodeLabels(nodes);
 * 
 * Used in files:
 * - js/diagram/nodeElements.js (current file)
 * 
 * Role in program logic:
 * This function adds readable labels to each node, helping users identify
 * the main model and individual agents in the diagram.
 */
function addNodeLabels(node) {
  node
    .append('text')
    .attr('dy', '.3em')
    .attr('text-anchor', 'middle')
    .text((d) => (d.id === 'main_model' ? 'Main' : `A${d.agent}`));
}

/**
 * Adds interactive forms to each node for model selection and temperature adjustment.
 * 
 * This function:
 * 1. Appends foreignObject elements to each node
 * 2. Creates a model selection dropdown for agent nodes
 * 3. Creates a temperature input for agent nodes
 * 
 * @param {d3.Selection} node - The node elements to add forms to
 * 
 * Usage example:
 * const nodes = d3.selectAll('.node');
 * addNodeForms(nodes);
 * 
 * Used in files:
 * - js/diagram/nodeElements.js (current file)
 * 
 * Role in program logic:
 * This function adds interactive elements to each agent node, allowing users
 * to configure the model and temperature for individual agents in the system.
 */
function addNodeForms(node) {
  node
    .append('foreignObject')
    .attr('x', -75)
    .attr('y', 40)
    .attr('width', 150)
    .attr('height', 30)
    .html((d) => createModelSelectHTML(d));

  node
    .append('foreignObject')
    .attr('x', -75)
    .attr('y', 80)
    .attr('width', 150)
    .attr('height', 30)
    .html((d) => createTemperatureInputHTML(d));
}

/**
 * Creates HTML for the model selection dropdown.
 * 
 * This function:
 * 1. Generates option elements for each available model
 * 2. Sets the selected option based on the current model
 * 3. Returns an empty string for the main model node
 * 
 * @param {Object} d - The data object for the current node
 * @returns {string} HTML string for the model selection dropdown
 * 
 * Usage example:
 * const nodeData = {id: 'agent1', model_name: 'gpt-3.5-turbo'};
 * const selectHTML = createModelSelectHTML(nodeData);
 * 
 * Used in files:
 * - js/diagram/nodeElements.js (current file)
 * 
 * Role in program logic:
 * This function generates the HTML for the model selection dropdown,
 * allowing users to choose different models for each agent in the system.
 */
function createModelSelectHTML(d) {
  if (d.id === 'main_model') return '';
  const modelOptions = availableModels
    .map(
      (model) =>
        `<option value="${model}" ${
          model === d.model_name ? 'selected' : ''
        }>${model}</option>`
    )
    .join('');

  return `<select class="agent-model" data-id="${d.id}">
            ${modelOptions}
          </select>`;
}

/**
 * Creates HTML for the temperature input field.
 * 
 * This function:
 * 1. Generates an input element for temperature adjustment
 * 2. Sets the current temperature value
 * 3. Returns an empty string for the main model node
 * 
 * @param {Object} d - The data object for the current node
 * @returns {string} HTML string for the temperature input field
 * 
 * Usage example:
 * const nodeData = {id: 'agent1', temperature: 0.7};
 * const inputHTML = createTemperatureInputHTML(nodeData);
 * 
 * Used in files:
 * - js/diagram/nodeElements.js (current file)
 * 
 * Role in program logic:
 * This function generates the HTML for the temperature input field,
 * allowing users to adjust the temperature parameter for each agent in the system.
 */
function createTemperatureInputHTML(d) {
  if (d.id === 'main_model') return '';
  return `<input type="number" class="agent-temperature" data-id="${
    d.id
  }" min="0" max="1" step="0.1" value="${
    typeof d.temperature === 'number' ? d.temperature : 0.5
  }">`;
}

/**
 * Creates drag behavior for nodes in the force-directed graph.
 * 
 * This function:
 * 1. Defines behavior for drag start, drag, and drag end events
 * 2. Updates node positions during dragging
 * 3. Adjusts the force simulation accordingly
 * 
 * @param {d3.Simulation} simulation - The D3 force simulation object
 * @returns {d3.DragBehavior} The created drag behavior
 * 
 * Usage example:
 * const simulation = d3.forceSimulation(nodes);
 * const dragBehavior = createNodeDragBehavior(simulation);
 * nodeElements.call(dragBehavior);
 * 
 * Used in files:
 * - js/diagram/nodeElements.js (current file)
 * 
 * Role in program logic:
 * This function enables interactive dragging of nodes in the diagram,
 * allowing users to manually adjust the layout of the multi-agent system visualization.
 */
function createNodeDragBehavior(simulation) {
  return d3
    .drag()
    .on('start', function (event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on('drag', function (event, d) {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on('end', function (event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    });
}
