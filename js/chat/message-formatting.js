// message-formatting.js

import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';
import hljs from 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.7.0/build/es/highlight.min.js';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify/dist/purify.es.mjs';
import { logger } from '../utils/logger.js';

// Configure marked with enhanced options
marked.setOptions({
    highlight: (code, lang) => {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-',
    breaks: true,
    gfm: true,
    sanitize: false, // Sanitization handled separately
});

/**
 * Adds a message to the chat container.
 * @param {string} role - The role of the message sender (e.g., 'user', 'layer', 'assistant').
 * @param {string|object} content - The content of the message.
 * @param {HTMLElement} container - The chat container element.
 * @returns {HTMLElement} The created message element.
 */
export function addMessageToChat(role, content, container) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${role}-message`);

    // Sanitize and format the content
    const sanitizedContent = DOMPurify.sanitize(formatContent(content));

    if (role === 'layer') {
        const layerNumber = extractLayerNumber(content) || 'Unknown';

        messageDiv.innerHTML = `
            <div class="message-header">
                <span>Layer ${layerNumber}</span>
                <button class="toggle-agents" aria-label="Toggle agent visibility" aria-expanded="false">
                    Show Agents
                </button>
            </div>
            <div class="message-content">${sanitizedContent}</div>
            <div class="agents-content" hidden></div>
        `;

        setupToggleAgents(messageDiv);
    } else {
        messageDiv.innerHTML = `
            <div class="message-header">${capitalizeFirstLetter(role)}</div>
            <div class="message-content">${sanitizedContent}</div>
        `;
    }

    container.appendChild(messageDiv);
    smoothScrollToBottom(container);
    return messageDiv;
}

/**
 * Updates the content of an existing message.
 * @param {HTMLElement} messageDiv - The message element to update.
 * @param {string|object} content - The new content.
 */
export function updateMessageContent(messageDiv, content) {
    if (!messageDiv) {
        logger.error('updateMessageContent: messageDiv is null or undefined');
        return;
    }

    const contentDiv = messageDiv.querySelector('.message-content');
    if (contentDiv) {
        contentDiv.innerHTML = DOMPurify.sanitize(formatContent(content));
    } else {
        logger.error('updateMessageContent: Content div not found in message');
    }
}

/**
 * Formats the message content by processing markdown and code blocks.
 * @param {string|object} content - The raw message content.
 * @returns {string} The formatted HTML content.
 */
export function formatContent(content) {
    if (typeof content !== 'string' || !content.trim()) {
        logger.warn('formatContent received invalid or empty content.');
        return '<p>No content available.</p>';
    }

    try {
        return marked.parse(content);
    } catch (error) {
        logger.error('Error formatting content:', error);
        return '<p>Error formatting content.</p>';
    }
}

/**
 * Extracts the layer number from the content.
 * @param {string} content - The message content.
 * @returns {number|null} The layer number or null if not found.
 */
function extractLayerNumber(content) {
    const match = typeof content === 'string' ? content.match(/<layer(\d+)>/) : null;
    return match ? parseInt(match[1], 10) : null;
}

/**
 * Sets up the toggle functionality for agent visibility.
 * @param {HTMLElement} messageDiv - The message element containing agents.
 */
function setupToggleAgents(messageDiv) {
    const toggleButton = messageDiv.querySelector('.toggle-agents');
    const agentsContent = messageDiv.querySelector('.agents-content');

    toggleButton.addEventListener('click', () => {
        const isHidden = agentsContent.hasAttribute('hidden');
        agentsContent.hidden = !isHidden;
        toggleButton.textContent = isHidden ? 'Hide Agents' : 'Show Agents';
        toggleButton.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    });
}

/**
 * Capitalizes the first letter of a string.
 * @param {string} string - The string to capitalize.
 * @returns {string} The capitalized string.
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Smoothly scrolls the container to the bottom.
 * @param {HTMLElement} element - The container to scroll.
 */
function smoothScrollToBottom(element) {
    element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth',
    });
}

/**
 * Creates a code block with syntax highlighting and action buttons.
 * @param {string} code - The code to display.
 * @param {string} language - The programming language of the code.
 * @returns {string} The HTML string for the code block.
 */
export function createCodeBlock(code, language) {
    const sanitizedCode = DOMPurify.sanitize(code);
    const highlightedCode = hljs.highlight(sanitizedCode, { language }).value;
    const executeButton = language.toLowerCase() === 'javascript' ? 
        `<button class="execute-button" aria-label="Execute code">Execute</button>` : '';

    return `
        <div class="code-block">
            <button class="copy-button" aria-label="Copy code">Copy</button>
            ${executeButton}
            <pre><code class="hljs language-${language}">${highlightedCode}</code></pre>
        </div>
    `;
}

/**
 * Formats an error message for display.
 * @param {Error} error - The error to format.
 * @returns {string} The HTML string for the error message.
 */
export function formatError(error) {
    const sanitizedMessage = DOMPurify.sanitize(error.message || 'An error occurred');
    return `<div class="error-message" role="alert">${sanitizedMessage}</div>`;
}

/**
 * Executes JavaScript code in a sandboxed environment using Web Workers.
 * @param {string} code - The JavaScript code to execute.
 * @returns {Promise<object>} The result of the execution.
 */
export async function executeCode(code) {
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
        logger.error('executeCode: Failed to execute code', error);
        return { success: false, error: error.message };
    }
}

// Event delegation for handling copy and execute button clicks
document.addEventListener('click', async (event) => {
    const target = event.target;

    if (target.classList.contains('copy-button')) {
        await handleCopyButton(target);
    } else if (target.classList.contains('execute-button')) {
        await handleExecuteButton(target);
    }
});

/**
 * Handles the copy button functionality.
 * @param {HTMLElement} button - The copy button that was clicked.
 */
async function handleCopyButton(button) {
    const codeElement = button.closest('.code-block')?.querySelector('code');
    if (codeElement) {
        try {
            await navigator.clipboard.writeText(codeElement.textContent);
            provideFeedback(button, 'Copied!', true);
        } catch (err) {
            logger.error('Failed to copy text:', err);
            provideFeedback(button, 'Failed', false);
        }
    }
}

/**
 * Handles the execute button functionality.
 * @param {HTMLElement} button - The execute button that was clicked.
 */
async function handleExecuteButton(button) {
    const codeElement = button.closest('.code-block')?.querySelector('code');
    const languageMatch = codeElement?.className.match(/language-(\w+)/);
    const language = languageMatch ? languageMatch[1] : 'plaintext';

    if (codeElement && language === 'javascript') {
        if (button.disabled) return;

        const code = codeElement.textContent;
        button.textContent = 'Executing...';
        button.disabled = true;

        const result = await executeCode(code);

        displayExecutionResult(button, result);
        button.textContent = 'Execute';
        button.disabled = false;
    }
}

/**
 * Provides feedback to the user after copy or execute actions.
 * @param {HTMLElement} button - The button to update.
 * @param {string} message - The feedback message.
 * @param {boolean} isSuccess - Indicates if the action was successful.
 */
function provideFeedback(button, message, isSuccess) {
    const originalText = 'Copy';
    button.textContent = message;
    button.classList.add(isSuccess ? 'success' : 'error');

    setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('success', 'error');
    }, 2000);
}

/**
 * Displays the result of code execution.
 * @param {HTMLElement} button - The execute button.
 * @param {object} result - The result object from executeCode.
 */
function displayExecutionResult(button, result) {
    const codeBlock = button.closest('.code-block');
    let resultDiv = codeBlock.nextElementSibling;

    if (!resultDiv || (!resultDiv.classList.contains('execution-result') && !resultDiv.classList.contains('execution-error'))) {
        resultDiv = document.createElement('div');
        codeBlock.insertAdjacentElement('afterend', resultDiv);
    }

    if (result.success) {
        resultDiv.className = 'execution-result';
        resultDiv.setAttribute('role', 'status');
        resultDiv.textContent = result.result;
    } else {
        resultDiv.className = 'execution-error';
        resultDiv.setAttribute('role', 'alert');
        resultDiv.textContent = result.error;
    }
}
