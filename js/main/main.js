import { initializeThemeToggle } from './theme-toggle.js';

import { initializeApp } from './initializeApp.js';
import { syncDiagramWithConfig } from './syncDiagram.js';
import { setupMainModelControls } from './setupMainModelControls.js';
import { setupAdaptiveThresholdControls } from './setupAdaptiveThresholdControls.js';
import { setupChatInterface } from './setupChatInterface.js';
import { setupDiagramControls } from './setupDiagramControls.js';
import { setupMOAControlsToggle } from './setupMOAControlsToggle.js';
import { updateMOAControls } from './updateMOAControls.js';

document.addEventListener('DOMContentLoaded', async function() {
    try {
        await initializeApp();
        syncDiagramWithConfig();
        setupMainModelControls();
        setupAdaptiveThresholdControls();
        setupChatInterface();
        setupDiagramControls();
        setupMOAControlsToggle();
        updateMOAControls();
        initializeThemeToggle();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
});
