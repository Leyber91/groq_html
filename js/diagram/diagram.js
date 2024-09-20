import { debounce } from './utils.js';
import {
  calculateConnectionStrength,
  calculateTaskCompatibility,
  responsivefy,
} from './helpers.js';
import { initializeSVG, calculateDiagramDimensions } from './svgSetup.js';
import { createNodesAndLinks } from './nodesAndLinks.js';
import { createForceSimulation } from './forceSimulation.js';
import { createLinkElements } from './linkElements.js';
import { createNodeElements } from './nodeElements.js';
import { addGlowEffects, styleFormElements } from './styles.js';
import { addEventListeners } from './eventListeners.js';
import {
  addLayer,
  addAgent,
  removeLayer,
  removeAgent,
  updateMOAConfig,
  animateAgent,
  updateDiagram,
} from './diagramActions.js';
import {
  moaConfig,
  availableModels,
  updateMOAConfig as configUpdateMOAConfig,
} from '../config/config.js';
import { nodeMap } from './nodeMap.js';

// Export necessary functions
export {
  addLayer,
  addAgent,
  removeLayer,
  removeAgent,
  updateMOAConfig,
  animateAgent,
  updateDiagram
};

/**
 * Creates the MOA (Multi-Objective Architecture) Diagram.
 * 
 * This function initializes and renders the entire diagram, including nodes, links,
 * and all interactive elements. It sets up the SVG, creates the force simulation,
 * and adds all necessary event listeners.
 * 
 * Usage example:
 * createMOADiagram();
 * 
 * Other files that use this function:
 * - js/main.js
 * - js/components/DiagramContainer.js
 * 
 * Role in overall program logic:
 * This is the core function for rendering the visual representation of the MOA.
 * It brings together all the components of the diagram and is crucial for the
 * interactive visualization of the system's architecture.
 */
export function createMOADiagram() {
  if (!moaConfig || !moaConfig.layers || moaConfig.layers.length === 0) {
    console.warn('MOA configuration not fully loaded. Skipping diagram creation.');
    return;
  }

  nodeMap.clear(); // Clear the existing map before populating it

  const container = d3.select('#moa-diagram');
  container.selectAll('*').remove();

  const containerRect = container.node().getBoundingClientRect();
  const width = containerRect.width;
  const height = containerRect.height;

  const svg = initializeSVG(container, width, height);

  const diagramDimensions = calculateDiagramDimensions(width, height);

  const { nodes, links } = createNodesAndLinks(diagramDimensions);

  const simulation = createForceSimulation(nodes, links, diagramDimensions.layerWidth);

  const link = createLinkElements(svg, links);

  const node = createNodeElements(svg, nodes, simulation);

  addGlowEffects(svg);

  styleFormElements(svg);

  addEventListeners(svg, simulation);

  // Resize handler with debounce
  const resizeHandler = debounce(() => {
    createMOADiagram();
  }, 250);

  // Remove existing resize listener before adding a new one
  window.removeEventListener('resize', resizeHandler);
  window.addEventListener('resize', resizeHandler);

  // Force simulation tick function
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node
      .attr('transform', d => `translate(${d.x},${d.y})`);
  });

  // Zoom functionality
  const zoom = d3.zoom()
    .scaleExtent([0.5, 3])
    .on('zoom', (event) => {
      svg.selectAll('g').attr('transform', event.transform);
    });

  svg.call(zoom);

  // Add pan functionality
  let isDragging = false;
  let startX, startY;

  svg.on('mousedown', (event) => {
    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;
  });

  svg.on('mousemove', (event) => {
    if (isDragging) {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      svg.selectAll('g').attr('transform', `translate(${dx}, ${dy})`);
    }
  });

  svg.on('mouseup', () => {
    isDragging = false;
  });

  // Add double-click to reset zoom and pan
  svg.on('dblclick', () => {
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
  });
}

/**
 * Updates the MOA Diagram.
 * 
 * This function removes the existing diagram and recreates it with the updated configuration.
 * It also triggers a custom event to notify other components of the update.
 * 
 * Usage example:
 * updateMOAConfig(newConfig);
 * updateMOADiagram();
 * 
 * Other files that use this function:
 * - js/components/ConfigPanel.js
 * - js/modules/diagramUpdater.js
 * 
 * Role in overall program logic:
 * This function is crucial for maintaining the diagram's synchronization with the
 * underlying data model. It ensures that any changes in the configuration are
 * immediately reflected in the visual representation.
 */
export function updateMOADiagram() {
  // Remove the existing diagram
  const container = d3.select('#moa-diagram');
  container.selectAll('*').remove();

  // Recreate the diagram with the updated configuration
  createMOADiagram();

  // Trigger a custom event to notify other components of the update
  const updateEvent = new CustomEvent('moaDiagramUpdated');
  window.dispatchEvent(updateEvent);
}

/**
 * Highlights connections between nodes.
 * 
 * This function visually emphasizes the connections of a specific node in the diagram.
 * 
 * @param {string} nodeId - The ID of the node to highlight connections for.
 * 
 * Usage example:
 * highlightConnections('node1');
 * 
 * Other files that use this function:
 * - js/components/NodeInspector.js
 * - js/modules/connectionAnalyzer.js
 * 
 * Role in overall program logic:
 * This function enhances the interactivity of the diagram by allowing users to
 * visually explore the relationships between different nodes. It's important for
 * understanding the structure and dependencies within the MOA.
 */
export function highlightConnections(nodeId) {
  const svg = d3.select('#moa-diagram');
  const links = svg.selectAll('.link');
  const nodes = svg.selectAll('.node');

  links.classed('highlighted', d => d.source.id === nodeId || d.target.id === nodeId);
  nodes.classed('connected', d => d.id === nodeId || d.connections.includes(nodeId));
}

/**
 * Resets all highlights in the diagram.
 * 
 * This function removes any highlighting applied to nodes or links in the diagram.
 * 
 * Usage example:
 * resetHighlights();
 * 
 * Other files that use this function:
 * - js/components/NodeInspector.js
 * - js/modules/connectionAnalyzer.js
 * 
 * Role in overall program logic:
 * This function is important for clearing visual emphasis when it's no longer needed,
 * ensuring that the diagram returns to its default state. It's typically used after
 * a user has finished inspecting specific connections.
 */
export function resetHighlights() {
  const svg = d3.select('#moa-diagram');
  svg.selectAll('.link').classed('highlighted', false);
  svg.selectAll('.node').classed('connected', false);
}
