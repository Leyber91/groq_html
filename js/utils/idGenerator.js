// Function to generate a unique ID
export function generateUniqueId() {
    // Generate a random string of 8 characters
    const randomPart = Math.random().toString(36).substring(2, 10);
    
    // Get the current timestamp
    const timestamp = Date.now().toString(36);
    
    // Combine the random part and timestamp to create a unique ID
    return `${randomPart}-${timestamp}`;
}

