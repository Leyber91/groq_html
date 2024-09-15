import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';
import hljs from 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.7.0/build/es/highlight.min.js';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify/dist/purify.es.mjs';


// Configure marked with enhanced options
const markedOptions = {
    highlight: (code, lang) => {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-',
    breaks: true,
    gfm: true,
    sanitize: false, // We'll handle sanitization separately
};

marked.setOptions(markedOptions);

/**
 * Adds a message to the chat container.
 * @param {string} role - The role of the message sender (e.g., 'user', 'layer').
 * @param {string|object} content - The content of the message.
 * @param {HTMLElement} container - The chat container element.
 * @returns {HTMLElement} The created message element.
 */
export function addMessageToChat(role, content, container) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;

    // Sanitize and format the content
    const sanitizedContent = DOMPurify.sanitize(formatContent(content));

    if (role === 'layer') {
        const layerMatch = content.match(/<layer(\d+)>/);
        const layerNumber = layerMatch ? layerMatch[1] : 'Unknown';
        
        messageDiv.innerHTML = `
            <div class="message-header">
                Layer ${layerNumber}
                <button class="toggle-agents" aria-label="Toggle agent visibility" aria-expanded="false">
                    Show Agents
                </button>
            </div>
            <div class="message-content">${sanitizedContent}</div>
            <div class="agents-content" hidden></div>
        `;

        const toggleButton = messageDiv.querySelector('.toggle-agents');
        const agentsContent = messageDiv.querySelector('.agents-content');

        toggleButton.addEventListener('click', () => {
            const isHidden = agentsContent.hasAttribute('hidden');
            agentsContent.hidden = !isHidden;
            toggleButton.textContent = isHidden ? 'Hide Agents' : 'Show Agents';
            toggleButton.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        });
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
        console.error('Message div is null or undefined');
        return;
    }
    const contentDiv = messageDiv.querySelector('.message-content');
    if (contentDiv) {
        contentDiv.innerHTML = DOMPurify.sanitize(formatContent(content));
    } else {
        console.error('Content div not found in message');
    }
}

/**
 * Formats the message content by processing code blocks and converting markdown to HTML.
 * @param {string|object} content - The raw message content.
 * @returns {string} The formatted HTML content.
 */
export function formatContent(content) {
    let textContent = typeof content !== 'string' ? JSON.stringify(content, null, 2) : content;

    // Convert markdown to HTML
    let htmlContent = marked.parse(textContent);

    // Enhance code blocks with copy and execute buttons
    htmlContent = htmlContent.replace(
        /<pre><code class="hljs language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
        (match, lang, code) => `
            <div class="code-block">
                <button class="copy-button" aria-label="Copy code">Copy</button>
                ${lang.toLowerCase() === 'javascript' ? '<button class="execute-button" aria-label="Execute code">Execute</button>' : ''}
                <pre><code class="hljs language-${lang}">${code}</code></pre>
            </div>
        `
    );

    return htmlContent;
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
    return `
        <div class="code-block">
            <button class="copy-button" aria-label="Copy code">Copy</button>
            ${language.toLowerCase() === 'javascript' ? '<button class="execute-button" aria-label="Execute code">Execute</button>' : ''}
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
 * Executes JavaScript code in a sandboxed environment.
 * @param {string} code - The JavaScript code to execute.
 * @returns {Promise<object>} The result of the execution.
 */
export async function executeCode(code, language) {
    if (language.toLowerCase() === 'javascript') {
        try {
            // Use a Web Worker for safer execution
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
            return { success: false, error: error.message };
        }
    } else {
        return { success: false, error: `Execution not supported for ${language}` };
    }
}

// Event delegation for handling copy and execute button clicks
document.addEventListener('click', async (event) => {
    const target = event.target;

    if (target.classList.contains('copy-button')) {
        const codeElement = target.closest('.code-block')?.querySelector('code');
        if (codeElement) {
            try {
                await navigator.clipboard.writeText(codeElement.textContent);
                target.textContent = 'Copied!';
                target.disabled = true;
                setTimeout(() => {
                    target.textContent = 'Copy';
                    target.disabled = false;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy text:', err);
                target.textContent = 'Failed';
                setTimeout(() => {
                    target.textContent = 'Copy';
                }, 2000);
            }
        }
    } else if (target.classList.contains('execute-button')) {
        const codeElement = target.closest('.code-block')?.querySelector('code');
        const language = codeElement?.className.match(/language-(\w+)/)?.[1];

        if (codeElement && language) {
            // Prevent multiple executions
            if (target.disabled) return;

            const code = codeElement.textContent;
            target.textContent = 'Executing...';
            target.disabled = true;

            const result = await executeCode(code, language);

            // Create or update the result message
            let resultDiv = target.closest('.code-block').nextElementSibling;
            if (!resultDiv || !resultDiv.classList.contains('execution-result') && !resultDiv.classList.contains('execution-error')) {
                resultDiv = document.createElement('div');
                target.closest('.code-block').insertAdjacentElement('afterend', resultDiv);
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

            // Reset the execute button
            target.textContent = 'Execute';
            target.disabled = false;
        }
    }
});
