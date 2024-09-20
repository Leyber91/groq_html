import { formatContent } from './message-formatting.js';
import hljs from 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.7.0/build/es/highlight.min.js';

/**
 * Generates artifacts from a given response string.
 * 
 * This function parses the response for code blocks and images, creating
 * artifact objects for each found item.
 * 
 * @param {string} response - The response string to parse for artifacts.
 * @returns {Array} An array of artifact objects.
 * 
 * Usage example:
 * const response = "Here's some code: ```js\nconsole.log('Hello');\n``` And an image: ![alt text](https://example.com/image.jpg)";
 * const artifacts = generateArtifacts(response);
 * 
 * Used in:
 * - js/chat/chat-interface.js
 * - js/chat/message-processing.js
 * 
 * Role in program logic:
 * This function is crucial for identifying and extracting structured content
 * (code and images) from the chat responses. It enables the application to
 * handle these special elements differently from plain text, enhancing the
 * user experience by providing syntax highlighting for code and proper
 * display for images.
 */
export function generateArtifacts(response) {
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
 * Adds artifacts to the chat container in the DOM.
 * 
 * This function creates and appends DOM elements for each artifact,
 * handling different types (code and image) appropriately.
 * 
 * @param {Array} artifacts - An array of artifact objects to add to the chat.
 * @param {HTMLElement} chatContainer - The container element to append artifacts to.
 * 
 * Usage example:
 * const artifacts = generateArtifacts(responseString);
 * const chatContainer = document.getElementById('chat-container');
 * addArtifactsToChat(artifacts, chatContainer);
 * 
 * Used in:
 * - js/chat/chat-interface.js
 * - js/chat/message-display.js
 * 
 * Role in program logic:
 * This function is responsible for rendering artifacts in the chat interface.
 * It enhances the chat experience by properly formatting and displaying code
 * snippets with syntax highlighting and images with captions and full-view options.
 */
export function addArtifactsToChat(artifacts, chatContainer) {
    artifacts.forEach(artifact => {
        const artifactDiv = document.createElement('div');
        artifactDiv.className = `artifact artifact-${artifact.type}`;
        
        if (artifact.type === 'code') {
            const languageClass = artifact.language ? `language-${artifact.language}` : '';
            const highlightedCode = hljs.highlightAuto(artifact.content, [artifact.language]).value;
            artifactDiv.innerHTML = `
                <div class="artifact-header">
                    <span class="artifact-type">Code</span>
                    <span class="artifact-language">${artifact.language || 'Unknown'}</span>
                </div>
                <pre><code class="hljs ${languageClass}">${highlightedCode}</code></pre>
                <button class="copy-button">Copy</button>
            `;
            const copyButton = artifactDiv.querySelector('.copy-button');
            copyButton.addEventListener('click', () => copyToClipboard(copyButton));
        } else if (artifact.type === 'image') {
            artifactDiv.innerHTML = `
                <div class="artifact-header">
                    <span class="artifact-type">Image</span>
                </div>
                <figure>
                    <img src="${artifact.url}" alt="${artifact.alt}" loading="lazy" onerror="this.onerror=null; this.src='path/to/fallback-image.jpg';">
                    <figcaption>${artifact.alt}</figcaption>
                </figure>
                <a href="${artifact.url}" target="_blank" rel="noopener noreferrer" class="view-full-image">View Full Image</a>
            `;
        }
        
        chatContainer.appendChild(artifactDiv);
    });
}

/**
 * Copies the content of a code artifact to the clipboard.
 * 
 * This function attempts to use the Clipboard API if available,
 * falling back to the execCommand method if not.
 * 
 * @param {HTMLElement} button - The button element that triggered the copy action.
 * 
 * Usage example:
 * const copyButton = document.querySelector('.copy-button');
 * copyButton.addEventListener('click', () => copyToClipboard(copyButton));
 * 
 * Used in:
 * - Internally in addArtifactsToChat function
 * 
 * Role in program logic:
 * This function enhances user experience by providing an easy way to copy
 * code snippets from the chat interface. It's a quality-of-life feature
 * that saves users time and reduces errors when working with shared code.
 */
function copyToClipboard(button) {
    const codeElement = button.closest('.artifact-code').querySelector('code');
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(codeElement.textContent)
            .then(() => updateButtonState(button, true))
            .catch((err) => {
                console.error('Failed to copy text: ', err);
                updateButtonState(button, false);
            });
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = codeElement.textContent;
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            updateButtonState(button, successful);
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            updateButtonState(button, false);
        }

        document.body.removeChild(textArea);
    }
}

