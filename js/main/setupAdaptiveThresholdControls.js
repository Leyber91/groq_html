// src/setupAdaptiveThresholdControls.js
import { moaConfig, updateMOAConfig } from '../config/config.js';
import { updateDiagram } from '../diagram/diagram.js';

/**
 * Sets up the controls for the adaptive threshold feature of the MOA.
 * 
 * This function:
 * 1. Retrieves DOM elements for adaptive threshold controls
 * 2. Checks for missing elements and logs warnings if any are not found
 * 3. Initializes control values based on the current MOA configuration
 * 4. Sets up event listeners to update the MOA configuration when controls are changed
 * 
 * Usage example:
 * setupAdaptiveThresholdControls();
 * 
 * Other files that use this function:
 * - js/main/main.js (likely called during application initialization)
 * 
 * Role in overall program logic:
 * This function is crucial for allowing users to fine-tune the adaptive threshold
 * parameters of the MOA. It provides a way to adjust processing time, output quality,
 * retry settings, and dynamic adjustment, which directly impact how the MOA adapts
 * to different inputs and processing conditions.
 */
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
    dynamicAdjustment.checked = moaConfig.adaptive_threshold.dynamic_adjustment;

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

    maxRetries.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        updateMOAConfig({ adaptive_threshold: { ...moaConfig.adaptive_threshold, max_retries: value } });
    });

    backoffFactor.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        updateMOAConfig({ adaptive_threshold: { ...moaConfig.adaptive_threshold, backoff_factor: value } });
    });

    dynamicAdjustment.addEventListener('change', (e) => {
        const value = e.target.checked;
        updateMOAConfig({ adaptive_threshold: { ...moaConfig.adaptive_threshold, dynamic_adjustment: value } });
    });
}
