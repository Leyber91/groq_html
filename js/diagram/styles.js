import {
    FORM_BACKGROUND_COLOR,
    FORM_BORDER_COLOR,
    FORM_BORDER_RADIUS,
    FORM_TEXT_COLOR,
    FORM_PADDING,
  } from './stylesConstants.js';
  
/**
 * Adds glow effects to SVG elements.
 * 
 * This function creates three filter effects:
 * 1. Button Glow: A glowing effect for buttons
 * 2. Node Glow: A glowing effect for nodes in the graph
 * 3. Drop Shadow: A shadow effect for depth
 * 
 * Each effect is created by appending filter elements to the SVG's defs section.
 * 
 * @param {d3.Selection} svg - The D3 selection of the SVG element to add effects to.
 * 
 * Usage example:
 * const svg = d3.select('svg');
 * addGlowEffects(svg);
 * 
 * Other files that use this function:
 * - js/diagram/diagramRenderer.js
 * - js/diagram/updateDiagram.js
 * 
 * Role in overall program logic:
 * This function enhances the visual appeal of the diagram by adding subtle
 * lighting effects. These effects help distinguish interactive elements and
 * add depth to the overall visualization, improving user experience.
 */
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
  
    // Add a drop shadow effect
    const dropShadow = defs
      .append('filter')
      .attr('id', 'drop-shadow')
      .attr('height', '130%');
  
    dropShadow.append('feGaussianBlur')
      .attr('in', 'SourceAlpha')
      .attr('stdDeviation', 3)
      .attr('result', 'blur');
  
    dropShadow.append('feOffset')
      .attr('in', 'blur')
      .attr('dx', 2)
      .attr('dy', 2)
      .attr('result', 'offsetBlur');
  
    const feMergeDropShadow = dropShadow.append('feMerge');
    feMergeDropShadow.append('feMergeNode').attr('in', 'offsetBlur');
    feMergeDropShadow.append('feMergeNode').attr('in', 'SourceGraphic');
  }
  
/**
 * Applies styles to form elements within the SVG.
 * 
 * This function:
 * 1. Sets background, border, color, and padding for form elements
 * 2. Adds a box shadow for depth
 * 3. Sets up a transition for smooth style changes
 * 4. Implements hover effects to scale up elements and enhance shadow
 * 
 * @param {d3.Selection} svg - The D3 selection of the SVG element containing form elements
 * 
 * Usage example:
 * const svg = d3.select('svg');
 * styleFormElements(svg);
 * 
 * Other files that use this function:
 * - js/diagram/diagramRenderer.js
 * - js/diagram/updateDiagram.js
 * 
 * Role in overall program logic:
 * This function enhances the visual appeal and interactivity of form elements
 * within the diagram. It provides visual feedback for user interactions,
 * improving usability and making the interface more engaging.
 */
export function styleFormElements(svg) {
    svg
      .selectAll('.agent-model, .agent-temperature')
      .style('background', FORM_BACKGROUND_COLOR)
      .style('border', FORM_BORDER_COLOR)
      .style('border-radius', FORM_BORDER_RADIUS)
      .style('color', FORM_TEXT_COLOR)
      .style('padding', FORM_PADDING)
      .style('box-shadow', '0 2px 5px rgba(0, 0, 0, 0.1)')
      .style('transition', 'all 0.3s ease');
  
    // Add hover effect
    svg
      .selectAll('.agent-model, .agent-temperature')
      .on('mouseover', function() {
        d3.select(this)
          .transition()
          .duration(300)
          .style('transform', 'scale(1.05)')
          .style('box-shadow', '0 4px 8px rgba(0, 0, 0, 0.2)');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(300)
          .style('transform', 'scale(1)')
          .style('box-shadow', '0 2px 5px rgba(0, 0, 0, 0.1)');
      });
  }