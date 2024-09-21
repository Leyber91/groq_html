// functionProcessor.js
import { logger } from '../utils/logger.js';
import { withErrorHandling, handleGracefulDegradation } from './error-handling.js';
import { AutonomousQueryHandler } from './functionCalling.js';
/**
 * Processes function call requests.
 * @param {Object} request - The function call request.
 * @returns {Promise<any>} - The function call result.
 */
const processFunctionCall = withErrorHandling(async (request) => {
  const { functionName, parameters, resolve, reject } = request;
  const queryHandler = new AutonomousQueryHandler();
  try {
    const functionInput = new FunctionInput(functionName, parameters);
    logger.info(`Handling function call: ${functionName} with parameters: ${JSON.stringify(parameters)}`);
    const result = await queryHandler.handleQuery(JSON.stringify(functionInput));
    resolve(result);
  } catch (error) {
    logger.error(`Error processing function call ${functionName}: ${error.message}`);
    const gracefulResult = await handleGracefulDegradation(error, `processFunctionCall:${functionName}`);
    if (gracefulResult) {
      resolve(gracefulResult);
    } else {
      reject(error);
    }
  }
}, 'processFunctionCall');
export { processFunctionCall };
