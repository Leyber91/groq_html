
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

// Utility functions
export function isProduction() {
    return ENVIRONMENT === 'production';
}

export function isDevelopment() {
    return ENVIRONMENT === 'development';
}

export function isTest() {
    return ENVIRONMENT === 'test';
}

export function getApiKey() {
    return isProduction() ? window.GROQ_API_KEY : API_CONFIG.KEY;
}

export function getLogLevel() {
    return isProduction() ? 'error' : SYSTEM_SETTINGS.LOG_LEVEL;
}

export function shouldEnableTelemetry() {
    return isProduction() && SYSTEM_SETTINGS.ENABLE_TELEMETRY;
}

// Configuration validation
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

