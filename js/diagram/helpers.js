import { MODEL_INFO } from '../config/model-config.js';
import { getModelInfo, getModelContextWindow } from '../api/modelInfo/model-info.js';

export function calculateConnectionStrength(prevAgent, currentAgent) {
  if (!prevAgent || !currentAgent) {
    return 0.5;
  }

  const prevTemperature = prevAgent.temperature ?? 0.5;
  const currentTemperature = currentAgent.temperature ?? 0.5;

  const modelCompatibility = MODEL_INFO[prevAgent.model_name]?.compatibility?.[currentAgent.model_name] ?? 0.7;
  const temperatureCompatibility = 1 - Math.abs(prevTemperature - currentTemperature);

  const prevContextWindow = getModelContextWindow(prevAgent.model_name) ?? 2048;
  const currentContextWindow = getModelContextWindow(currentAgent.model_name) ?? 2048;
  const contextWindowCompatibility = Math.min(prevContextWindow, currentContextWindow) / Math.max(prevContextWindow, currentContextWindow);

  const taskCompatibility = calculateTaskCompatibility(prevAgent, currentAgent);

  /**
   * Calculates the final connection strength based on various compatibility factors.
   * 
   * This function combines different compatibility scores with weighted importance:
   * - Model compatibility (30% weight)
   * - Temperature compatibility (20% weight)
   * - Context window compatibility (30% weight)
   * - Task compatibility (20% weight)
   * 
   * The result is a normalized score between 0 and 1, where higher values indicate
   * stronger connections between agents.
   * 
   * @returns {number} The calculated connection strength (0-1)
   * 
   * Usage example:
   * const strength = calculateConnectionStrength(prevAgent, currentAgent);
   * console.log(`Connection strength: ${strength}`);
   * 
   * Other files that use this function:
   * - js/diagram/diagramRenderer.js
   * - js/diagram/updateDiagram.js
   * 
   * Role in overall program logic:
   * This calculation is crucial for determining the visual representation of connections
   * between agents in the MOA diagram. Stronger connections (higher values) are typically
   * represented by thicker or more prominent lines, helping users understand the
   * relationships and compatibility between different agents in the system.
   */
  return (
    modelCompatibility * 0.3 +
    temperatureCompatibility * 0.2 +
    contextWindowCompatibility * 0.3 +
    taskCompatibility * 0.2
  );
}

export function calculateTaskCompatibility(prevAgent, currentAgent) {
  const prevModelInfo = getModelInfo(prevAgent.model_name);
  const currentModelInfo = getModelInfo(currentAgent.model_name);

  if (!prevModelInfo || !currentModelInfo) {
    return 0.5;
  }

  const prevTasks = new Set(prevModelInfo.bestFor ?? []);
  const currentTasks = new Set(currentModelInfo.bestFor ?? []);

  const commonTasks = new Set([...prevTasks].filter((task) => currentTasks.has(task)));
  const totalTasks = new Set([...prevTasks, ...currentTasks]);

  return commonTasks.size / totalTasks.size || 1;
}

export function responsivefy(svg) {
  const container = d3.select(svg.node().parentNode);
  const width = parseInt(svg.style('width'));
  const height = parseInt(svg.style('height'));
  const aspect = width / height;

  svg
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMinYMid')
    .call(resize);

  d3.select(window).on(`resize.${container.attr('id')}`, resize);

  function resize() {
    const targetWidth = parseInt(container.style('width'));
    svg.attr('width', targetWidth);
    svg.attr('height', Math.round(targetWidth / aspect));
  }
}
