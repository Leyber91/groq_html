import { moaConfig, availableModels, updateMOAConfig } from '../config/config.js';
import { chatWithMOA } from '../chat/chat.js';
import { createMOADiagram, updateDiagram, addLayer, addAgent, removeLayer, removeAgent } from '../diagram/diagram.js';

function initializeApp() {
    const diagramContainer = document.getElementById('moa-diagram');
    if (!diagramContainer) {
        console.error('Diagram container not found');
        return;
    }

    // Create the initial MOA diagram
    createMOADiagram();

    setupMainModelControls();
    setupAdaptiveThresholdControls();
    setupChatInterface();
    setupDiagramControls();
    setupMOAControlsToggle();
    updateMOAControls(); // Add this line to update MOA controls with available models
}

function setupMainModelControls() {
    const mainModelSelect = document.getElementById('main-model-select');
    const mainTemperature = document.getElementById('main-temperature');
    const mainTemperatureValue = document.getElementById('main-temperature-value');

    if (!mainModelSelect || !mainTemperature || !mainTemperatureValue) {
        console.error('Main model control elements not found');
        return;
    }

    // Populate main model select
    mainModelSelect.innerHTML = availableModels.map(model => 
        `<option value="${model}" ${model === moaConfig.main_model ? 'selected' : ''}>${model}</option>`
    ).join('');

    // Set initial values
    mainTemperature.value = moaConfig.main_temperature;
    mainTemperatureValue.textContent = moaConfig.main_temperature.toFixed(2);

    // Add event listeners
    mainModelSelect.addEventListener('change', (e) => {
        updateMOAConfig({ main_model: e.target.value });
        createMOADiagram();
    });

    mainTemperature.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        mainTemperatureValue.textContent = value.toFixed(2);
        updateMOAConfig({ main_temperature: value });
        createMOADiagram();
    });
}

function setupAdaptiveThresholdControls() {
    const controls = document.getElementById('adaptive-threshold-controls');
    if (!controls) {
        console.warn('Adaptive threshold controls not found. Some features may not work.');
        return;
    }

    const adaptiveThreshold = controls.querySelector('#adaptive-threshold');
    const processingTime = controls.querySelector('#processing-time');
    const processingTimeValue = controls.querySelector('#processing-time-value');
    const outputQuality = controls.querySelector('#output-quality');
    const outputQualityValue = controls.querySelector('#output-quality-value');

    const missingElements = [];
    if (!adaptiveThreshold) missingElements.push('adaptive-threshold');
    if (!processingTime) missingElements.push('processing-time');
    if (!processingTimeValue) missingElements.push('processing-time-value');
    if (!outputQuality) missingElements.push('output-quality');
    if (!outputQualityValue) missingElements.push('output-quality-value');

    if (missingElements.length > 0) {
        console.warn(`Some adaptive threshold control elements are missing: ${missingElements.join(', ')}`);
        return;
    }

    // Set initial values
    processingTime.value = moaConfig.adaptive_threshold.processing_time;
    processingTimeValue.textContent = moaConfig.adaptive_threshold.processing_time;
    outputQuality.value = moaConfig.adaptive_threshold.output_quality;
    outputQualityValue.textContent = moaConfig.adaptive_threshold.output_quality;

    // Add event listeners
    processingTime.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        processingTimeValue.textContent = value;
        updateMOAConfig({ adaptive_threshold: { ...moaConfig.adaptive_threshold, processing_time: value } });
        updateDiagram();
    });

    outputQuality.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        outputQualityValue.textContent = value;
        updateMOAConfig({ adaptive_threshold: { ...moaConfig.adaptive_threshold, output_quality: value } });
        updateDiagram();
    });
}

function setupChatInterface() {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-message');

    if (!userInput || !sendButton) {
        console.error('Chat interface elements not found');
        return;
    }

    sendButton.addEventListener('click', () => {
        const message = userInput.value.trim();
        if (message) {
            chatWithMOA(message);
            userInput.value = '';
        }
    });

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendButton.click();
        }
    });
}

