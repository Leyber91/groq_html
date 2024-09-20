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

/**
 * Route to Handle Ollama Requests
 * 
 * This function sets up a POST route at '/api/ask-hermes' to handle requests to the Hermes3 AI model.
 * It receives a question from the client, sends it to the Hermes3 model via the Ollama command-line interface,
 * and returns the model's response.
 * 
 * How it works:
 * 1. Extracts the 'question' from the request body.
 * 2. Validates that a question was provided.
 * 3. Logs the received question.
 * 4. Executes the Ollama command with the Hermes3 model.
 * 5. Handles any errors that occur during execution.
 * 6. Logs and sends the model's response back to the client.
 * 
 * Usage example:
 * POST /api/ask-hermes
 * Body: { "question": "What is the capital of France?" }
 * Response: { "response": "The capital of France is Paris." }
 * 
 * Files that use this function:
 * - public/js/main.js (Client-side JavaScript that sends requests to this endpoint)
 * - public/index.html (HTML file that includes the client-side JavaScript)
 * 
 * Role in overall program logic:
 * This function serves as the bridge between the client-side application and the Hermes3 AI model.
 * It enables users to interact with the AI model through a web interface, facilitating question-answering
 * capabilities in the application.
 * 
 * @see [Ollama Documentation](https://github.com/jmorganca/ollama)
 * @see [Hermes3 Model](https://huggingface.co/models?search=hermes3)
 */
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