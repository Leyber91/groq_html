// src/setupMainModelControls.js
import { moaConfig, availableModels, updateMOAConfig } from '../config/config.js';
import { createMOADiagram } from '../diagram/diagram.js';
import { updateMOAControls } from './updateMOAControls.js';
import { updateDiagram } from '../diagram/diagram.js';
import { MetaPromptManager } from '../utils/metaPromptManager.js'; // Updated import path

export function setupMainModelControls() {
    const elements = getMainModelControlElements();
    if (!elements) return;

    populateMainModelSelect(elements.mainModelSelect);
    setInitialValues(elements);
    addEventListeners(elements);
}

function getMainModelControlElements() {
    const mainModelSelect = document.getElementById('main-model-select');
    const mainTemperature = document.getElementById('main-temperature');
    const mainTemperatureValue = document.getElementById('main-temperature-value');
    const adaptiveThresholdControls = document.getElementById('adaptive-threshold-controls');

    if (!mainModelSelect || !mainTemperature || !mainTemperatureValue || !adaptiveThresholdControls) {
        console.error('Main model control elements not found');
        return null;
    }

    return { mainModelSelect, mainTemperature, mainTemperatureValue, adaptiveThresholdControls };
}

function populateMainModelSelect(mainModelSelect) {
    mainModelSelect.innerHTML = availableModels.map(model => 
        `<option value="${model}" ${model === moaConfig.main_model ? 'selected' : ''}>${model}</option>`
    ).join('');
}

function setInitialValues({ mainTemperature, mainTemperatureValue, adaptiveThresholdControls }) {
    mainTemperature.value = moaConfig.main_temperature;
    mainTemperatureValue.textContent = moaConfig.main_temperature.toFixed(2);
    adaptiveThresholdControls.value = moaConfig.adaptive_threshold;
}

function addEventListeners({ mainModelSelect, mainTemperature, mainTemperatureValue, adaptiveThresholdControls }) {
    mainModelSelect.addEventListener('change', (e) => {
        updateMOAConfig({ main_model: e.target.value });
        createMOADiagram();
        updateMOAControls();
    });

    mainTemperature.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        mainTemperatureValue.textContent = value.toFixed(2);
        updateMOAConfig({ main_temperature: value });
        createMOADiagram();
    });

    adaptiveThresholdControls.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        adaptiveThresholdControls.value = value;
        updateMOAConfig({ adaptive_threshold: value });
        updateDiagram();
    });
}
