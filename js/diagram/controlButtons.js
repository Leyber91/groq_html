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
  
    createAddLayerButton(svg, width, height);
  
    moaConfig.layers.forEach((layer, layerIndex) => {
      createAddAgentButton(svg, layerIndex, layerWidth, height);
  
      if (layerIndex > 0) {
        createRemoveLayerButton(svg, layerIndex, layerWidth, height);
      }
  
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
    createButton(svg, {
      className: 'add-layer-button',
      x: width - 120,
      y: height - 40,
      width: ADD_LAYER_BUTTON_WIDTH,
      height: ADD_LAYER_BUTTON_HEIGHT,
      rx: ADD_LAYER_BUTTON_RADIUS,
      ry: ADD_LAYER_BUTTON_RADIUS,
      fill: ADD_LAYER_BUTTON_FILL,
      text: 'Add Layer',
      onClick: addLayer
    });
  }
  
  function createAddAgentButton(svg, layerIndex, layerWidth, height) {
    createButton(svg, {
      className: 'add-agent-button',
      x: (layerIndex + 1) * layerWidth - 50,
      y: height - 40,
      width: ADD_AGENT_BUTTON_WIDTH,
      height: ADD_AGENT_BUTTON_HEIGHT,
      rx: ADD_AGENT_BUTTON_RADIUS,
      ry: ADD_AGENT_BUTTON_RADIUS,
      fill: ADD_AGENT_BUTTON_FILL,
      text: 'Add Agent',
      onClick: () => addAgent(layerIndex)
    });
  }
  
  function createRemoveLayerButton(svg, layerIndex, layerWidth, height) {
    createButton(svg, {
      className: 'remove-layer-button',
      x: (layerIndex + 1) * layerWidth - 50,
      y: height - 80,
      width: REMOVE_LAYER_BUTTON_WIDTH,
      height: REMOVE_LAYER_BUTTON_HEIGHT,
      rx: REMOVE_LAYER_BUTTON_RADIUS,
      ry: REMOVE_LAYER_BUTTON_RADIUS,
      fill: REMOVE_LAYER_BUTTON_FILL,
      text: 'Remove Layer',
      onClick: () => removeLayer(layerIndex)
    });
  }
  
  function createRemoveAgentButton(
    svg,
    layerIndex,
    agentIndex,
    layerWidth,
    layerHeight,
    height
  ) {
    const x = (layerIndex + 1) * layerWidth - 25;
    const y = (agentIndex + 1) * (layerHeight / (moaConfig.layers[layerIndex].length + 1)) + 40;
    
    const removeAgentButton = svg
      .append('g')
      .attr('class', 'remove-agent-button')
      .attr('transform', `translate(${x}, ${y})`)
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
  
    addHoverEffect(removeAgentButton);
  }
  
  function createButton(svg, options) {
    const button = svg
      .append('g')
      .attr('class', options.className)
      .attr('transform', `translate(${options.x}, ${options.y})`)
      .style('cursor', 'pointer')
      .on('click', options.onClick);
  
    button
      .append('rect')
      .attr('width', options.width)
      .attr('height', options.height)
      .attr('rx', options.rx)
      .attr('ry', options.ry)
      .attr('fill', options.fill)
      .attr('filter', BUTTON_GLOW_FILTER);
  
    button
      .append('text')
      .attr('x', options.width / 2)
      .attr('y', options.height / 2 + 5)
      .attr('text-anchor', 'middle')
      .attr('fill', BUTTON_TEXT_FILL)
      .attr('font-weight', BUTTON_TEXT_FONT_WEIGHT)
      .text(options.text);
  
    addHoverEffect(button);
    return button;
  }
  
  function addHoverEffect(button) {
    button
      .on('mouseover', function () {
        d3.select(this)
          .select('circle, rect')
          .transition()
          .duration(BUTTON_HOVER_DURATION)
          .attr('transform', 'scale(1.1)')
          .attr('fill', REMOVE_AGENT_BUTTON_HOVER_FILL);
      })
      .on('mouseout', function () {
        d3.select(this)
          .select('circle, rect')
          .transition()
          .duration(BUTTON_HOVER_DURATION)
          .attr('transform', 'scale(1)')
          .attr('fill', function() {
            return this.tagName === 'circle' ? REMOVE_AGENT_BUTTON_FILL : this.getAttribute('fill');
          });
      });
  }