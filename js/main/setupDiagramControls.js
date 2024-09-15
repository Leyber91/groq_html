// src/setupDiagramControls.js
import { addLayer, addAgent, removeLayer, removeAgent, createMOADiagram } from '../diagram/diagram.js';
import { moaConfig } from '../config/config.js';
import { updateMOAControls } from './updateMOAControls.js';

export function setupDiagramControls() {
    const moaDiagram = document.getElementById('moa-diagram');
    const moaControls = document.getElementById('moa-controls');

    if (!moaDiagram || !moaControls) {
        console.error('Diagram or controls container not found');
        return;
    }

    const addLayerButton = document.getElementById('add-layer-button');
    const addAgentButton = document.getElementById('add-agent-button');
    const removeLayerButton = document.getElementById('remove-layer-button');
    const removeAgentButton = document.getElementById('remove-agent-button');

    if (addLayerButton) {
        addLayerButton.addEventListener('click', () => {
            addLayer();
            createMOADiagram(); // Use createMOADiagram instead of updateDiagram
            updateMOAControls();
        });
    }

    if (addAgentButton) {
        addAgentButton.addEventListener('click', () => {
            const lastLayerIndex = moaConfig.layers.length - 1;
            addAgent(lastLayerIndex);
            createMOADiagram(); // Use createMOADiagram instead of updateDiagram
            updateMOAControls();
        });
    }

    if (removeLayerButton) {
        removeLayerButton.addEventListener('click', () => {
            const lastLayerIndex = moaConfig.layers.length - 1;
            removeLayer(lastLayerIndex);
            createMOADiagram(); // Use createMOADiagram instead of updateDiagram
            updateMOAControls();
        });
    }

    if (removeAgentButton) {
        removeAgentButton.addEventListener('click', () => {
            const lastLayerIndex = moaConfig.layers.length - 1;
            const lastAgentIndex = moaConfig.layers[lastLayerIndex].length - 1;
            removeAgent(lastLayerIndex, lastAgentIndex);
            createMOADiagram(); // Use createMOADiagram instead of updateDiagram
            updateMOAControls();
        });
    }
}
