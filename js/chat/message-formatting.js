import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';
import hljs from 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.7.0/build/es/highlight.min.js';

export function addMessageToChat(role, content, chatContainer) {
    if (!chatContainer) {
        console.error('Chat container is null or undefined');
        return;
    }
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    messageDiv.innerHTML = `
        <div class="message-header">${role.charAt(0).toUpperCase() + role.slice(1)}:</div>
        <div class="message-content">${formatContent(content)}</div>
    `;
    chatContainer.appendChild(messageDiv);
    return messageDiv;
}

export function updateMessageContent(messageDiv, content) {
    const contentDiv = messageDiv.querySelector('.message-content');
    contentDiv.innerHTML = formatContent(content);
}

export function formatContent(text) {
    const formattedText = marked.parse(text);
    return formattedText.replace(/<pre><code class="language-(\w+)">([\s\S]+?)<\/code><\/pre>/g, (match, language, code) => {
        const highlightedCode = hljs.highlight(code, { language }).value;
        return `<pre><code class="hljs language-${language}">${highlightedCode}</code></pre>`;
    });
}
