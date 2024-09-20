// artifacts.js

import hljs from 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.7.0/build/es/highlight.min.js';
import { formatContent } from './message-formatting.js';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify/dist/purify.es.mjs';
import { logger } from '../utils/logger.js';

/**
 * ArtifactManager handles the generation and rendering of artifacts in the chat.
 */
export class ArtifactManager {
    /**
     * Initializes the ArtifactManager with the chat container.
     * @param {HTMLElement} chatContainer - The container element for chat messages.
     * 
     * How it works:
     * - Stores the chat container for later use
     * - Calls initializeEventListeners to set up event handling
     * 
     * Usage example:
     * ```javascript
     * const chatContainer = document.getElementById('chat-container');
     * const artifactManager = new ArtifactManager(chatContainer);
     * ```
     * 
     * Used in:
     * - js/chat/chat-ui.js (assumed)
     * 
     * Role in program logic:
     * - Acts as the entry point for artifact management in the chat interface
     * - Provides a centralized way to handle different types of artifacts (code, images)
     */
    constructor(chatContainer) {
        this.chatContainer = chatContainer;
        this.initializeEventListeners();
    }

    /**
     * Generates artifacts (code blocks and images) from the response.
     * @param {string} response - The response text to parse.
     * @returns {Array} An array of artifact objects.
     * 
     * How it works:
     * - Uses regex to find code blocks and images in the response text
     * - Creates artifact objects for each match and stores them in an array
     * 
     * Usage example:
     * ```javascript
     * const response = "Here's some code: ```javascript\nconsole.log('Hello');\n``` And an image: ![alt text](image-url.jpg)";
     * const artifacts = artifactManager.generateArtifacts(response);
     * ```
     * 
     * Used in:
     * - js/chat/chat-ui.js (assumed)
     * - js/chat/message-processor.js (assumed)
     * 
     * Role in program logic:
     * - Parses raw response text to identify and extract artifacts
     * - Prepares artifacts for rendering in the chat interface
     */
    generateArtifacts(response) {
        const artifacts = [];
        const codeRegex = /```(\w+)\n([\s\S]+?)```/g;
        let match;

        while ((match = codeRegex.exec(response)) !== null) {
            artifacts.push({
                type: 'code',
                language: match[1],
                content: match[2]
            });
        }

        const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        while ((match = imageRegex.exec(response)) !== null) {
            artifacts.push({
                type: 'image',
                alt: match[1],
                url: match[2]
            });
        }

        return artifacts;
    }

    /**
     * Adds artifacts to the chat container.
     * @param {Array} artifacts - An array of artifact objects.
     * 
     * How it works:
     * - Iterates through the array of artifacts
     * - Calls handleArtifact for each artifact to render it in the chat
     * 
     * Usage example:
     * ```javascript
     * const artifacts = artifactManager.generateArtifacts(response);
     * artifactManager.addArtifactsToChat(artifacts);
     * ```
     * 
     * Used in:
     * - js/chat/chat-ui.js (assumed)
     * 
     * Role in program logic:
     * - Bridges the gap between artifact generation and rendering
     * - Ensures all generated artifacts are displayed in the chat interface
     */
    addArtifactsToChat(artifacts) {
        artifacts.forEach(artifact => {
            this.handleArtifact(artifact);
        });
    }

    /**
     * Handles the addition of a single artifact to the chat container.
     * @param {Object} artifact - The artifact object to handle.
     * 
     * How it works:
     * - Creates a new div element for the artifact
     * - Determines the artifact type and calls the appropriate creation method
     * - Appends the created artifact to the chat container
     * 
     * Usage example:
     * ```javascript
     * const codeArtifact = { type: 'code', language: 'javascript', content: 'console.log("Hello");' };
     * artifactManager.handleArtifact(codeArtifact);
     * ```
     * 
     * Used in:
     * - This file (addArtifactsToChat method)
     * 
     * Role in program logic:
     * - Responsible for rendering individual artifacts in the chat
     * - Ensures proper formatting and display of different artifact types
     */
    handleArtifact(artifact) {
        const artifactDiv = document.createElement('div');
        artifactDiv.classList.add('artifact', `artifact-${artifact.type}`);

        switch (artifact.type) {
            case 'code':
                artifactDiv.innerHTML = this.createCodeArtifactHTML(artifact);
                break;
            case 'image':
                artifactDiv.innerHTML = this.createImageArtifactHTML(artifact);
                break;
            default:
                logger.warn(`Unsupported artifact type: ${artifact.type}`);
                artifactDiv.textContent = 'Unsupported artifact type.';
        }

        this.chatContainer.appendChild(artifactDiv);
    }

