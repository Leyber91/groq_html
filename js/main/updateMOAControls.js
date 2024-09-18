// src/updateMOAControls.js
import { moaConfig } from '../config/config.js';
import { updateDiagram } from '../diagram/diagram.js';
import { AVAILABLE_MODELS } from '../config/model-config.js';

export function updateMOAControls() {
    const layersContainer = document.getElementById('moa-controls');
    if (!layersContainer) {
        console.error('MOA controls container not found');
        return;
    }

}

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
