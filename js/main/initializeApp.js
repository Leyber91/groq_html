// src/initializeApp.js
import { moaConfig } from '../config/config.js';
import { createMOADiagram } from '../diagram/diagram.js';
import { syncDiagramWithConfig } from './syncDiagram.js';
import { loadMOAConfig } from './loadMOAConfig.js';
import { waitForGroqInitialization } from '../chat/groqIntegration.js';
import { logger } from '../utils/logger.js';

export async function initializeApp() {
    try {
        const diagramContainer = document.getElementById('moa-diagram');
        if (!diagramContainer) {
            throw new Error('Diagram container not found');
        }

        // Initialize Groq
        await waitForGroqInitialization();
        logger.info('Groq initialized successfully');

        await loadMOAConfig();

        if (!moaConfig || !moaConfig.layers || moaConfig.layers.length === 0) {
            throw new Error('MOA configuration is not properly loaded');
        }

        createMOADiagram();
        logger.info('MOA diagram created successfully');
    } catch (error) {
        logger.error('Error initializing app:', error);
        // You might want to display an error message to the user here
    }
}
