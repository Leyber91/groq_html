import { AutonomousQueryHandler, FunctionInput } from '../api/functionCalling.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Simple test function that returns a string with the provided parameters.
 * 
 * How it works:
 * 1. Receives an object of parameters
 * 2. Converts the parameters object to a JSON string
 * 3. Returns a formatted string including the stringified parameters
 * 
 * @param {Object} params - The parameters to be included in the return string
 * @returns {string} A formatted string with the stringified parameters
 * 
 * Usage example:
 * const result = testFunction({ key: 'value' });
 * console.log(result); // Output: "Test function executed with params: {"key":"value"}"
 * 
 * Other files that use this function:
 * - This function is only used within this test file
 * 
 * Role in overall program logic:
 * This function serves as a simple test case for the AutonomousQueryHandler.
 * It demonstrates how a registered function can be called and executed.
 */
function testFunction(params) {
    return `Test function executed with params: ${JSON.stringify(params)}`;
}

// Create an instance of AutonomousQueryHandler
const queryHandler = new AutonomousQueryHandler();

// Register the test function
queryHandler.registerFunction('testFunction', new FunctionInput('testFunction', {}));

// Test query
const testQuery = "Execute the test function";

/**
 * Executes the test for the Groq integration.
 * 
 * How it works:
 * 1. Logs the start of the test
 * 2. Calls handleQuery method of queryHandler with the test query
 * 3. Logs the result of the query
 * 4. Logs the successful completion of the test
 * 5. Catches and logs any errors that occur during the test
 * 
 * Usage example:
 * runTest();
 * 
 * Other files that use this function:
 * - This function is only used within this test file
 * 
 * Role in overall program logic:
 * This function serves as the main test runner for the Groq integration.
 * It demonstrates how to use the AutonomousQueryHandler to process a query
 * and handle the result or any errors that may occur.
 */
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