function setupDiagramControls() {
    const moaDiagram = document.getElementById('moa-diagram');
    const moaControlsContainer = document.getElementById('moa-controls-container');

    if (!moaDiagram || !moaControlsContainer) {
        console.error('Diagram or controls container not found');
        return;
    }

    const addLayerButton = document.getElementById('add-layer-button');
    const addAgentButton = document.getElementById('add-agent-button');
    const removeLayerButton = document.getElementById('remove-layer-button');
    const removeAgentButton = document.getElementById('remove-agent-button');

    const missingElements = [];
    [
        { el: addLayerButton, name: 'add-layer-button' },
        { el: addAgentButton, name: 'add-agent-button' },
        { el: removeLayerButton, name: 'remove-layer-button' },
        { el: removeAgentButton, name: 'remove-agent-button' }
    ].forEach(item => {
        if (!item.el) missingElements.push(item.name);
    });

    if (missingElements.length > 0) {
        console.warn(`Some control elements are missing: ${missingElements.join(', ')}`);
    }

    if (addLayerButton) {
        addLayerButton.addEventListener('click', () => {
            addLayer();
            updateDiagram();
            updateMOAControls(); // Update controls after adding a layer
        });
    }

    if (addAgentButton) {
        addAgentButton.addEventListener('click', () => {
            const lastLayerIndex = moaConfig.layers.length - 1;
            addAgent(lastLayerIndex);
            updateDiagram();
            updateMOAControls(); // Update controls after adding an agent
        });
    }

    if (removeLayerButton) {
        removeLayerButton.addEventListener('click', () => {
            const lastLayerIndex = moaConfig.layers.length - 1;
            removeLayer(lastLayerIndex);
            updateDiagram();
            updateMOAControls(); // Update controls after removing a layer
        });
    }

    if (removeAgentButton) {
        removeAgentButton.addEventListener('click', () => {
            const lastLayerIndex = moaConfig.layers.length - 1;
            const lastAgentIndex = moaConfig.layers[lastLayerIndex].length - 1;
            removeAgent(lastLayerIndex, lastAgentIndex);
            updateDiagram();
            updateMOAControls(); // Update controls after removing an agent
        });
    }
}

function setupMOAControlsToggle() {
    const toggleButton = document.getElementById('toggle-moa-controls');
    const moaControlsContainer = document.getElementById('moa-controls-container');
    const moaInterface = document.getElementById('moa-interface');
    const moaDiagram = document.getElementById('moa-diagram');

    if (toggleButton && moaControlsContainer && moaInterface && moaDiagram) {
        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleControls();
        });

        // Prevent closing when clicking inside the controls
        moaControlsContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Close controls when clicking outside
        moaDiagram.addEventListener('click', (e) => {
            if (!moaControlsContainer.contains(e.target) && e.target !== toggleButton) {
                closeControls();
            }
        });

        function toggleControls() {
            moaControlsContainer.classList.toggle('expanded');
            if (moaControlsContainer.classList.contains('expanded')) {
                toggleButton.textContent = 'Hide Controls';
            } else {
                closeControls();
            }
        }

        function closeControls() {
            moaControlsContainer.classList.remove('expanded');
            toggleButton.textContent = 'Show Controls';
        }

        // Initialize the controls as hidden
        closeControls();
    }
}

function setupMOAControlsWrapper() {
    const moaControlsWrapper = document.getElementById('moa-controls-wrapper');
    if (moaControlsWrapper) {
        moaControlsWrapper.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
}   

function setupMOAControls() {
    const moaControls = document.getElementById('moa-controls');
    if (moaControls) {
        moaControls.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
}   

function updateMOAControls() {
    const layersContainer = document.getElementById('moa-layers-container');
    if (!layersContainer) {
        console.error('MOA layers container not found');
        return;
    }

    // Clear existing controls
    layersContainer.innerHTML = '';

    // Create controls for each layer and agent
    moaConfig.layers.forEach((layer, layerIndex) => {
        const layerDiv = document.createElement('div');
        layerDiv.className = 'moa-layer';
        layerDiv.innerHTML = `<h3>Layer ${layerIndex + 1}</h3>`;

        layer.forEach((agent, agentIndex) => {
            const agentDiv = document.createElement('div');
            agentDiv.className = 'moa-agent';
            agentDiv.innerHTML = `
                <h4>Agent ${agentIndex + 1}</h4>
                <select class="agent-model" data-layer="${layerIndex}" data-agent="${agentIndex}">
                    ${availableModels.map(model => `<option value="${model}" ${model === agent.model_name ? 'selected' : ''}>${model}</option>`).join('')}
                </select>
                <input type="range" class="agent-temperature" min="0" max="1" step="0.1" value="${agent.temperature}" data-layer="${layerIndex}" data-agent="${agentIndex}">
                <span class="temperature-value">${agent.temperature.toFixed(1)}</span>
            `;
            layerDiv.appendChild(agentDiv);
        });

        layersContainer.appendChild(layerDiv);
    });

    // Add event listeners to the new controls
    document.querySelectorAll('.agent-model, .agent-temperature').forEach(el => {
        el.addEventListener('change', (e) => {
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
        });
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);