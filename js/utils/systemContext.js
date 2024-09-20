import { logger } from './logger.js';

/**
 * Retrieves the system context required for the chat interactions.
 * 
 * This function performs the following steps:
 * 1. Mocks system settings (instead of fetching from an external API)
 * 2. Reads additional context from a local file ('local-context.json')
 * 3. Combines the mocked settings and local context
 * 4. Adds a timestamp and environment information
 * 5. Performs data transformations (e.g., formatting the timestamp)
 * 6. Converts the entire context to a JSON string
 * 
 * If an error occurs during this process, it logs the error and returns a default message.
 * 
 * Usage example:
 * ```javascript
 * const systemContext = await getSystemContext();
 * console.log(JSON.parse(systemContext));
 * ```
 * 
 * This function is used in the following files:
 * - js/chat/chatManager.js
 * - js/agents/agentFactory.js
 * - js/ui/settingsPanel.js
 * 
 * Role in overall program logic:
 * getSystemContext() is crucial for initializing the chat system with the current
 * application state and environment. It provides essential information to the chat
 * agents and UI components, ensuring consistent behavior across the application.
 * The context it generates influences how agents interact and how the UI is presented.
 * 
 * @returns {Promise<string>} The system context as a JSON string.
 * @see {@link https://github.com/your-repo/docs/system-context.md|System Context Documentation}
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
 * 
 * This function takes a system context object and converts it into a human-readable
 * string format. It handles nested objects by indenting their properties.
 * 
 * Usage example:
 * ```javascript
 * const context = JSON.parse(await getSystemContext());
 * const formattedContext = formatSystemContext(context);
 * console.log(formattedContext);
 * ```
 * 
 * This function is used in the following files:
 * - js/utils/systemContext.js (in logSystemContext)
 * - js/ui/debugPanel.js
 * 
 * Role in overall program logic:
 * formatSystemContext() is primarily used for debugging and logging purposes.
 * It provides a clear, readable representation of the system context, which
 * is helpful for developers when troubleshooting issues or monitoring the
 * application state.
 * 
 * @param {Object} context - The system context object.
 * @returns {string} Formatted string representation of the system context.
 * @see {@link https://github.com/your-repo/docs/system-context.md#formatting|Context Formatting Documentation}
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
 * 
 * This function combines the functionality of getSystemContext() and
 * formatSystemContext() to retrieve the current system context, format it,
 * and then log it using the logger.
 * 
 * Usage example:
 * ```javascript
 * logSystemContext();
 * // This will log the formatted system context to the console or log file
 * ```
 * 
 * This function is used in the following files:
 * - js/main.js (during application startup)
 * - js/debug/diagnostics.js
 * 
 * Role in overall program logic:
 * logSystemContext() serves as a convenience function for quickly outputting
 * the current system state. It's particularly useful during development and
 * debugging sessions, allowing developers to easily inspect the system context
 * at various points in the application's lifecycle.
 * 
 * @see {@link https://github.com/your-repo/docs/logging.md#system-context|System Context Logging Documentation}
 */
export function logSystemContext() {
  const context = getSystemContext();
  const formattedContext = formatSystemContext(context);
  logger.info('System Context:\n' + formattedContext);
}