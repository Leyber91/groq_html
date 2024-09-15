import { moaConfig, availableModels } from '../config/config.js';
import {
  NODE_RADIUS,
  MAIN_MODEL_FILL_COLOR,
  AGENT_FILL_COLOR,
  NODE_GLOW_FILTER,
} from './stylesConstants.js';
import { createControlButtons } from './controlButtons.js';

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

function addNodeCircles(node) {
  node
    .append('circle')
    .attr('r', NODE_RADIUS)
    .attr('fill', (d) => (d.id === 'main_model' ? MAIN_MODEL_FILL_COLOR : AGENT_FILL_COLOR))
    .attr('filter', NODE_GLOW_FILTER);
}

function addNodeLabels(node) {
  node
    .append('text')
    .attr('dy', '.3em')
    .attr('text-anchor', 'middle')
    .text((d) => (d.id === 'main_model' ? 'Main' : `A${d.agent}`));
}

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

function createTemperatureInputHTML(d) {
  if (d.id === 'main_model') return '';
  return `<input type="number" class="agent-temperature" data-id="${
    d.id
  }" min="0" max="1" step="0.1" value="${
    typeof d.temperature === 'number' ? d.temperature : 0.5
  }">`;
}

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
