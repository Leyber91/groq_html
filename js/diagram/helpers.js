import { MODEL_INFO } from '../config/model-config.js';
import { getModelInfo, getModelContextWindow } from '../api/modelInfo/model-info.js';

export function calculateConnectionStrength(prevAgent, currentAgent) {
  // If either agent is undefined, return a default strength
  if (!prevAgent || !currentAgent) {
    return 0.5; // Default connection strength
  }

  // Handle cases where temperature might be undefined
  const prevTemperature =
    typeof prevAgent.temperature === 'number' ? prevAgent.temperature : 0.5;
  const currentTemperature =
    typeof currentAgent.temperature === 'number' ? currentAgent.temperature : 0.5;

  // Calculate model compatibility
  const modelCompatibility =
    MODEL_INFO[prevAgent.model_name]?.compatibility?.[currentAgent.model_name] || 0.7;

  // Calculate temperature compatibility
  const temperatureCompatibility = 1 - Math.abs(prevTemperature - currentTemperature);

  // Calculate context window compatibility
  const prevContextWindow = getModelContextWindow(prevAgent.model_name) || 2048;
  const currentContextWindow = getModelContextWindow(currentAgent.model_name) || 2048;
  const contextWindowCompatibility =
    Math.min(prevContextWindow, currentContextWindow) /
    Math.max(prevContextWindow, currentContextWindow);

  // Calculate task compatibility
  const taskCompatibility = calculateTaskCompatibility(prevAgent, currentAgent);

  // Calculate overall connection strength
  const connectionStrength =
    modelCompatibility * 0.3 +
    temperatureCompatibility * 0.2 +
    contextWindowCompatibility * 0.3 +
    taskCompatibility * 0.2;

  return connectionStrength;
}

export function calculateTaskCompatibility(prevAgent, currentAgent) {
  const prevModelInfo = getModelInfo(prevAgent.model_name);
  const currentModelInfo = getModelInfo(currentAgent.model_name);

  if (!prevModelInfo || !currentModelInfo) {
    return 0.5; // Default compatibility if model info is not available
  }

  const prevTasks = new Set(prevModelInfo.bestFor || []);
  const currentTasks = new Set(currentModelInfo.bestFor || []);

  const commonTasks = new Set([...prevTasks].filter((task) => currentTasks.has(task)));
  const totalTasks = new Set([...prevTasks, ...currentTasks]);

  return commonTasks.size / (totalTasks.size || 1);
}

export function responsivefy(svg) {
  const container = d3.select(svg.node().parentNode),
    width = parseInt(svg.style('width')),
    height = parseInt(svg.style('height')),
    aspect = width / height;

  svg
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMinYMid')
    .call(resize);

  d3.select(window).on('resize.' + container.attr('id'), resize);

  function resize() {
    const targetWidth = parseInt(container.style('width'));
    svg.attr('width', targetWidth);
    svg.attr('height', Math.round(targetWidth / aspect));
  }
}
