import { debounce } from './utils.js';
import { updateMOAConfig } from './diagramActions.js';

export function addEventListeners(svg, simulation) {
  // Add event listener for agent model and temperature changes
  svg.selectAll('.agent-model, .agent-temperature').on(
    'change',
    debounce(() => {
      updateMOAConfig();
      simulation.alpha(0.3).restart(); // Restart simulation with a mild alpha value
    }, 250)
  );

  // Add zoom functionality
  const zoom = d3.zoom()
    .scaleExtent([0.5, 3])
    .on('zoom', (event) => {
      svg.select('g').attr('transform', event.transform);
    });

  svg.call(zoom);

  // Add drag functionality for nodes
  svg.selectAll('.node')
    .call(d3.drag()
      .on('start', dragStarted)
      .on('drag', dragged)
      .on('end', dragEnded)
    );

  function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  // Add double-click to reset zoom
  svg.on('dblclick.zoom', null);
  svg.on('dblclick', () => {
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
  });
}
