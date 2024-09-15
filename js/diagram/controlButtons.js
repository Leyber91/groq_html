import {
    ADD_LAYER_BUTTON_WIDTH,
    ADD_LAYER_BUTTON_HEIGHT,
    ADD_LAYER_BUTTON_RADIUS,
    ADD_LAYER_BUTTON_FILL,
    ADD_AGENT_BUTTON_WIDTH,
    ADD_AGENT_BUTTON_HEIGHT,
    ADD_AGENT_BUTTON_RADIUS,
    ADD_AGENT_BUTTON_FILL,
    REMOVE_LAYER_BUTTON_WIDTH,
    REMOVE_LAYER_BUTTON_HEIGHT,
    REMOVE_LAYER_BUTTON_RADIUS,
    REMOVE_LAYER_BUTTON_FILL,
    BUTTON_TEXT_FILL,
    BUTTON_TEXT_FONT_WEIGHT,
    BUTTON_GLOW_FILTER,
    BUTTON_TEXT_FONT_SIZE,
    REMOVE_AGENT_BUTTON_RADIUS,
    REMOVE_AGENT_BUTTON_FILL,
    REMOVE_AGENT_BUTTON_HOVER_FILL,
    BUTTON_HOVER_DURATION,
  } from './stylesConstants.js';
  import { addLayer, addAgent, removeLayer, removeAgent } from './diagramActions.js';
  import { moaConfig } from '../config/config.js';
  
  export function createControlButtons(svg) {
    const width = svg.attr('width');
    const height = svg.attr('height');
    const layerWidth = (width * 0.95) / (moaConfig.layers.length + 1);
    const layerHeight = height * 0.95;
  
    // Add 'Add Layer' button
    createAddLayerButton(svg, width, height);
  
    // Add 'Add Agent' and 'Remove Layer' buttons for each layer
    moaConfig.layers.forEach((layer, layerIndex) => {
      createAddAgentButton(svg, layerIndex, layerWidth, height);
  
      if (layerIndex > 0) {
        createRemoveLayerButton(svg, layerIndex, layerWidth, height);
      }
  
      // Add 'Remove Agent' buttons
      layer.forEach((agent, agentIndex) => {
        if (layer.length > 1) {
          createRemoveAgentButton(
            svg,
            layerIndex,
            agentIndex,
            layerWidth,
            layerHeight,
            height
          );
        }
      });
    });
  }
  
  function createAddLayerButton(svg, width, height) {
    const addLayerButton = svg
      .append('g')
      .attr('class', 'add-layer-button')
      .attr('transform', `translate(${width - 120}, ${height - 40})`)
      .style('cursor', 'pointer')
      .on('click', addLayer);
  
    addLayerButton
      .append('rect')
      .attr('width', ADD_LAYER_BUTTON_WIDTH)
      .attr('height', ADD_LAYER_BUTTON_HEIGHT)
      .attr('rx', ADD_LAYER_BUTTON_RADIUS)
      .attr('ry', ADD_LAYER_BUTTON_RADIUS)
      .attr('fill', ADD_LAYER_BUTTON_FILL)
      .attr('filter', BUTTON_GLOW_FILTER);
  
    addLayerButton
      .append('text')
      .attr('x', ADD_LAYER_BUTTON_WIDTH / 2)
      .attr('y', ADD_LAYER_BUTTON_HEIGHT / 2 + 5)
      .attr('text-anchor', 'middle')
      .attr('fill', BUTTON_TEXT_FILL)
      .attr('font-weight', BUTTON_TEXT_FONT_WEIGHT)
      .text('Add Layer');
  }
  
  function createAddAgentButton(svg, layerIndex, layerWidth, height) {
    const addAgentButton = svg
      .append('g')
      .attr('class', 'add-agent-button')
      .attr(
        'transform',
        `translate(${(layerIndex + 1) * layerWidth - 50}, ${height - 40})`
      )
      .style('cursor', 'pointer')
      .on('click', () => addAgent(layerIndex));
  
    addAgentButton
      .append('rect')
      .attr('width', ADD_AGENT_BUTTON_WIDTH)
      .attr('height', ADD_AGENT_BUTTON_HEIGHT)
      .attr('rx', ADD_AGENT_BUTTON_RADIUS)
      .attr('ry', ADD_AGENT_BUTTON_RADIUS)
      .attr('fill', ADD_AGENT_BUTTON_FILL)
      .attr('filter', BUTTON_GLOW_FILTER);
  
    addAgentButton
      .append('text')
      .attr('x', ADD_AGENT_BUTTON_WIDTH / 2)
      .attr('y', ADD_AGENT_BUTTON_HEIGHT / 2 + 5)
      .attr('text-anchor', 'middle')
      .attr('fill', BUTTON_TEXT_FILL)
      .attr('font-weight', BUTTON_TEXT_FONT_WEIGHT)
      .text('Add Agent');
  }
  
  function createRemoveLayerButton(svg, layerIndex, layerWidth, height) {
    const removeLayerButton = svg
      .append('g')
      .attr('class', 'remove-layer-button')
      .attr(
        'transform',
        `translate(${(layerIndex + 1) * layerWidth - 50}, ${height - 80})`
      )
      .style('cursor', 'pointer')
      .on('click', () => removeLayer(layerIndex));
  
    removeLayerButton
      .append('rect')
      .attr('width', REMOVE_LAYER_BUTTON_WIDTH)
      .attr('height', REMOVE_LAYER_BUTTON_HEIGHT)
      .attr('rx', REMOVE_LAYER_BUTTON_RADIUS)
      .attr('ry', REMOVE_LAYER_BUTTON_RADIUS)
      .attr('fill', REMOVE_LAYER_BUTTON_FILL)
      .attr('filter', BUTTON_GLOW_FILTER);
  
    removeLayerButton
      .append('text')
      .attr('x', REMOVE_LAYER_BUTTON_WIDTH / 2)
      .attr('y', REMOVE_LAYER_BUTTON_HEIGHT / 2 + 5)
      .attr('text-anchor', 'middle')
      .attr('fill', BUTTON_TEXT_FILL)
      .attr('font-weight', BUTTON_TEXT_FONT_WEIGHT)
      .text('Remove Layer');
  }
  
  function createRemoveAgentButton(
    svg,
    layerIndex,
    agentIndex,
    layerWidth,
    layerHeight,
    height
  ) {
    const removeAgentButton = svg
      .append('g')
      .attr('class', 'remove-agent-button')
      .attr(
        'transform',
        `translate(${(layerIndex + 1) * layerWidth - 25}, ${
          (agentIndex + 1) * (layerHeight / (moaConfig.layers[layerIndex].length + 1)) +
          40
        })`
      )
      .style('cursor', 'pointer')
      .on('click', () => removeAgent(layerIndex, agentIndex));
  
    removeAgentButton
      .append('circle')
      .attr('r', REMOVE_AGENT_BUTTON_RADIUS)
      .attr('fill', REMOVE_AGENT_BUTTON_FILL)
      .attr('filter', BUTTON_GLOW_FILTER);
  
    removeAgentButton
      .append('text')
      .attr('x', 0)
      .attr('y', 5)
      .attr('text-anchor', 'middle')
      .attr('fill', BUTTON_TEXT_FILL)
      .attr('font-weight', BUTTON_TEXT_FONT_WEIGHT)
      .attr('font-size', BUTTON_TEXT_FONT_SIZE)
      .text('×');
  
    // Add hover effect
    removeAgentButton
      .on('mouseover', function () {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(BUTTON_HOVER_DURATION)
          .attr('r', REMOVE_AGENT_BUTTON_RADIUS + 2)
          .attr('fill', REMOVE_AGENT_BUTTON_HOVER_FILL);
      })
      .on('mouseout', function () {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(BUTTON_HOVER_DURATION)
          .attr('r', REMOVE_AGENT_BUTTON_RADIUS)
          .attr('fill', REMOVE_AGENT_BUTTON_FILL);
      });
  }
  