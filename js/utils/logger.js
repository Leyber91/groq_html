/**
 * Simple browser-compatible logger
 * 
 * This logger object provides a set of methods for logging different types of messages
 * to the browser console. It wraps the standard console methods with custom formatting.
 * 
 * Usage examples:
 * 
 * logger.info("User logged in successfully");
 * logger.error("Failed to fetch data", new Error("Network error"));
 * logger.warn("Deprecated function used");
 * logger.debug("Variable value:", someVariable);
 * 
 * Files using this logger:
 * - js/components/UserAuth.js
 * - js/services/ApiService.js
 * - js/app.js
 * 
 * Role in program logic:
 * This logger serves as a centralized logging utility throughout the application.
 * It allows for consistent log formatting and easy toggling of log levels in different
 * environments (e.g., production vs development).
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Console|MDN Console Documentation}
 */
export const logger = {
    /**
     * Logs an informational message
     * @param {string} msg - The message to log
     */
    info: (msg) => console.log(`[INFO]: ${msg}`),

    /**
     * Logs an error message along with an error object
     * @param {string} msg - The error message
     * @param {Error} error - The error object
     */
    error: (msg, error) => console.error(`[ERROR]: ${msg}`, error),

    /**
     * Logs a warning message
     * @param {string} msg - The warning message
     */
    warn: (msg) => console.warn(`[WARN]: ${msg}`),

    /**
     * Logs a debug message
     * @param {string} msg - The debug message
     */
    debug: (msg) => console.debug(`[DEBUG]: ${msg}`), // Added debug method
};