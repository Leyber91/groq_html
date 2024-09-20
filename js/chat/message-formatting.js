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
 * 
 * How it works:
 * 1. Creates a new div element for the message
 * 2. Adds appropriate CSS classes based on the role
 * 3. Sanitizes and formats the content
 * 4. Creates different HTML structures for 'layer' and other roles
 * 5. Appends the message to the container and scrolls to the bottom
 * 
 * Usage example:
 * ```javascript
 * const container = document.getElementById('chat-container');
 * const messageElement = addMessageToChat('user', 'Hello, world!', container);
 * ```
 * 
 * Files that use this function:
 * - js/chat/chat-interface.js
 * - js/chat/message-handler.js
 * 
 * Role in overall program logic:
 * This function is crucial for displaying messages in the chat interface. It handles the creation and formatting of message elements, ensuring proper sanitization and structure based on the message role.
 * 
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
 * 
 * How it works:
 * 1. Finds the content div within the message element
 * 2. Sanitizes and formats the new content
 * 3. Updates the innerHTML of the content div
 * 
 * Usage example:
 * ```javascript
 * const messageDiv = document.querySelector('.message');
 * updateMessageContent(messageDiv, 'Updated content');
 * ```
 * 
 * Files that use this function:
 * - js/chat/chat-interface.js
 * - js/chat/message-handler.js
 * 
 * Role in overall program logic:
 * This function allows for dynamic updating of message content, which is useful for real-time updates or corrections to existing messages in the chat interface.
 * 
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
 * 
 * How it works:
 * 1. Checks if the content is a valid string
 * 2. Uses the marked library to parse markdown into HTML
 * 3. Handles errors and provides fallback content if necessary
 * 
 * Usage example:
 * ```javascript
 * const rawContent = '# Hello\nThis is **markdown**.';
 * const formattedContent = formatContent(rawContent);
 * ```
 * 
 * Files that use this function:
 * - js/chat/message-formatting.js (internal use)
 * - js/chat/chat-interface.js
 * 
 * Role in overall program logic:
 * This function is essential for rendering rich text content in the chat interface, allowing for markdown formatting and code highlighting.
 * 
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
 * 
 * How it works:
 * 1. Uses a regular expression to find a pattern like <layer123>
 * 2. Extracts the number from the matched pattern
 * 3. Returns the parsed integer or null if not found
 * 
 * Usage example:
 * ```javascript
 * const content = 'This is <layer5> content';
 * const layerNumber = extractLayerNumber(content); // Returns 5
 * ```
 * 
 * Files that use this function:
 * - js/chat/message-formatting.js (internal use)
 * 
 * Role in overall program logic:
 * This function helps identify and extract layer numbers from message content, which is useful for organizing and displaying layered messages in the chat interface.
 * 
 * @param {string} content - The message content.
 * @returns {number|null} The layer number or null if not found.
 */
function extractLayerNumber(content) {
    const match = typeof content === 'string' ? content.match(/<layer(\d+)>/) : null;
    return match ? parseInt(match[1], 10) : null;
}

/**
 * Sets up the toggle functionality for agent visibility.
 * 
 * How it works:
 * 1. Finds the toggle button and agents content div within the message
 * 2. Adds a click event listener to the toggle button
 * 3. Toggles the visibility of the agents content and updates button text
 * 
 * Usage example:
 * ```javascript
 * const messageDiv = document.querySelector('.layer-message');
 * setupToggleAgents(messageDiv);
 * ```
 * 
 * Files that use this function:
 * - js/chat/message-formatting.js (internal use)
 * 
 * Role in overall program logic:
 * This function enhances the user interface by allowing users to show or hide additional agent information within layer messages, improving the overall interactivity of the chat interface.
 * 
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
 * 
 * How it works:
 * 1. Takes the first character of the string and converts it to uppercase
 * 2. Concatenates the capitalized first letter with the rest of the string
 * 
 * Usage example:
 * ```javascript
 * const role = 'user';
 * const capitalizedRole = capitalizeFirstLetter(role); // Returns 'User'
 * ```
 * 
 * Files that use this function:
 * - js/chat/message-formatting.js (internal use)
 * 
 * Role in overall program logic:
 * This utility function is used to improve the display of role names in the chat interface, ensuring consistent capitalization of role labels.
 * 
 * @param {string} string - The string to capitalize.
 * @returns {string} The capitalized string.
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Smoothly scrolls the container to the bottom.
 * 
 * How it works:
 * 1. Uses the scrollTo method with smooth behavior
 * 2. Sets the scroll position to the full height of the element
 * 
 * Usage example:
 * ```javascript
 * const chatContainer = document.getElementById('chat-container');
 * smoothScrollToBottom(chatContainer);
 * ```
 * 
 * Files that use this function:
 * - js/chat/message-formatting.js (internal use)
 * - js/chat/chat-interface.js
 * 
 * Role in overall program logic:
 * This function ensures that the chat container always shows the most recent messages by scrolling to the bottom after new content is added, improving the user experience.
 * 
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
 * 
 * How it works:
 * 1. Sanitizes the input code
 * 2. Applies syntax highlighting using highlight.js
 * 3. Creates a container with copy and (optionally) execute buttons
 * 4. Wraps the highlighted code in a pre and code element
 * 
 * Usage example:
 * ```javascript
 * const code = 'console.log("Hello, world!");';
 * const codeBlock = createCodeBlock(code, 'javascript');
 * document.body.innerHTML = codeBlock;
 * ```
 * 
 * Files that use this function:
 * - js/chat/message-formatting.js (internal use)
 * - js/chat/chat-interface.js
 * 
 * Role in overall program logic:
 * This function enhances the display of code snippets in the chat interface, providing syntax highlighting and interactive features like copying and executing JavaScript code.
 * 
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
 * 
 * How it works:
 * 1. Sanitizes the error message to prevent XSS attacks
 * 2. Wraps the sanitized message in a div with appropriate CSS class and ARIA role
 * 
 * Usage example:
 * ```javascript
 * const error = new Error('Something went wrong');
 * const errorHtml = formatError(error);
 * document.body.innerHTML = errorHtml;
 * ```
 * 
 * Files that use this function:
 * - js/chat/message-formatting.js (internal use)
 * - js/chat/error-handler.js
 * 
 * Role in overall program logic:
 * This function provides a consistent and secure way to display error messages in the chat interface, enhancing user feedback and maintaining accessibility standards.
 * 
 * @param {Error} error - The error to format.
 * @returns {string} The HTML string for the error message.
 */
