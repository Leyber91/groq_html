const express = require('express');
const { agentSwarm } = require('./js/api/agentSwarm.js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static frontend files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Import logger
const { logger } = require('./js/utils/logger.js');

// Modify the /api/ask-hermes route
app.post('/api/ask-hermes', async (req, res) => {
  const { question } = req.body;

  if (!question) {
    logger.warn('No question provided by the user.');
    return res.status(400).json({ error: 'Question is required.' });
  }

  logger.info(`Received question: ${question}`);

  try {
    const response = await agentSwarm.processQuery(question);
    res.json({ response: response.result, confidence: response.confidence });
  } catch (error) {
    logger.error('Processing error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});