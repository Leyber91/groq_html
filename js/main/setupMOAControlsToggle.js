// src/setupMOAControlsToggle.js

/**
 * Sets up the toggle functionality for the MOA (Method of Action) controls.
 * 
 * This function does the following:
 * 1. Retrieves DOM elements for the toggle button, controls container, and interface.
 * 2. Adds a click event listener to the toggle button.
 * 3. Toggles visibility and appearance of the controls when the button is clicked.
 * 4. Initializes the controls as expanded.
 * 
 * Usage example:
 * import { setupMOAControlsToggle } from './setupMOAControlsToggle.js';
 * setupMOAControlsToggle();
 * 
 * Files that use this function:
 * - js/main.js (assumed main entry point)
 * 
 * Role in overall program logic:
 * This function is responsible for managing the user interface for the MOA controls.
 * It allows users to show/hide the controls, improving the user experience by providing
 * a cleaner interface when the controls are not needed.
 */
export function setupMOAControlsToggle() {
    // Get references to the necessary DOM elements
    const toggleButton = document.getElementById('toggle-moa-controls');
    const moaControlsContainer = document.getElementById('moa-controls-container');
    const moaInterface = document.getElementById('moa-interface');

    // Check if all required elements exist in the DOM
    if (toggleButton && moaControlsContainer && moaInterface) {
        // Add click event listener to the toggle button
        toggleButton.addEventListener('click', () => {
            // Toggle CSS classes for visual changes
            moaControlsContainer.classList.toggle('collapsed');
            toggleButton.classList.toggle('collapsed');
            moaInterface.classList.toggle('controls-collapsed');
            
            // Update UI based on the collapsed state
            if (moaControlsContainer.classList.contains('collapsed')) {
                // If collapsed, update button text and hide controls
                toggleButton.textContent = '▼';
                moaControlsContainer.style.transform = 'translateY(-100%)';
                moaControlsContainer.style.opacity = '0';
            } else {
                // If expanded, update button text and show controls
                toggleButton.textContent = '▲';
                moaControlsContainer.style.transform = 'translateY(0)';
                moaControlsContainer.style.opacity = '1';
            }
            
            // Trigger a resize event to update the diagram
            // This ensures that any responsive elements adjust to the new layout
            window.dispatchEvent(new Event('resize'));
        });

        // Initialize the controls as expanded
        toggleButton.textContent = '▲';
    }
}