export function formatError(error) {
    const sanitizedMessage = DOMPurify.sanitize(error.message || 'An error occurred');
    return `<div class="error-message" role="alert">${sanitizedMessage}</div>`;
}

/**
 * Executes JavaScript code in a sandboxed environment using Web Workers.
 * 
 * How it works:
 * 1. Creates a Blob containing a Web Worker script
 * 2. The Web Worker script evaluates the provided code
 * 3. Results or errors are posted back to the main thread
 * 4. The worker is terminated after execution
 * 
 * Usage example:
 * ```javascript
 * const code = 'return 2 + 2;';
 * executeCode(code).then(result => console.log(result));
 * ```
 * 
 * Files that use this function:
 * - js/chat/message-formatting.js (internal use)
 * - js/chat/code-execution.js
 * 
 * Role in overall program logic:
 * This function provides a safe way to execute user-provided JavaScript code, isolating it from the main application to prevent potential security risks while allowing interactive code demonstrations in the chat interface.
 * 
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
 * 
 * How it works:
 * 1. Finds the associated code element
 * 2. Copies the code text to the clipboard
 * 3. Provides visual feedback to the user
 * 
 * Usage example:
 * This function is called internally by the event listener.
 * 
 * Files that use this function:
 * - js/chat/message-formatting.js (internal use)
 * 
 * Role in overall program logic:
 * This function enhances the user experience by allowing easy copying of code snippets from the chat interface.
 * 
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
 * 
 * How it works:
 * 1. Finds the associated code element and determines the language
 * 2. If it's JavaScript, executes the code using executeCode function
 * 3. Displays the execution result or error
 * 
 * Usage example:
 * This function is called internally by the event listener.
 * 
 * Files that use this function:
 * - js/chat/message-formatting.js (internal use)
 * 
 * Role in overall program logic:
 * This function allows users to execute JavaScript code snippets directly in the chat interface, providing an interactive coding experience.
 * 
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
 * 
 * How it works:
 * 1. Updates the button text with the feedback message
 * 2. Adds a CSS class for visual feedback
 * 3. Resets the button after a short delay
 * 
 * Usage example:
 * ```javascript
 * provideFeedback(button, 'Copied!', true);
 * ```
 * 
 * Files that use this function:
 * - js/chat/message-formatting.js (internal use)
 * 
 * Role in overall program logic:
 * This function enhances user experience by providing immediate visual feedback for user actions on code blocks.
 * 
 * @param {HTMLElement} button - The button to update.
 * @param {string} message - The feedback message.
 * @param {boolean} isSuccess - Indicates if the action was successful.
 */
function provideFeedback(button, message, isSuccess) {
    const originalText = button.textContent;
    button.textContent = message;
    button.classList.add(isSuccess ? 'success' : 'error');

    setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('success', 'error');
    }, 2000);
}

/**
 * Displays the result of code execution.
 * 
 * How it works:
 * 1. Finds or creates a result div next to the code block
 * 2. Updates the content and styling based on execution success or failure
 * 3. Sets appropriate ARIA attributes for accessibility
 * 
 * Usage example:
 * ```javascript
 * const result = { success: true, result: '4' };
 * displayExecutionResult(executeButton, result);
 * ```
 * 
 * Files that use this function:
 * - js/chat/message-formatting.js (internal use)
 * 
 * Role in overall program logic:
 * This function is crucial for displaying the results of executed JavaScript code in the chat interface, providing immediate feedback to the user.
 * 
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
