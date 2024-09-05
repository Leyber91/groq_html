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
    setupMOAControlsWrapper();
}

function setupMainModelControls() {
    const mainModelSelect = document.getElementById('main-model-select');
    const mainTemperature = document.getElementById('main-temperature');
    const mainTemperatureValue = document.getElementById('main-temperature-value');

    if (!mainModelSelect || !mainTemperature || !mainTemperatureValue) {
        console.warn('Main model controls not found. Some features may not work.');
        return;
    }

    // Populate main model select
    availableModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        mainModelSelect.appendChild(option);
    });

    // Set initial values
    mainModelSelect.value = moaConfig.main_model;
    mainTemperature.value = moaConfig.main_temperature;
    mainTemperatureValue.textContent = moaConfig.main_temperature;

    // Add event listeners
    mainModelSelect.addEventListener('change', (e) => {
        updateMOAConfig({ main_model: e.target.value });
        updateDiagram();
    });

    mainTemperature.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        mainTemperatureValue.textContent = value;
        updateMOAConfig({ main_temperature: value });
        updateDiagram();
    });
}

function setupAdaptiveThresholdControls() {
    const processingTime = document.getElementById('processing-time');
    const processingTimeValue = document.getElementById('processing-time-value');
    const outputQuality = document.getElementById('output-quality');
    const outputQualityValue = document.getElementById('output-quality-value');

    if (!processingTime || !processingTimeValue || !outputQuality || !outputQualityValue) {
        console.warn('Adaptive threshold controls not found. Some features may not work.');
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
    const addLayerButton = document.getElementById('add-layer-button');
    const addAgentButton = document.getElementById('add-agent-button');
    const removeLayerButton = document.getElementById('remove-layer-button');
    const removeAgentButton = document.getElementById('remove-agent-button');

    if (addLayerButton) {
        addLayerButton.addEventListener('click', () => {
            addLayer();
            updateDiagram();
        });
    }

    if (addAgentButton) {
        addAgentButton.addEventListener('click', () => {
            // Assuming we're adding to the last layer
            const lastLayerIndex = moaConfig.layers.length - 1;
            addAgent(lastLayerIndex);
            updateDiagram();
        });
    }

    if (removeLayerButton) {
        removeLayerButton.addEventListener('click', () => {
            // Assuming we're removing the last layer
            const lastLayerIndex = moaConfig.layers.length - 1;
            removeLayer(lastLayerIndex);
            updateDiagram();
        });
    }

    if (removeAgentButton) {
        removeAgentButton.addEventListener('click', () => {
            // Assuming we're removing from the last layer
            const lastLayerIndex = moaConfig.layers.length - 1;
            const lastAgentIndex = moaConfig.layers[lastLayerIndex].length - 1;
            removeAgent(lastLayerIndex, lastAgentIndex);
            updateDiagram();
        });
    }
}

function setupMOAControlsToggle() {
    const toggleButton = document.getElementById('toggle-moa-controls');
    const moaControlsContainer = document.getElementById('moa-controls-container');
    const moaInterface = document.getElementById('moa-interface');
    const moaDiagram = document.getElementById('moa-diagram');

    // Add styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        #moa-controls-container {
            position: absolute;
            top: 20px;
            right: 20px;
            width: 300px;
            background: rgba(44, 44, 44, 0.95);
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease-in-out;
            transform: translateX(100%);
            z-index: 1000;
        }
        #moa-controls-container.expanded {
            transform: translateX(0);
        }
        #toggle-moa-controls {
            position: absolute;
            top: 10px;
            right: 320px;
            z-index: 1001;
        }
    `;
    document.head.appendChild(style);

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
            }s
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

document.addEventListener('DOMContentLoaded', initializeApp);