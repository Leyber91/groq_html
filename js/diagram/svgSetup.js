// svgSetup.js
import { moaConfig } from '../config/config.js';

export function initializeSVG(container, width, height) {
  return container
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');
}

export function calculateDiagramDimensions(width, height) {
  const diagramWidth = width * 0.95;
  const diagramHeight = height * 0.95;
  const margin = { top: height * 0.025, left: width * 0.025 };
  const layerWidth = diagramWidth / (moaConfig.layers.length + 1);
  const layerHeight = diagramHeight;

  return { diagramWidth, diagramHeight, margin, layerWidth, layerHeight };
}
