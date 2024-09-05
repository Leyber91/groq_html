# Groq MOA - Mixture of Agents

Groq MOA is a web-based application that implements a Mixture of Agents (MOA) system using the Groq API. This project demonstrates an advanced approach to natural language processing and generation by combining multiple AI models in a hierarchical structure.

## Features

- Multi-layer agent architecture
- Dynamic visualization of the MOA structure
- Real-time chat interface
- Adaptive processing based on output quality and processing time
- Rate limiting and error handling
- Response caching for improved performance

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- A Groq API key

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/groq-moa.git
   cd groq-moa
   ```

2. Open the `js/config/api-key.js` file and replace the placeholder API key with your Groq API key:
   ```javascript
   export const GROQ_API_KEY = 'your_api_key_here';
   ```

3. Open the `index.html` file in your web browser to view the application.

## Project Structure

- `css/`: Contains all CSS files for styling
- `js/`: Contains JavaScript files
  - `api/`: API-related functions and configurations
  - `chat/`: Chat interface logic
  - `config/`: Configuration files
  - `main/`: Main application logic
  - `to_implement/`: Placeholder files for future implementations
- `index.html`: Main HTML file

## Configuration

You can modify the MOA configuration in `js/config/moa-config.js` to adjust the model structure, temperatures, and other settings.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Groq API for providing the underlying language models
- D3.js for visualization capabilities