// theme-toggle.js

const themes = ['dark', 'light', 'dracula', 'cyberpunk', 'forest', 'ocean', 'upside-down', 'glitch', 'underwater', 'space-cowboy'];

/**
 * Sets the theme of the application based on the provided index.
 * 
 * This function performs the following steps:
 * 1. Retrieves the new theme from the themes array using the provided index.
 * 2. Removes all existing theme classes from the document body.
 * 3. Adds the new theme class to the document body.
 * 4. Saves the selected theme in localStorage for persistence.
 * 5. Updates the toggle button icon to reflect the new theme.
 * 
 * Usage example:
 * setTheme(2); // Sets the theme to 'dracula'
 * 
 * Files that use this function:
 * - js/main/theme-toggle.js (current file, used in initializeThemeToggle)
 * 
 * Role in overall program logic:
 * This function is crucial for applying and managing the application's visual themes.
 * It ensures a consistent theme application across the entire application and persists
 * the user's theme preference between sessions.
 * 
 * @param {number} themeIndex - The index of the theme to be set.
 */
function setTheme(themeIndex) {
    const newTheme = themes[themeIndex];
    // Remove existing theme classes
    document.body.classList.remove(...themes.map(t => `${t}-mode`));
    // Add the new theme class
    document.body.classList.add(`${newTheme}-mode`);
    // Save the selected theme in localStorage
    localStorage.setItem('theme', newTheme);
    // Update the toggle button icon
    updateToggleButton(newTheme);
}

/**
 * Updates the theme toggle button icon based on the current theme.
 * 
 * This function does the following:
 * 1. Defines an object mapping themes to their respective icons.
 * 2. Retrieves the theme toggle button element from the DOM.
 * 3. If the button exists, updates its text content with the appropriate icon.
 * 
 * Usage example:
 * updateToggleButton('dark'); // Updates the toggle button to show the moon icon
 * 
 * Files that use this function:
 * - js/main/theme-toggle.js (current file, used in setTheme)
 * 
 * Role in overall program logic:
 * This function provides visual feedback to the user about the current theme,
 * enhancing the user interface and improving user experience.
 * 
 * @param {string} theme - The current theme name.
 */
export function updateToggleButton(theme) {
    const icons = {
        'dark': '🌙',
        'light': '☀️',
        'dracula': '🧛',
        'cyberpunk': '🤖',
        'forest': '🌳',
        'ocean': '🌊',
        'upside-down': '🙃',
        'glitch': '👾',
        'underwater': '🐠',
        'space-cowboy': '🤠🚀'
    };
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = icons[theme] || '🎨';
    }
}

/**
 * Initializes the theme toggle functionality.
 * 
 * This function performs the following steps:
 * 1. Retrieves the theme toggle button from the DOM.
 * 2. Loads the saved theme from localStorage, defaulting to the first theme if not found.
 * 3. Sets the initial theme.
 * 4. Adds a click event listener to the theme toggle button to cycle through themes.
 * 
 * Usage example:
 * initializeThemeToggle(); // Called when the DOM content is loaded
 * 
 * Files that use this function:
 * - js/main/theme-toggle.js (current file, used in DOMContentLoaded event listener)
 * - Potentially used in the main application file (e.g., js/main.js) to initialize theme functionality
 * 
 * Role in overall program logic:
 * This function sets up the theme toggling mechanism, allowing users to interactively
 * change the application's theme. It also ensures that the user's theme preference
 * is restored when they return to the application.
 */
export function initializeThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme');
    let currentThemeIndex = themes.indexOf(savedTheme);
    if (currentThemeIndex === -1) currentThemeIndex = 0;

    // Set initial theme
    setTheme(currentThemeIndex);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            currentThemeIndex = (currentThemeIndex + 1) % themes.length;
            setTheme(currentThemeIndex);
        });
    }
}

document.addEventListener('DOMContentLoaded', initializeThemeToggle);
