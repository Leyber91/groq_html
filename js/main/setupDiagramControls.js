// src/setupDiagramControls.js
import { addLayer, addAgent, removeLayer, removeAgent, createMOADiagram } from '../diagram/diagram.js';
import { moaConfig } from '../config/config.js';

/**
 * Sets up the diagram controls for the MOA (Multi-Objective Architecture) diagram.
 * 
 * This function initializes event listeners for buttons that manipulate the MOA diagram.
 * It handles adding/removing layers and agents, and updates the diagram accordingly.
 * 
 * How it works:
 * 1. Retrieves DOM elements for the diagram and controls.
 * 2. Checks if these elements exist, logging an error if not.
 * 3. Gets references to the add/remove layer/agent buttons.
 * 4. Sets up click event listeners for each button, calling appropriate functions.
 * 
 * Usage example:
 * setupDiagramControls();
 * 
 * Files that use this function:
 * - js/main/main.js (assumed main entry point)
 * 
 * Role in overall program logic:
 * This function is crucial for setting up the user interface controls that allow
 * manipulation of the MOA diagram. It bridges the gap between user interactions
 * and the underlying diagram logic, enabling dynamic updates to the diagram structure.
 */
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

        });
    }

    if (addAgentButton) {
        addAgentButton.addEventListener('click', () => {
            const lastLayerIndex = moaConfig.layers.length - 1;
            addAgent(lastLayerIndex);
            createMOADiagram(); // Use createMOADiagram instead of updateDiagram

        });
    }

    if (removeLayerButton) {
        removeLayerButton.addEventListener('click', () => {
            const lastLayerIndex = moaConfig.layers.length - 1;
            removeLayer(lastLayerIndex);
            createMOADiagram(); // Use createMOADiagram instead of updateDiagram

        });
    }

    if (removeAgentButton) {
        removeAgentButton.addEventListener('click', () => {
            const lastLayerIndex = moaConfig.layers.length - 1;
            const lastAgentIndex = moaConfig.layers[lastLayerIndex].length - 1;
            removeAgent(lastLayerIndex, lastAgentIndex);
            createMOADiagram(); // Use createMOADiagram instead of updateDiagram

        });
    }
}
