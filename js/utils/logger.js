// Simple browser-compatible logger

export const logger = {
    info: (msg) => console.log(`[INFO]: ${msg}`),
    error: (msg, error) => console.error(`[ERROR]: ${msg}`, error),
    warn: (msg) => console.warn(`[WARN]: ${msg}`),
    debug: (msg) => console.debug(`[DEBUG]: ${msg}`), // Added debug method
};