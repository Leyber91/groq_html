import {
    LINK_STROKE_COLOR,
    LINK_STROKE_OPACITY,
    LINK_GLOW_FILTER,
  } from './stylesConstants.js';
  
/**
 * Creates and returns SVG line elements representing links between nodes in a graph.
 * 
 * This function takes an SVG container and an array of link data, then creates SVG line
 * elements for each link. It applies various styles and attributes to the lines based
 * on the link data and predefined style constants.
 * 
 * @param {d3.Selection} svg - The D3 selection of the SVG element to append the links to.
 * @param {Array} links - An array of link objects, each containing data about the connection.
 * @returns {d3.Selection} A D3 selection of the created line elements.
 * 
 * Usage example:
 * const svg = d3.select('#graph-container').append('svg');
 * const links = [
 *   { source: 'nodeA', target: 'nodeB', weight: 2, type: 'strong' },
 *   { source: 'nodeB', target: 'nodeC', weight: 1, type: 'weak' }
 * ];
 * const linkElements = createLinkElements(svg, links);
 * 
 * Other files that use this function:
 * - js/diagram/diagramRenderer.js
 * - js/diagram/updateDiagram.js
 * 
 * Role in overall program logic:
 * This function is crucial for visualizing the connections between nodes in the MOA diagram.
 * It creates the visual representation of relationships between agents, allowing users to
 * understand the structure and strength of connections in the multi-agent system. The
 * appearance of these links (e.g., thickness, color, glow effect) provides immediate visual
 * cues about the nature and importance of each connection.
 */
export function createLinkElements(svg, links) {
  return svg
    .append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('stroke-width', (d) => Math.sqrt(d.weight))
    .attr('stroke', LINK_STROKE_COLOR)
    .attr('opacity', LINK_STROKE_OPACITY)
    .attr('filter', LINK_GLOW_FILTER)
    .attr('class', (d) => d.type);
}