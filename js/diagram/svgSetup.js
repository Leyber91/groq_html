// svgSetup.js
import { moaConfig } from '../config/config.js';

/**
 * Initializes and returns an SVG element within the specified container.
 * 
 * This function:
 * 1. Appends an SVG element to the provided container
 * 2. Sets the width and height attributes of the SVG
 * 3. Sets the viewBox attribute for responsive scaling
 * 4. Sets the preserveAspectRatio attribute to maintain the aspect ratio
 * 
 * @param {d3.Selection} container - The D3 selection of the container element
 * @param {number} width - The width of the SVG
 * @param {number} height - The height of the SVG
 * @returns {d3.Selection} The created SVG element as a D3 selection
 * 
 * Usage example:
 * const container = d3.select('#diagram-container');
 * const svg = initializeSVG(container, 800, 600);
 * 
 * Other files that use this function:
 * - js/diagram/diagramRenderer.js
 * - js/diagram/updateDiagram.js
 * 
 * Role in overall program logic:
 * This function is crucial for setting up the SVG canvas where the MOA diagram
 * will be rendered. It ensures that the SVG is properly sized and scalable,
 * providing a foundation for all subsequent diagram elements.
 */
export function initializeSVG(container, width, height) {
  return container
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');
}

/**
 * Calculates and returns the dimensions for the MOA diagram.
 * 
 * This function:
 * 1. Calculates the diagram width and height based on the provided dimensions
 * 2. Determines the margins for the diagram
 * 3. Calculates the width and height for each layer in the diagram
 * 
 * @param {number} width - The total width available for the diagram
 * @param {number} height - The total height available for the diagram
 * @returns {Object} An object containing calculated dimensions and margins
 * 
 * Usage example:
 * const { diagramWidth, diagramHeight, margin, layerWidth, layerHeight } = calculateDiagramDimensions(800, 600);
 * 
 * Other files that use this function:
 * - js/diagram/diagramRenderer.js
 * - js/diagram/nodesAndLinks.js
 * 
 * Role in overall program logic:
 * This function is essential for determining the layout of the MOA diagram.
 * It ensures that the diagram fits properly within the available space and
 * that layers are evenly distributed. These calculations are used throughout
 * the diagram creation process to position nodes and links accurately.
 */
export function calculateDiagramDimensions(width, height) {
  const diagramWidth = width * 0.95;
  const diagramHeight = height * 0.95;
  const margin = { top: height * 0.025, left: width * 0.025 };
  const layerWidth = diagramWidth / (moaConfig.layers.length + 1);
  const layerHeight = diagramHeight;

  return { diagramWidth, diagramHeight, margin, layerWidth, layerHeight };
}
