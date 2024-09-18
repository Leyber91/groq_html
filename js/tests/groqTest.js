import { AutonomousQueryHandler, FunctionInput } from '../api/functionCalling.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple test function
function testFunction(params) {
    return `Test function executed with params: ${JSON.stringify(params)}`;
}

// Create an instance of AutonomousQueryHandler
const queryHandler = new AutonomousQueryHandler();

// Register the test function
queryHandler.registerFunction('testFunction', new FunctionInput('testFunction', {}));

// Test query
const testQuery = "Execute the test function";

// Execute the test
async function runTest() {
    try {
        console.log("Starting Groq test...");
        const result = await queryHandler.handleQuery(testQuery);
        console.log("Test result:", result);
        console.log("Groq test completed successfully!");
    } catch (error) {
        console.error("Error during Groq test:", error);
    }
}

// Run the test
runTest();