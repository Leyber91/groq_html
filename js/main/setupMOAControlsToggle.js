// src/setupMOAControlsToggle.js
export function setupMOAControlsToggle() {
    const toggleButton = document.getElementById('toggle-moa-controls');
    const moaControlsContainer = document.getElementById('moa-controls-container');
    const moaInterface = document.getElementById('moa-interface');

    if (toggleButton && moaControlsContainer && moaInterface) {
        toggleButton.addEventListener('click', () => {
            moaControlsContainer.classList.toggle('collapsed');
            toggleButton.classList.toggle('collapsed');
            moaInterface.classList.toggle('controls-collapsed');
            
            if (moaControlsContainer.classList.contains('collapsed')) {
                toggleButton.textContent = '▼';
                moaControlsContainer.style.transform = 'translateY(-100%)';
                moaControlsContainer.style.opacity = '0';
            } else {
                toggleButton.textContent = '▲';
                moaControlsContainer.style.transform = 'translateY(0)';
                moaControlsContainer.style.opacity = '1';
            }
            
            // Trigger a resize event to update the diagram
            window.dispatchEvent(new Event('resize'));
        });

        // Initialize the controls as expanded
        toggleButton.textContent = '▲';
    }
}
