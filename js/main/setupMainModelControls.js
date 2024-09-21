// src/setupMainModelControls.js
import { moaConfig, availableModels, updateMOAConfig } from '../config/config.js';
import { createMOADiagram } from '../diagram/diagram.js';
import { updateMOAControls } from './updateMOAControls.js';
import { updateDiagram } from '../diagram/diagram.js';
import { MetaPromptManager } from '../utils/metaPromptManager.js'; // Updated import path

/**
 * Sets up the main model controls in the user interface.
 * 
 * This function initializes the main model selection dropdown, temperature slider,
 * and adaptive threshold controls. It populates the controls with initial values
 * and sets up event listeners for user interactions.
 * 
 * Usage example:
 * setupMainModelControls();
 * 
 * Used in:
 * - main.js (assumed)
 * 
 * Role in program logic:
 * This function is crucial for initializing the user interface controls that allow
 * users to configure the main AI model settings. It serves as a bridge between
 * the UI and the underlying configuration and diagram update logic.
 */
export function setupMainModelControls() {
    const elements = getMainModelControlElements();
    if (!elements) return;

    populateMainModelSelect(elements.mainModelSelect);
    setInitialValues(elements);
    addEventListeners(elements);
}

/**
 * Retrieves the DOM elements for the main model controls.
 * 
 * This function finds and returns the necessary DOM elements for the main model
 * controls, including the model selection dropdown, temperature slider, and
 * adaptive threshold controls.
 * 
 * Usage example:
 * const elements = getMainModelControlElements();
 * if (elements) {
 *     // Use the elements
 * }
 * 
 * Used in:
 * - setupMainModelControls() (current file)
 * 
 * Role in program logic:
 * This function centralizes the retrieval of UI elements, making it easier to
 * manage and update the DOM references. It also provides error handling if
 * elements are not found, improving the robustness of the setup process.
 * 
 * @returns {Object|null} An object containing the DOM elements, or null if any element is not found.
 */
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

/**
 * Populates the main model selection dropdown with available models.
 * 
 * This function fills the main model select element with options based on the
 * availableModels array. It also sets the currently selected model based on
 * the moaConfig.main_model value.
 * 
 * Usage example:
 * const mainModelSelect = document.getElementById('main-model-select');
 * populateMainModelSelect(mainModelSelect);
 * 
 * Used in:
 * - setupMainModelControls() (current file)
 * 
 * Role in program logic:
 * This function is responsible for dynamically populating the model selection
 * dropdown, allowing users to choose from available AI models. It ensures that
 * the UI reflects the current configuration and available options.
 * 
 * @param {HTMLSelectElement} mainModelSelect - The select element to populate.
 */
function populateMainModelSelect(mainModelSelect) {
    mainModelSelect.innerHTML = availableModels.map(model => 
        `<option value="${model}" ${model === moaConfig.main_model ? 'selected' : ''}>${model}</option>`
    ).join('');
}

/**
 * Sets the initial values for the main model controls.
 * 
 * This function initializes the temperature slider and adaptive threshold
 * controls with values from the current moaConfig.
 * 
 * Usage example:
 * const elements = getMainModelControlElements();
 * setInitialValues(elements);
 * 
 * Used in:
 * - setupMainModelControls() (current file)
 * 
 * Role in program logic:
 * This function ensures that the UI controls reflect the current configuration
 * when the page loads or when the controls are reset. It maintains consistency
 * between the UI state and the underlying configuration.
 * 
 * @param {Object} param0 - An object containing the DOM elements.
 * @param {HTMLInputElement} param0.mainTemperature - The temperature slider element.
 * @param {HTMLElement} param0.mainTemperatureValue - The element displaying the temperature value.
 * @param {HTMLInputElement} param0.adaptiveThresholdControls - The adaptive threshold control element.
 */
function setInitialValues({ mainTemperature, mainTemperatureValue, adaptiveThresholdControls }) {
    mainTemperature.value = moaConfig.main_temperature;
    mainTemperatureValue.textContent = moaConfig.main_temperature.toFixed(2);
    adaptiveThresholdControls.value = moaConfig.adaptive_threshold;
}

/**
 * Adds event listeners to the main model control elements.
 * 
 * This function sets up event listeners for user interactions with the main
 * model controls, including model selection, temperature adjustment, and
 * adaptive threshold changes.
 * 
 * Usage example:
 * const elements = getMainModelControlElements();
 * addEventListeners(elements);
 * 
 * Used in:
 * - setupMainModelControls() (current file)
 * 
 * Role in program logic:
 * This function is crucial for handling user input and updating the configuration
 * and diagram in real-time. It ensures that changes in the UI are immediately
 * reflected in the underlying model and visual representation.
 * 
 * @param {Object} param0 - An object containing the DOM elements.
 * @param {HTMLSelectElement} param0.mainModelSelect - The model selection dropdown.
 * @param {HTMLInputElement} param0.mainTemperature - The temperature slider element.
 * @param {HTMLElement} param0.mainTemperatureValue - The element displaying the temperature value.
 * @param {HTMLInputElement} param0.adaptiveThresholdControls - The adaptive threshold control element.
 */
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