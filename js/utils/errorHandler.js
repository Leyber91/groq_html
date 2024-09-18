const { logger } = require('./logger.js');

function handleError(res, error) {
  logger.error(error.message);
  res.status(500).json({ error: 'Internal Server Error', details: error.message });
}

module.exports = { handleError };