// artifacts.js

import hljs from 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.7.0/build/es/highlight.min.js';
import { formatContent } from './message-formatting.js';

/**
 * Generates artifacts (code blocks and images) from the response.
 * @param {string} response - The response text to parse.
 * @returns {Array} An array of artifact objects.
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
 * Adds artifacts to the chat container.
 * @param {Array} artifacts - An array of artifact objects.
 * @param {HTMLElement} chatContainer - The container to append artifacts to.
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
                <div class="artifact-content">
                    <pre><code class="hljs ${languageClass}">${highlightedCode}</code></pre>
                </div>
                <button class="copy-button" aria-label="Copy code">Copy</button>
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
 * Copies the code content to the clipboard.
 * @param {HTMLElement} button - The copy button that was clicked.
 */
function copyToClipboard(button) {
    const codeElement = button.closest('.artifact-code')?.querySelector('code');

    if (!codeElement) {
        console.error('Code element not found for copying.');
        return;
    }

    const codeText = codeElement.textContent;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(codeText)
            .then(() => updateButtonState(button, true))
            .catch((err) => {
                console.error('Failed to copy text:', err);
                updateButtonState(button, false);
            });
    } else {
        // Fallback for insecure contexts
        const textArea = document.createElement('textarea');
        textArea.value = codeText;
        textArea.style.position = 'fixed'; // Prevent scrolling to bottom
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            updateButtonState(button, successful);
        } catch (err) {
            console.error('Fallback: Unable to copy', err);
            updateButtonState(button, false);
        }

        document.body.removeChild(textArea);
    }
}

/**
 * Updates the state of the copy button based on success or failure.
 * @param {HTMLElement} button - The copy button to update.
 * @param {boolean} success - Whether the copy action was successful.
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
 * Handles the addition of a single artifact to the chat container.
 * @param {Object} artifact - The artifact object to handle.
 * @param {HTMLElement} chatContainer - The container to append the artifact to.
 */
export function handleArtifact(artifact, chatContainer) {
    const artifactDiv = document.createElement('div');
    artifactDiv.className = `artifact artifact-${artifact.type}`;

    const artifactHeader = document.createElement('div');
    artifactHeader.className = 'artifact-header';
    artifactHeader.textContent = 'Generated Artifact:';
    artifactDiv.appendChild(artifactHeader);

    const artifactContent = document.createElement('div');
    artifactContent.className = 'artifact-content';

    if (artifact.type === 'code') {
        const languageClass = artifact.language ? `language-${artifact.language}` : '';
        const highlightedCode = hljs.highlightAuto(artifact.content, [artifact.language]).value;
        artifactContent.innerHTML = `
            <pre><code class="hljs ${languageClass}">${highlightedCode}</code></pre>
        `;
    } else if (artifact.type === 'image') {
        artifactContent.innerHTML = `
            <figure>
                <img src="${artifact.url}" alt="${artifact.alt}" loading="lazy" onerror="this.onerror=null; this.src='path/to/fallback-image.jpg';">
                <figcaption>${artifact.alt}</figcaption>
            </figure>
        `;
    }

    artifactDiv.appendChild(artifactContent);

    if (artifact.type === 'code') {
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = 'Copy';
        copyButton.setAttribute('aria-label', 'Copy code');
        copyButton.addEventListener('click', () => copyToClipboard(copyButton));
        artifactDiv.appendChild(copyButton);
    }

    if (artifact.metadata) {
        const metadataDiv = document.createElement('div');
        metadataDiv.className = 'artifact-metadata';
        metadataDiv.innerHTML = `<strong>Metadata:</strong> ${JSON.stringify(artifact.metadata)}`;
        artifactDiv.appendChild(metadataDiv);
    }

    chatContainer.appendChild(artifactDiv);
}

/**
 * Updates an existing artifact with new content and metadata.
 * @param {HTMLElement} artifactDiv - The artifact element to update.
 * @param {string} newContent - The new content for the artifact.
 * @param {Object} newMetadata - The new metadata for the artifact.
 */
export function updateArtifact(artifactDiv, newContent, newMetadata) {
    const contentDiv = artifactDiv.querySelector('.artifact-content');
    if (contentDiv) {
        if (artifactDiv.classList.contains('artifact-code')) {
            const language = artifactDiv.querySelector('code')?.classList?.[1]?.split('-')[1] || 'plaintext';
            const highlightedCode = hljs.highlightAuto(newContent, [language]).value;
            contentDiv.innerHTML = `<pre><code class="hljs language-${language}">${highlightedCode}</code></pre>`;
        } else if (artifactDiv.classList.contains('artifact-image')) {
            contentDiv.innerHTML = `
                <figure>
                    <img src="${newContent}" alt="${newMetadata?.alt || 'Image'}" loading="lazy" onerror="this.onerror=null; this.src='path/to/fallback-image.jpg';">
                    <figcaption>${newMetadata?.alt || ''}</figcaption>
                </figure>
            `;
        }
    }

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
