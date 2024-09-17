import { logger } from './logger.js';

/**
 * Retrieves the system context required for the chat interactions.
 * @returns {Promise<string>} The system context as a string.
 */
export async function getSystemContext() {
    try {
        // Mock system settings locally instead of fetching from an external API
        // const response = await fetch('https://your-valid-api.com/system-settings'); // {{ edit_1 }}
        // if (!response.ok) {
        //     throw new Error(`HTTP error! status: ${response.status}`);
        // }
        // const settings = await response.json();

        // Mocked settings
        const settings = {
            appName: "MOA Chat",
            version: "1.0.0",
            features: ["multi-layer", "multi-agent"],
        };

        // Read additional context from a local file
        const localResponse = await fetch('local-context.json');
        if (!localResponse.ok) {
            throw new Error(`Failed to fetch local-context.json: ${localResponse.status}`);
        }
        const localContext = await localResponse.json();

        // Combine API settings and local context
        const systemContext = {
            ...settings,
            localContext: localContext,
            timestamp: new Date().toISOString(),
            environment: 'development' // Updated for browser environment
        };

        // Perform any necessary data transformations
        systemContext.formattedTimestamp = new Date(systemContext.timestamp).toLocaleString();

        // Convert systemContext to string for consistency
        return JSON.stringify(systemContext, null, 2);
    } catch (error) {
        logger.error('Error retrieving system context:', error);
        return 'System initialized with default settings.'; // {{ edit_2 }}
    }
}

/**
 * Formats the system context as a string for easy logging or display.
 * @param {Object} context - The system context object.
 * @returns {string} Formatted string representation of the system context.
 */
export function formatSystemContext(context) {
  return Object.entries(context)
    .map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `${key}:\n${Object.entries(value).map(([subKey, subValue]) => `  ${subKey}: ${subValue}`).join('\n')}`;
      }
      return `${key}: ${value}`;
    })
    .join('\n');
}

/**
 * Retrieves and logs the formatted system context.
 */
export function logSystemContext() {
  const context = getSystemContext();
  const formattedContext = formatSystemContext(context);
  logger.info('System Context:\n' + formattedContext);
}