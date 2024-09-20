/**
 * Function to generate a unique ID
 * 
 * This function creates a unique identifier by combining two parts:
 * 1. A random string of 8 characters
 * 2. The current timestamp
 * 
 * How it works:
 * 1. It generates a random number and converts it to base 36 (0-9 and a-z),
 *    then takes a substring to get 8 characters.
 * 2. It gets the current timestamp (in milliseconds) and converts it to base 36.
 * 3. It combines these two parts with a hyphen to create the final unique ID.
 * 
 * Usage examples:
 * const id1 = generateUniqueId(); // e.g., "a1b2c3d4-17jk2l3m"
 * const id2 = generateUniqueId(); // e.g., "e5f6g7h8-17jk2l3n"
 * 
 * Files using this function:
 * - js/components/UserProfile.js
 * - js/services/DataManager.js
 * - js/utils/FormHandler.js
 * 
 * Role in the program:
 * This function plays a crucial role in creating unique identifiers for various
 * entities in the application, such as user sessions, database entries, or
 * dynamically generated UI elements. It ensures that each generated ID is unique
 * across the system, reducing the risk of conflicts or data integrity issues.
 * 
 * @returns {string} A unique identifier string
 */
export function generateUniqueId() {
    // Generate a random string of 8 characters
    const randomPart = Math.random().toString(36).substring(2, 10);
    
    // Get the current timestamp
    const timestamp = Date.now().toString(36);
    
    // Combine the random part and timestamp to create a unique ID
    return `${randomPart}-${timestamp}`;
}

/**
 * For more detailed documentation on this function and its usage across the project,
 * please refer to the following resources:
 * 
 * - [Function Documentation](docs/api/utils/idGenerator.md)
 * - [Usage Examples](docs/examples/id-generation.md)
 * - [Project Architecture](docs/architecture/data-flow.md#id-generation)
 */
