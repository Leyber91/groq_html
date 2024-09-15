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
  updateDiagram,
};

// Function to create the MOA Diagram
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

  // Resize handler
  const resizeHandler = debounce(() => {
    createMOADiagram();
  }, 250);

  window.addEventListener('resize', resizeHandler);
}
