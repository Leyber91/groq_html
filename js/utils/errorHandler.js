const { logger } = require('./logger.js');

/**
 * Handles errors in the application by logging the error and sending a standardized response.
 * 
 * @param {Object} res - The response object from Express.js
 * @param {Error} error - The error object to be handled
 * 
 * How it works:
 * 1. Logs the error message using the logger imported from './logger.js'
 * 2. Sets the HTTP status code to 500 (Internal Server Error)
 * 3. Sends a JSON response with a generic error message and the specific error details
 * 
 * Usage example:
 * 
 * app.get('/api/data', (req, res) => {
 *   try {
 *     // Some code that might throw an error
 *   } catch (error) {
 *     handleError(res, error);
 *   }
 * });
 * 
 * Files using this function:
 * - js/routes/userRoutes.js
 * - js/routes/productRoutes.js
 * - js/middleware/authMiddleware.js
 * 
 * Role in program logic:
 * This function serves as a centralized error handler for the application.
 * It ensures consistent error logging and response formatting across different
 * parts of the program. By using this function, developers can easily manage
 * error handling in various routes and middleware, maintaining a uniform
 * error reporting structure.
 * 
 * For more detailed documentation, please refer to:
 * [Error Handling Documentation](./docs/error-handling.md)
 */
function handleError(res, error) {
  logger.error(error.message);
  res.status(500).json({ error: 'Internal Server Error', details: error.message });
}

module.exports = { handleError };