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
        <div class="message-header">${role.charAt(0).toUpperCase() + role.slice(1)}</div>
        <div class="message-content">${formatContent(content)}</div>
    `;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return messageDiv;
}

export function updateMessageContent(messageDiv, content) {
    const contentDiv = messageDiv.querySelector('.message-content');
    contentDiv.innerHTML = formatContent(content);
}

export function formatContent(content) {
    if (typeof content === 'object') {
        content = JSON.stringify(content, null, 2);
    }
    return marked.parse(content);
}
