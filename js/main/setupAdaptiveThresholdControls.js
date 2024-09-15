// src/setupAdaptiveThresholdControls.js
import { moaConfig, updateMOAConfig } from '../config/config.js';
import { updateDiagram } from '../diagram/diagram.js';

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
