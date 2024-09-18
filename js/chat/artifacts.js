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
     */
    constructor(chatContainer) {
        this.chatContainer = chatContainer;
        this.initializeEventListeners();
    }

    /**
     * Generates artifacts (code blocks and images) from the response.
     * @param {string} response - The response text to parse.
     * @returns {Array} An array of artifact objects.
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
     */
    addArtifactsToChat(artifacts) {
        artifacts.forEach(artifact => {
            this.handleArtifact(artifact);
        });
    }

    /**
     * Handles the addition of a single artifact to the chat container.
     * @param {Object} artifact - The artifact object to handle.
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