/**
 * Updates the state of the copy button after a copy attempt.
 * 
 * This function changes the button text and styling to indicate
 * the success or failure of the copy operation.
 * 
 * @param {HTMLElement} button - The button element to update.
 * @param {boolean} success - Whether the copy operation was successful.
 * 
 * Usage example:
 * updateButtonState(copyButton, true);
 * 
 * Used in:
 * - Internally in copyToClipboard function
 * 
 * Role in program logic:
 * This function provides visual feedback to the user about the result
 * of their copy action, enhancing the overall user experience and
 * making the interface more intuitive and responsive.
 */
function updateButtonState(button, success) {
    const originalText = 'Copy';
    const successText = 'Copied!';
    const failureText = 'Failed to copy';

    button.textContent = success ? successText : failureText;
    button.classList.add(success ? 'success' : 'error');

    setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('success', 'error');
    }, 2000);
}

/**
 * Handles the display of a single artifact in the chat container.
 * 
 * This function creates and appends a DOM element for the artifact,
 * including its content and metadata if available.
 * 
 * @param {Object} artifact - The artifact object to display.
 * @param {HTMLElement} chatContainer - The container element to append the artifact to.
 * 
 * Usage example:
 * const artifact = { content: 'Hello, world!', metadata: { type: 'greeting' } };
 * const chatContainer = document.getElementById('chat-container');
 * handleArtifact(artifact, chatContainer);
 * 
 * Used in:
 * - js/chat/chat-interface.js
 * - js/chat/message-display.js
 * 
 * Role in program logic:
 * This function is responsible for rendering individual artifacts in the chat interface.
 * It's used when new artifacts are generated or received, ensuring they are properly
 * displayed with their content and any associated metadata.
 */
export function handleArtifact(artifact, chatContainer) {
    const artifactDiv = document.createElement('div');
    artifactDiv.className = 'artifact';

    const artifactHeader = document.createElement('div');
    artifactHeader.className = 'artifact-header';
    artifactHeader.textContent = 'Generated Artifact:';
    artifactDiv.appendChild(artifactHeader);

    const artifactContent = document.createElement('div');
    artifactContent.className = 'artifact-content';
    artifactContent.innerHTML = formatContent(artifact.content);
    artifactDiv.appendChild(artifactContent);

    if (artifact.metadata) {
        const metadataDiv = document.createElement('div');
        metadataDiv.className = 'artifact-metadata';
        metadataDiv.innerHTML = `<strong>Metadata:</strong> ${JSON.stringify(artifact.metadata)}`;
        artifactDiv.appendChild(metadataDiv);
    }

    chatContainer.appendChild(artifactDiv);
}

/**
 * Updates an existing artifact in the chat container.
 * 
 * This function modifies the content and metadata of an existing artifact element.
 * 
 * @param {HTMLElement} artifactDiv - The artifact div element to update.
 * @param {string} newContent - The new content for the artifact.
 * @param {Object} newMetadata - The new metadata for the artifact.
 * 
 * Usage example:
 * const artifactDiv = document.querySelector('.artifact');
 * updateArtifact(artifactDiv, 'Updated content', { type: 'updated' });
 * 
 * Used in:
 * - js/chat/chat-interface.js
 * - js/chat/artifact-management.js
 * 
 * Role in program logic:
 * This function allows for dynamic updating of artifacts in the chat interface.
 * It's useful when artifact content or metadata needs to be modified after
 * initial display, such as when receiving updated information from the server.
 */
export function updateArtifact(artifactDiv, newContent, newMetadata) {
    const contentDiv = artifactDiv.querySelector('.artifact-content');
    contentDiv.innerHTML = formatContent(newContent);

    if (newMetadata) {
        let metadataDiv = artifactDiv.querySelector('.artifact-metadata');
        if (!metadataDiv) {
            metadataDiv = document.createElement('div');
            metadataDiv.className = 'artifact-metadata';
            artifactDiv.appendChild(metadataDiv);
        }
        metadataDiv.innerHTML = `<strong>Metadata:</strong> ${JSON.stringify(newMetadata)}`;
    }
}
