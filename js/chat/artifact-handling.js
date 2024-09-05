import { formatContent } from './message-formatting.js';
import hljs from 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.7.0/build/es/highlight.min.js';

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
