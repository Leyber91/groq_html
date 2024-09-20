
import { GROQ_API_KEY } from './api-key.js';

// API configuration
export const API_CONFIG = {
    ENDPOINT: 'https://api.groq.com/openai/v1/chat/completions',
    KEY: GROQ_API_KEY
};

// System-wide settings
export const SYSTEM_SETTINGS = {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // ms
    DEFAULT_TIMEOUT: 30000, // ms
    LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
    ENABLE_TELEMETRY: false,
    MAX_CONCURRENT_REQUESTS: 10
};

export const ENVIRONMENT = window.ENV || 'development';

// Error messages
export const ERROR_MESSAGES = {
    API_KEY_MISSING: 'API key is missing. Please provide a valid API key.',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later.',
    NETWORK_ERROR: 'Network error occurred. Please check your internet connection.',
    INVALID_RESPONSE: 'Invalid response received from the server.',
    TIMEOUT: 'Request timed out. Please try again.'
};

/**
 * Checks if the current environment is production.
 * 
 * How it works:
 * 1. Compares the ENVIRONMENT constant with the string 'production'
 * 2. Returns true if they match, false otherwise
 * 
 * Usage example:
 * ```javascript
 * if (isProduction()) {
 *     console.log('Running in production mode');
 * }
 * ```
 * 
 * Files that use this function:
 * - js/api/api-core.js
 * - js/utils/logger.js
 * - js/config/feature-flags.js
 * 
 * Role in overall program logic:
 * This function is used to determine if the application is running in production mode.
 * It helps in conditionally executing code or setting configurations specific to the production environment.
 * 
 * @returns {boolean} True if the environment is production, false otherwise
 */
export function isProduction() {
    return ENVIRONMENT === 'production';
}

/**
 * Checks if the current environment is development.
 * 
 * How it works:
 * 1. Compares the ENVIRONMENT constant with the string 'development'
 * 2. Returns true if they match, false otherwise
 * 
 * Usage example:
 * ```javascript
 * if (isDevelopment()) {
 *     console.log('Running in development mode');
 * }
 * ```
 * 
 * Files that use this function:
 * - js/api/api-core.js
 * - js/utils/logger.js
 * - js/config/feature-flags.js
 * 
 * Role in overall program logic:
 * This function is used to determine if the application is running in development mode.
 * It helps in enabling development-specific features, logging, or configurations.
 * 
 * @returns {boolean} True if the environment is development, false otherwise
 */
export function isDevelopment() {
    return ENVIRONMENT === 'development';
}

/**
 * Checks if the current environment is test.
 * 
 * How it works:
 * 1. Compares the ENVIRONMENT constant with the string 'test'
 * 2. Returns true if they match, false otherwise
 * 
 * Usage example:
 * ```javascript
 * if (isTest()) {
 *     console.log('Running in test mode');
 * }
 * ```
 * 
 * Files that use this function:
 * - js/tests/test-setup.js
 * - js/utils/logger.js
 * 
 * Role in overall program logic:
 * This function is used to determine if the application is running in test mode.
 * It helps in setting up test-specific configurations or behaviors.
 * 
 * @returns {boolean} True if the environment is test, false otherwise
 */
export function isTest() {
    return ENVIRONMENT === 'test';
}

/**
 * Retrieves the appropriate API key based on the current environment.
 * 
 * How it works:
 * 1. Checks if the environment is production using isProduction()
 * 2. If in production, returns the API key from window.GROQ_API_KEY
 * 3. Otherwise, returns the API key from API_CONFIG.KEY
 * 
 * Usage example:
 * ```javascript
 * const apiKey = getApiKey();
 * console.log('Using API key:', apiKey);
 * ```
 * 
 * Files that use this function:
 * - js/api/api-core.js
 * - js/services/auth-service.js
 * 
 * Role in overall program logic:
 * This function ensures that the correct API key is used based on the environment.
 * It helps in maintaining security by using different keys for production and non-production environments.
 * 
 * @returns {string} The appropriate API key for the current environment
 */
export function getApiKey() {
    return isProduction() ? window.GROQ_API_KEY : API_CONFIG.KEY;
}

/**
 * Determines the appropriate log level based on the current environment.
 * 
 * How it works:
 * 1. Checks if the environment is production using isProduction()
 * 2. If in production, returns 'error' as the log level
 * 3. Otherwise, returns the log level specified in SYSTEM_SETTINGS.LOG_LEVEL
 * 
 * Usage example:
 * ```javascript
 * const logLevel = getLogLevel();
 * console.log('Current log level:', logLevel);
 * ```
 * 
 * Files that use this function:
 * - js/utils/logger.js
 * - js/config/logging-config.js
 * 
 * Role in overall program logic:
 * This function helps in setting the appropriate logging level for different environments.
 * It ensures that only critical errors are logged in production while allowing more verbose logging in other environments.
 * 
 * @returns {string} The appropriate log level for the current environment
 */
export function getLogLevel() {
    return isProduction() ? 'error' : SYSTEM_SETTINGS.LOG_LEVEL;
}

/**
 * Determines whether telemetry should be enabled based on the environment and settings.
 * 
 * How it works:
 * 1. Checks if the environment is production using isProduction()
 * 2. If in production, checks if SYSTEM_SETTINGS.ENABLE_TELEMETRY is true
 * 3. Returns true only if both conditions are met
 * 
 * Usage example:
 * ```javascript
 * if (shouldEnableTelemetry()) {
 *     initializeTelemetry();
 * }
 * ```
 * 
 * Files that use this function:
 * - js/services/telemetry-service.js
 * - js/main/app-initializer.js
 * 
 * Role in overall program logic:
 * This function helps in controlling when telemetry data should be collected.
 * It ensures that telemetry is only enabled in production and when explicitly allowed in the settings.
 * 
 * @returns {boolean} True if telemetry should be enabled, false otherwise
 */
export function shouldEnableTelemetry() {
    return isProduction() && SYSTEM_SETTINGS.ENABLE_TELEMETRY;
}

/**
 * Validates the configuration settings and throws errors or warnings for invalid values.
 * 
 * How it works:
 * 1. Checks if the API key is present using getApiKey()
 * 2. Validates MAX_RETRIES and RETRY_DELAY in SYSTEM_SETTINGS
 * 3. Throws an error for missing API key
 * 4. Logs warnings and sets default values for invalid settings
 * 
 * Usage example:
 * ```javascript
 * try {
 *     validateConfig();
 *     console.log('Configuration is valid');
 * } catch (error) {
 *     console.error('Configuration error:', error.message);
 * }
 * ```
 * 
 * Files that use this function:
 * - js/main/app-initializer.js
 * - js/config/config-loader.js
 * 
 * Role in overall program logic:
 * This function ensures that the application's configuration is valid before proceeding.
 * It helps prevent runtime errors by catching configuration issues early in the application lifecycle.
 * 
 * @throws {Error} If the API key is missing
 */
export function validateConfig() {
    if (!getApiKey()) {
        throw new Error(ERROR_MESSAGES.API_KEY_MISSING);
    }
    
    if (SYSTEM_SETTINGS.MAX_RETRIES < 0) {
        console.warn('MAX_RETRIES should be a non-negative integer. Setting to default value of 3.');
        SYSTEM_SETTINGS.MAX_RETRIES = 3;
    }
    
    if (SYSTEM_SETTINGS.RETRY_DELAY < 0) {
        console.warn('RETRY_DELAY should be a non-negative integer. Setting to default value of 1000ms.');
        SYSTEM_SETTINGS.RETRY_DELAY = 1000;
    }
    
    // Add more validation as needed
}

// Initialize configuration
validateConfig();
