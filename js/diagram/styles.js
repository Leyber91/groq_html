import {
    FORM_BACKGROUND_COLOR,
    FORM_BORDER_COLOR,
    FORM_BORDER_RADIUS,
    FORM_TEXT_COLOR,
    FORM_PADDING,
  } from './stylesConstants.js';
  
  export function addGlowEffects(svg) {
    const defs = svg.append('defs');
  
    // Button Glow
    const buttonGlow = defs
      .append('filter')
      .attr('id', 'button-glow')
      .attr('height', '300%')
      .attr('width', '300%')
      .attr('x', '-75%')
      .attr('y', '-75%');
  
    buttonGlow
      .append('feGaussianBlur')
      .attr('stdDeviation', '5')
      .attr('result', 'coloredBlur');
  
    const feMergeButton = buttonGlow.append('feMerge');
    feMergeButton.append('feMergeNode').attr('in', 'coloredBlur');
    feMergeButton.append('feMergeNode').attr('in', 'SourceGraphic');
  
    // Node Glow
    const nodeGlow = defs
      .append('filter')
      .attr('id', 'node-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
  
    nodeGlow
      .append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');
  
    const feMergeNode = nodeGlow.append('feMerge');
    feMergeNode.append('feMergeNode').attr('in', 'coloredBlur');
    feMergeNode.append('feMergeNode').attr('in', 'SourceGraphic');
  }
  
  export function styleFormElements(svg) {
    svg
      .selectAll('.agent-model, .agent-temperature')
      .style('background', FORM_BACKGROUND_COLOR)
      .style('border', FORM_BORDER_COLOR)
      .style('border-radius', FORM_BORDER_RADIUS)
      .style('color', FORM_TEXT_COLOR)
      .style('padding', FORM_PADDING);
  }
  