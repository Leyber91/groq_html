// src/initializeApp.js
import { moaConfig } from '../config/config.js';
import { createMOADiagram } from '../diagram/diagram.js';
import { syncDiagramWithConfig } from './syncDiagram.js';
import { loadMOAConfig } from './loadMOAConfig.js';
import { waitForGroqInitialization } from '../chat/groqIntegration.js';
import { logger } from '../utils/logger.js';

/**
 * Initializes the application by setting up the MOA diagram and related components.
 * 
 * This function performs the following steps:
 * 1. Checks for the presence of the diagram container in the DOM.
 * 2. Initializes the Groq integration.
 * 3. Loads the MOA configuration.
 * 4. Validates the loaded configuration.
 * 5. Creates the MOA diagram.
 * 
 * If any step fails, it logs an error and may display a message to the user.
 * 
 * Usage example:
 * ```
 * import { initializeApp } from './initializeApp.js';
 * 
 * document.addEventListener('DOMContentLoaded', () => {
 *     initializeApp().catch(error => console.error('Failed to initialize app:', error));
 * });
 * ```
 * 
 * Files that use this function:
 * - src/index.js (likely the main entry point of the application)
 * - src/app.js (if there's a main App component)
 * 
 * Role in overall program logic:
 * This function serves as the primary initialization point for the application.
 * It ensures that all necessary components and data are properly set up before
 * the user can interact with the MOA diagram. It's crucial for establishing the
 * application's initial state and preparing the UI for user interaction.
 */
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
