const express = require('express');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Import logger
const { logger } = require('./public/js/utils/logger.js');

// New Route to Handle Ollama Requests
app.post('/api/ask-hermes', (req, res) => {
  const { question } = req.body;

  if (!question) {
    logger.warn('No question provided by the user.');
    return res.status(400).json({ error: 'Question is required.' });
  }

  logger.info(`Received question: ${question}`);

  // Execute the Ollama command with the Hermes3 model
  exec(`echo "${question}" | ollama run hermes3:latest`, (error, stdout, stderr) => {
    if (error) {
      logger.error('Execution error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    if (stderr) {
      logger.error('Standard error:', stderr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    logger.info(`Hermes3 response: ${stdout.trim()}`);
    // Send the model's response back to the client
    res.json({ response: stdout.trim() });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});