    /**
     * Creates HTML for a code artifact.
     * @param {Object} artifact - The code artifact.
     * @returns {string} The HTML string for the code artifact.
     * 
     * How it works:
     * - Sanitizes the code content to prevent XSS attacks
     * - Uses highlight.js to apply syntax highlighting to the code
     * - Generates HTML structure for the code artifact, including copy and execute buttons
     * 
     * Usage example:
     * ```javascript
     * const codeArtifact = { type: 'code', language: 'javascript', content: 'console.log("Hello");' };
     * const codeHTML = artifactManager.createCodeArtifactHTML(codeArtifact);
     * ```
     * 
     * Used in:
     * - This file (handleArtifact method)
     * 
     * Role in program logic:
     * - Responsible for creating the visual representation of code artifacts
     * - Enhances code readability through syntax highlighting
     * - Provides interactive elements (copy, execute) for code artifacts
     */
    createCodeArtifactHTML(artifact) {
        const sanitizedCode = DOMPurify.sanitize(artifact.content);
        const highlightedCode = hljs.highlight(sanitizedCode, { language: artifact.language }).value;

        return `
            <div class="artifact-header">
                <span class="artifact-type">Code (${artifact.language})</span>
            </div>
            <div class="artifact-content">
                <pre><code class="hljs language-${artifact.language}">${highlightedCode}</code></pre>
            </div>
            <div class="artifact-actions">
                <button class="copy-button" aria-label="Copy code">Copy</button>
                ${artifact.language.toLowerCase() === 'javascript' ? '<button class="execute-button" aria-label="Execute code">Execute</button>' : ''}
            </div>
            <div class="execution-result" hidden></div>
        `;
    }

    /**
     * Creates HTML for an image artifact.
     * @param {Object} artifact - The image artifact.
     * @returns {string} The HTML string for the image artifact.
     * 
     * How it works:
     * - Sanitizes the image URL and alt text to prevent XSS attacks
     * - Generates HTML structure for the image artifact, including a fallback image
     * 
     * Usage example:
     * ```javascript
     * const imageArtifact = { type: 'image', url: 'https://example.com/image.jpg', alt: 'Example Image' };
     * const imageHTML = artifactManager.createImageArtifactHTML(imageArtifact);
     * ```
     * 
     * Used in:
     * - This file (handleArtifact method)
     * 
     * Role in program logic:
     * - Responsible for creating the visual representation of image artifacts
     * - Ensures safe rendering of user-provided images
     * - Provides fallback mechanism for broken image links
     */
    createImageArtifactHTML(artifact) {
        const sanitizedURL = DOMPurify.sanitize(artifact.url);
        const sanitizedAlt = DOMPurify.sanitize(artifact.alt);

        return `
            <div class="artifact-header">
                <span class="artifact-type">Image</span>
            </div>
            <figure class="artifact-content">
                <img src="${sanitizedURL}" alt="${sanitizedAlt}" loading="lazy" onerror="this.onerror=null; this.src='path/to/fallback-image.jpg';">
                <figcaption>${sanitizedAlt}</figcaption>
            </figure>
            <a href="${sanitizedURL}" target="_blank" rel="noopener noreferrer" class="view-full-image" aria-label="View full image">View Full Image</a>
        `;
    }

    /**
     * Initializes event listeners for artifact actions.
     * 
     * How it works:
     * - Adds a click event listener to the chat container
     * - Delegates events for copy and execute buttons to their respective handlers
     * 
     * Usage example:
     * ```javascript
     * // This method is called automatically in the constructor
     * artifactManager.initializeEventListeners();
     * ```
     * 
     * Used in:
     * - This file (constructor)
     * 
     * Role in program logic:
     * - Sets up event handling for interactive elements in artifacts
     * - Enables copy and execute functionality for code artifacts
     */
    initializeEventListeners() {
        this.chatContainer.addEventListener('click', async (event) => {
            const target = event.target;

            if (target.classList.contains('copy-button')) {
                await this.copyToClipboard(target);
            } else if (target.classList.contains('execute-button')) {
                await this.executeCode(target);
            }
        });
    }

    /**
     * Copies the code content to the clipboard.
     * @param {HTMLElement} button - The copy button that was clicked.
     * 
     * How it works:
     * - Finds the associated code element
     * - Copies the code text to the clipboard using the Clipboard API
     * - Updates the button state to provide user feedback
     * 
     * Usage example:
     * ```javascript
     * // This method is called automatically when a copy button is clicked
     * await artifactManager.copyToClipboard(copyButton);
     * ```
     * 
     * Used in:
     * - This file (initializeEventListeners method)
     * 
     * Role in program logic:
     * - Provides a convenient way for users to copy code from artifacts
     * - Enhances user experience by providing visual feedback on copy action
     */
    async copyToClipboard(button) {
        const codeElement = button.closest('.artifact')?.querySelector('code');
        if (!codeElement) {
            logger.error('copyToClipboard: Code element not found.');
            return;
        }

        const codeText = codeElement.textContent;

        try {
            await navigator.clipboard.writeText(codeText);
            this.updateButtonState(button, 'Copied!', true);
        } catch (err) {
            logger.error('copyToClipboard: Failed to copy text.', err);
            this.updateButtonState(button, 'Failed', false);
        }
    }

