// src/updateMOAControls.js
import { moaConfig } from '../config/config.js';
import { updateDiagram } from '../diagram/diagram.js';

export function updateMOAControls() {
    const layersContainer = document.getElementById('moa-controls');
    if (!layersContainer) {
        console.error('MOA controls container not found');
        return;
    }

    // Remove existing event listeners to prevent duplicates
    document.querySelectorAll('.agent-model, .agent-temperature').forEach(el => {
        el.replaceWith(el.cloneNode(true));
    });

    // Add event listeners to the new controls
    document.querySelectorAll('.agent-model, .agent-temperature').forEach(el => {
        el.addEventListener('change', handleControlChange);
    });
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
