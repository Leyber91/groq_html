import { moaConfig, availableModels, updateMOAConfig } from '../config/config.js';
import { chatWithMOA } from '../chat/chat.js';
import { createMOADiagram, updateDiagram, addLayer, addAgent, removeLayer, removeAgent } from '../diagram/diagram.js';

function syncDiagramWithConfig() {
  const svg = d3.select('#moa-diagram svg');
  svg.selectAll('*').remove(); // Clear existing diagram

  moaConfig.layers.forEach((layer, layerIndex) => {
    layer.forEach((agent, agentIndex) => {
      const nodeId = `layer${layerIndex}_agent${agentIndex}`;
      const agentNode = svg.append('g')
        .attr('id', nodeId)
        .attr('class', 'agent-node');
      
      // Add circle and text elements for the agent
      agentNode.append('circle')
        .attr('r', 20)
        .attr('cx', (agentIndex + 1) * 100)
        .attr('cy', (layerIndex + 1) * 100);
      
      agentNode.append('text')
        .attr('x', (agentIndex + 1) * 100)
        .attr('y', (layerIndex + 1) * 100)
        .text(`L${layerIndex}A${agentIndex}`);
    });
  });
}




async function initializeApp() {
    const diagramContainer = document.getElementById('moa-diagram');
    if (!diagramContainer) {
        console.error('Diagram container not found');
        return;
    }

    await loadMOAConfig();

    if (!moaConfig || !moaConfig.layers || moaConfig.layers.length === 0) {
        console.error('MOA configuration is not properly loaded');
        return;
    }

    createMOADiagram();
    syncDiagramWithConfig();
    setupMainModelControls();
    setupAdaptiveThresholdControls();
    setupChatInterface();
    setupMOAControlsToggle();
    setupDiagramControls();
    updateMOAControls();
}

async function loadMOAConfig() {
    // Add logic here to load the MOA configuration from a server or local storage
    // For example:
    // const config = await fetchMOAConfigFromServer();
    // updateMOAConfig(config);
    
    // For now, we'll just wait a short time to simulate loading
    await new Promise(resolve => setTimeout(resolve, 500));
}

function setupMainModelControls() {
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

export function setupAdaptiveThresholdControls() {
    const controls = document.getElementById('moa-controls');
    if (!controls) {
        console.warn('MOA controls not found. Some features may not work.');
        return;
    }

    const processingTime = controls.querySelector('#processing-time');
    const processingTimeValue = controls.querySelector('#processing-time-value');
    const outputQuality = controls.querySelector('#output-quality');
    const outputQualityValue = controls.querySelector('#output-quality-value');
    const maxRetries = controls.querySelector('#max-retries');
    const backoffFactor = controls.querySelector('#backoff-factor');
    const dynamicAdjustment = controls.querySelector('#dynamic-adjustment');
    const adaptiveThresholdControls = controls.querySelector('#adaptive-threshold-controls');

    const missingElements = [];
    if (!processingTime) missingElements.push('processing-time');
    if (!processingTimeValue) missingElements.push('processing-time-value');
    if (!outputQuality) missingElements.push('output-quality');
    if (!outputQualityValue) missingElements.push('output-quality-value');
    if (!maxRetries) missingElements.push('max-retries');
    if (!backoffFactor) missingElements.push('backoff-factor');
    if (!dynamicAdjustment) missingElements.push('dynamic-adjustment');
    if (!adaptiveThresholdControls) missingElements.push('adaptive-threshold-controls');

    if (missingElements.length > 0) {
        console.warn(`Some adaptive threshold control elements are missing: ${missingElements.join(', ')}`);
        return;
    }

    // Set initial values
    processingTime.value = moaConfig.adaptive_threshold.processing_time;
    processingTimeValue.textContent = moaConfig.adaptive_threshold.processing_time;
    outputQuality.value = moaConfig.adaptive_threshold.output_quality;
        outputQualityValue.textContent = moaConfig.adaptive_threshold.output_quality;
    maxRetries.value = moaConfig.adaptive_threshold.max_retries;
    backoffFactor.value = moaConfig.adaptive_threshold.backoff_factor;
    dynamicAdjustment.value = moaConfig.adaptive_threshold.dynamic_adjustment;

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

function setupMOAControlsToggle() {
    const toggleButton = document.getElementById('toggle-moa-controls');
    const moaControlsContainer = document.getElementById('moa-controls-container');
    const moaInterface = document.getElementById('moa-interface');

    if (toggleButton && moaControlsContainer && moaInterface) {
        toggleButton.addEventListener('click', () => {
            moaControlsContainer.classList.toggle('collapsed');
            toggleButton.classList.toggle('collapsed');
            moaInterface.classList.toggle('controls-collapsed');
            
            if (moaControlsContainer.classList.contains('collapsed')) {
                toggleButton.textContent = '▼';
                moaControlsContainer.style.transform = 'translateY(-100%)';
                moaControlsContainer.style.opacity = '0';
            } else {
                toggleButton.textContent = '▲';
                moaControlsContainer.style.transform = 'translateY(0)';
                moaControlsContainer.style.opacity = '1';
            }
            
            // Trigger a resize event to update the diagram
            window.dispatchEvent(new Event('resize'));
        });

        // Initialize the controls as expanded
        toggleButton.textContent = '▲';
    }
}

function updateMOAControls() {
    const layersContainer = document.getElementById('moa-controls');
    if (!layersContainer) {
        console.error('MOA controls container not found');
        return;
    }




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

document.addEventListener('DOMContentLoaded', async function() {
    try {
        await initializeApp();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
});