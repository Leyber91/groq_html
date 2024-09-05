// Import configurations from other files
import { RATE_LIMITS, AVAILABLE_MODELS, MODEL_INFO } from './model-config.js';
import { MOA_CONFIG, getLayerConfig, getMainModelConfig } from './moa-config.js';
import { API_CONFIG, SYSTEM_SETTINGS, ENVIRONMENT, isProduction, getApiKey } from './system-config.js';

// Export configurations from other files
export const rateLimits = RATE_LIMITS;
export const availableModels = AVAILABLE_MODELS;
export const modelInfo = MODEL_INFO;
export const moaConfig = MOA_CONFIG;
export const systemSettings = SYSTEM_SETTINGS;

// Export API configuration
export const API_ENDPOINT = API_CONFIG.ENDPOINT;
export const API_KEY = getApiKey();

// Ensure that the moaConfig is properly initialized
if (!moaConfig.connections) {
    moaConfig.connections = [];
}

// Update the updateMOAConfig function
export function updateMOAConfig(newConfig = {}) {
    if (!isValidConfig(newConfig)) {
        throw new Error('Invalid MOA configuration');
    }

    Object.assign(MOA_CONFIG, deepMerge(MOA_CONFIG, newConfig));

    if (MOA_CONFIG.main_model && RATE_LIMITS[MOA_CONFIG.main_model]) {
        MOA_CONFIG.rate_limit = RATE_LIMITS[MOA_CONFIG.main_model];
    }

    if (newConfig.adaptive_threshold) {
        recalculateAdaptiveThresholds();
    }

    if (newConfig.visualization) {
        updateVisualizationSettings();
    }

    // Ensure this function is defined and imported from diagram.js
    if (typeof updateMOADiagram === 'function') {
        updateMOADiagram();
    } else {
        console.warn('updateMOADiagram function is not defined');
    }

    const event = new CustomEvent('moaConfigUpdated', { detail: MOA_CONFIG });
    window.dispatchEvent(event);

    console.log('MOA configuration updated:', MOA_CONFIG);
}

// Helper functions
function deepMerge(target, source) {
    const output = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) Object.assign(output, { [key]: source[key] });
                else output[key] = deepMerge(target[key], source[key]);
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}

function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

function isValidConfig(config) {
    // Add validation logic here
    // Check if the main_model is in the list of available models
    if (config.main_model && !AVAILABLE_MODELS.includes(config.main_model)) {
        return false;
    }
    
    // Check if the layers are properly configured
    if (config.layers) {
        for (const layer of config.layers) {
            for (const agent of layer) {
                if (!AVAILABLE_MODELS.includes(agent.model_name)) {
                    return false;
                }
                if (typeof agent.temperature !== 'number' || agent.temperature < 0 || agent.temperature > 1) {
                    return false;
                }
            }
        }
    }

    // Add more checks as needed

    return true;
}

function recalculateAdaptiveThresholds() {
    // Implement logic to recalculate adaptive thresholds
    const { processing_time, output_quality } = MOA_CONFIG.adaptive_threshold;
    
    // Example: Adjust thresholds based on the current configuration
    const newProcessingTime = processing_time * (MOA_CONFIG.layers.length / 2);
    const newOutputQuality = Math.min(output_quality * 1.1, 1.0);

    MOA_CONFIG.adaptive_threshold = {
        processing_time: newProcessingTime,
        output_quality: newOutputQuality
    };

    console.log('Recalculated adaptive thresholds:', MOA_CONFIG.adaptive_threshold);
}

function updateVisualizationSettings() {
    // Implement logic to update visualization settings
    const { update_interval } = MOA_CONFIG.visualization;

    // Example: Adjust update interval based on the number of layers
    const newUpdateInterval = update_interval + (MOA_CONFIG.layers.length * 1000);

    MOA_CONFIG.visualization = {
        update_interval: newUpdateInterval
    };

    console.log('Updated visualization settings:', MOA_CONFIG.visualization);
}

function updateMOADiagram() {
    // Implement logic to update the MOA diagram
    console.log('Updating MOA diagram with new configuration:', MOA_CONFIG);
    // Here you would typically update a visual representation of the MOA
    // This could involve manipulating DOM elements or updating a canvas
}

// Export utility functions
export { getLayerConfig, getMainModelConfig, isProduction };

// Export environment
export const environment = ENVIRONMENT;

// Add this to the moaConfig object
moaConfig.connections = [];
