import { moaConfig, updateMOAConfig } from '../config/config.js';
import { createMOADiagram, updateDiagram } from '../old/diagram.js';

export function addLayer() {
    moaConfig.layers.push([{ model_name: moaConfig.default_model, temperature: 0.5 }]);
    updateMOAConfig();
    createMOADiagram();
}

export function addAgent(layerIndex) {
    moaConfig.layers[layerIndex].push({ model_name: moaConfig.default_model, temperature: 0.5 });
    updateMOAConfig();
    createMOADiagram();
}

export function removeLayer(layerIndex) {
    if (moaConfig.layers.length > 1) {
        moaConfig.layers.splice(layerIndex, 1);
        updateMOAConfig();
        createMOADiagram();
    }
}

export function removeAgent(layerIndex, agentIndex) {
    if (moaConfig.layers[layerIndex].length > 1) {
        moaConfig.layers[layerIndex].splice(agentIndex, 1);
        updateMOAConfig();
        createMOADiagram();
    }
}

export function updateAgentModel(layerIndex, agentIndex, modelName) {
    moaConfig.layers[layerIndex][agentIndex].model_name = modelName;
    updateMOAConfig();
    updateDiagram();
}

export function updateAgentTemperature(layerIndex, agentIndex, temperature) {
    moaConfig.layers[layerIndex][agentIndex].temperature = parseFloat(temperature);
    updateMOAConfig();
    updateDiagram();
}

export function rearrangeAgents(sourceLayerIndex, sourceAgentIndex, targetLayerIndex, targetAgentIndex) {
    const agent = moaConfig.layers[sourceLayerIndex].splice(sourceAgentIndex, 1)[0];
    moaConfig.layers[targetLayerIndex].splice(targetAgentIndex, 0, agent);
    updateMOAConfig();
    createMOADiagram();
}

export function optimizeLayout() {
    // Implement layout optimization logic here
    // This could involve adjusting node positions for better visualization
    createMOADiagram();
}

export function exportDiagram() {
    const svg = document.querySelector('#moa-diagram svg');
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'moa_diagram.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
