import {
    LINK_STROKE_COLOR,
    LINK_STROKE_OPACITY,
    LINK_GLOW_FILTER,
  } from './stylesConstants.js';
  
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
  