    /**
     * Executes JavaScript code in a sandboxed environment.
     * @param {HTMLElement} button - The execute button that was clicked.
     * 
     * How it works:
     * - Finds the associated code element and verifies it's JavaScript
     * - Disables the button during execution
     * - Calls executeCodeSandbox to run the code safely
     * - Displays the execution result
     * 
     * Usage example:
     * ```javascript
     * // This method is called automatically when an execute button is clicked
     * await artifactManager.executeCode(executeButton);
     * ```
     * 
     * Used in:
     * - This file (initializeEventListeners method)
     * 
     * Role in program logic:
     * - Allows users to execute JavaScript code snippets directly in the chat
     * - Provides a safe execution environment to prevent malicious code execution
     */
    async executeCode(button) {
        const codeElement = button.closest('.artifact')?.querySelector('code');
        const languageMatch = codeElement?.className.match(/language-(\w+)/);
        const language = languageMatch ? languageMatch[1] : 'plaintext';

        if (codeElement && language.toLowerCase() === 'javascript') {
            if (button.disabled) return;

            const code = codeElement.textContent;
            button.textContent = 'Executing...';
            button.disabled = true;

            const result = await this.executeCodeSandbox(code);

            this.displayExecutionResult(button, result);
            button.textContent = 'Execute';
            button.disabled = false;
        }
    }

    /**
     * Executes JavaScript code in a sandboxed environment using Web Workers.
     * @param {string} code - The JavaScript code to execute.
     * @returns {Promise<object>} The result of the execution.
     * 
     * How it works:
     * - Creates a Web Worker with a blob URL containing the execution logic
     * - Sends the code to the worker for execution
     * - Returns a promise that resolves with the execution result
     * 
     * Usage example:
     * ```javascript
     * const code = 'console.log("Hello, World!");';
     * const result = await artifactManager.executeCodeSandbox(code);
     * ```
     * 
     * Used in:
     * - This file (executeCode method)
     * 
     * Role in program logic:
     * - Provides a secure environment for executing user-provided JavaScript code
     * - Isolates code execution to prevent interference with the main application
     */
    async executeCodeSandbox(code) {
        try {
            const blob = new Blob([`
                self.onmessage = function(e) {
                    try {
                        const result = eval(e.data);
                        self.postMessage({ success: true, result: JSON.stringify(result, null, 2) });
                    } catch (error) {
                        self.postMessage({ success: false, error: error.message });
                    }
                };
            `], { type: 'application/javascript' });

            const worker = new Worker(URL.createObjectURL(blob));
            return new Promise((resolve) => {
                worker.onmessage = (e) => {
                    resolve(e.data);
                    worker.terminate();
                };
                worker.postMessage(code);
            });
        } catch (error) {
            logger.error('executeCodeSandbox: Failed to execute code', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Displays the result of code execution.
     * @param {HTMLElement} button - The execute button.
     * @param {object} result - The result object from executeCodeSandbox.
     * 
     * How it works:
     * - Finds or creates a result div element
     * - Updates the div with the execution result or error message
     * - Applies appropriate styling based on success or failure
     * 
     * Usage example:
     * ```javascript
     * const result = { success: true, result: 'Hello, World!' };
     * artifactManager.displayExecutionResult(executeButton, result);
     * ```
     * 
     * Used in:
     * - This file (executeCode method)
     * 
     * Role in program logic:
     * - Provides visual feedback to users about the result of code execution
     * - Enhances user experience by clearly displaying execution outputs or errors
     */
    displayExecutionResult(button, result) {
        const codeBlock = button.closest('.artifact-actions');
        let resultDiv = codeBlock.nextElementSibling;

        if (!resultDiv || (!resultDiv.classList.contains('execution-result') && !resultDiv.classList.contains('execution-error'))) {
            resultDiv = document.createElement('div');
            codeBlock.insertAdjacentElement('afterend', resultDiv);
        }

        if (result.success) {
            resultDiv.className = 'execution-result';
            resultDiv.setAttribute('role', 'status');
            resultDiv.textContent = result.result;
            resultDiv.hidden = false;
        } else {
            resultDiv.className = 'execution-error';
            resultDiv.setAttribute('role', 'alert');
            resultDiv.textContent = result.error;
            resultDiv.hidden = false;
        }
    }

    /**
     * Updates the state of the copy or execute button based on success or failure.
     * @param {HTMLElement} button - The button to update.
     * @param {string} message - The feedback message.
     * @param {boolean} isSuccess - Indicates if the action was successful.
     * 
     * How it works:
     * - Updates the button text with the provided message
     * - Adds a success or error class to the button
     * - Resets the button state after a short delay
     * 
     * Usage example:
     * ```javascript
     * artifactManager.updateButtonState(copyButton, 'Copied!', true);
     * ```
     * 
     * Used in:
     * - This file (copyToClipboard method)
     * 
     * Role in program logic:
     * - Provides visual feedback to users after copy or execute actions
     * - Enhances user experience by clearly indicating action results
     */
    updateButtonState(button, message, isSuccess) {
        button.textContent = message;
        button.classList.add(isSuccess ? 'success' : 'error');

        setTimeout(() => {
            button.textContent = 'Copy';
            button.classList.remove('success', 'error');
        }, 2000);
    }
}
