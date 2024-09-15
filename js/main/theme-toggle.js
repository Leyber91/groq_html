// theme-toggle.js

const themes = ['dark', 'light', 'dracula'];

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

export function updateToggleButton(theme) {
    const icons = {
        'dark': '🌙',
        'light': '☀️',
        'dracula': '🧛'
    };
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = icons[theme] || '🎨';
    }
}

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
