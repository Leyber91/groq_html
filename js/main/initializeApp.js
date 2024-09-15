// src/initializeApp.js
import { moaConfig } from '../config/config.js';
import { createMOADiagram } from '../diagram/diagram.js';
import { syncDiagramWithConfig } from './syncDiagram.js';
import { loadMOAConfig } from './loadMOAConfig.js';

export async function initializeApp() {
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
}
