// src/updateMOAControls.js
import { moaConfig } from '../config/config.js';
import { updateDiagram } from '../diagram/diagram.js';
import { AVAILABLE_MODELS } from '../config/model-config.js';

/**
 * Updates the MOA (Method of Action) controls in the user interface.
 * 
 * This function performs the following steps:
 * 1. Retrieves the container element for MOA controls.
 * 2. Checks if the container exists, logging an error if not found.
 * 
 * Usage example:
 * import { updateMOAControls } from './updateMOAControls.js';
 * updateMOAControls();
 * 
 * Files that use this function:
 * - js/main/setupMainModelControls.js
 * - js/main/app.js (assumed)
 * 
 * Role in overall program logic:
 * This function is responsible for refreshing the MOA controls in the UI
 * to reflect the current state of the moaConfig. It's typically called
 * after changes to the configuration to ensure the UI stays in sync.
 */
export function updateMOAControls() {
    const layersContainer = document.getElementById('moa-controls');
    if (!layersContainer) {
        console.error('MOA controls container not found');
        return;
    }

}

/**
 * Handles changes to MOA control inputs.
 * 
 * This function performs the following steps:
 * 1. Extracts layer and agent indices from the event target.
 * 2. Determines the value and key (model_name or temperature) based on the input type.
 * 3. Updates the moaConfig with the new value.
 * 4. Updates the temperature display if necessary.
 * 5. Triggers an update of the MOA diagram.
 * 
 * Usage example:
 * someInputElement.addEventListener('change', handleControlChange);
 * 
 * Files that use this function:
 * - js/main/updateMOAControls.js (current file, used in event listeners)
 * 
 * Role in overall program logic:
 * This function is crucial for maintaining synchronization between the UI controls
 * and the underlying configuration. It ensures that user interactions with the
 * controls are immediately reflected in the configuration and visual representation.
 * 
 * @param {Event} e - The event object from the control change.
 */
function handleControlChange(e) {
    const layerIndex = parseInt(e.target.dataset.layer);
    const agentIndex = parseInt(e.target.dataset.agent);
    const value = e.target.type === 'range' ? parseFloat(e.target.value) : e.target.value;
    const key = e.target.classList.contains('agent-model') ? 'model_name' : 'temperature';

    // Update the moaConfig
    moaConfig.layers[layerIndex][agentIndex][key] = value;

    // Update the temperature display if needed
    if (key === 'temperature') {
        e.target.nextElementSibling.textContent = value.toFixed(1);
    }

    // Update the diagram
    updateDiagram();
}

// Call updateMOAControls when the configuration changes
window.addEventListener('moaConfigUpdated', updateMOAControls);
