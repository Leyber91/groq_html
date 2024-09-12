import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';
import hljs from 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.7.0/build/es/highlight.min.js';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify/dist/purify.es.mjs';

const markedOptions = {
    highlight: (code, lang) => {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-',
    breaks: true,
    gfm: true
};

marked.setOptions(markedOptions);

export function addMessageToChat(role, content, container) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    if (role === 'layer') {
        const layerNumber = content.match(/<layer(\d+)>/)[1];
        messageDiv.innerHTML = `
            <div class="message-header">
                Layer ${layerNumber}
                <button class="toggle-agents">Show Agents</button>
            </div>
            <div class="message-content">${formatContent(content)}</div>
            <div class="agents-content" style="display: none;"></div>
        `;
        
        const toggleButton = messageDiv.querySelector('.toggle-agents');
        const agentsContent = messageDiv.querySelector('.agents-content');
        
        toggleButton.addEventListener('click', () => {
            const isHidden = agentsContent.style.display === 'none';
            agentsContent.style.display = isHidden ? 'block' : 'none';
            toggleButton.textContent = isHidden ? 'Hide Agents' : 'Show Agents';
        });
    } else {
        messageDiv.innerHTML = `
            <div class="message-header">${role.charAt(0).toUpperCase() + role.slice(1)}</div>
            <div class="message-content">${formatContent(content)}</div>
        `;
    }
    
    container.appendChild(messageDiv);
    return messageDiv;
}

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

export function formatContent(content) {
    if (typeof content !== 'string') {
        content = JSON.stringify(content, null, 2);
    }
    
    const layers = content.split(/(?=<layer\d+>)/);
    
    let formattedContent = '';
    layers.forEach((layer) => {
        if (layer.trim()) {
            const layerMatch = layer.match(/<layer(\d+)>([\s\S]*?)(?=<\/layer\1>|$)/);
            if (layerMatch) {
                const layerNumber = layerMatch[1];
                const layerContent = layerMatch[2];
                const agents = layerContent.split(/(?=<agent\d+>)/);
                
                let agentsHtml = '';
                agents.forEach((agent) => {
                    const agentMatch = agent.match(/<agent(\d+)>([\s\S]*?)(?=<\/agent\1>|$)/);
                    if (agentMatch) {
                        const agentNumber = agentMatch[1];
                        const agentContent = agentMatch[2];
                        agentsHtml += `
                            <div class="agent-message">
                                <div class="agent-header">Agent ${agentNumber}</div>
                                <div class="agent-content">${marked.parse(agentContent)}</div>
                            </div>
                        `;
                    }
                });
                
                formattedContent += `
                    <div class="layer-summary">${marked.parse(layerContent.replace(/<agent\d+>[\s\S]*?<\/agent\d+>/g, ''))}</div>
                    <div class="agents-content" style="display: none;">${agentsHtml}</div>
                `;
            } else {
                formattedContent += marked.parse(layer);
            }
        }
    });
    
    return DOMPurify.sanitize(formattedContent);
}

function smoothScrollToBottom(element) {
    const targetScrollTop = element.scrollHeight - element.clientHeight;
    const startScrollTop = element.scrollTop;
    const distance = targetScrollTop - startScrollTop;
    const duration = 300; // milliseconds
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = easeInOutQuad(timeElapsed, startScrollTop, distance, duration);
        element.scrollTop = run;
        if (timeElapsed < duration) requestAnimationFrame(animation);
    }

    function easeInOutQuad(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    requestAnimationFrame(animation);
}

export function createCodeBlock(code, language) {
    const escapedCode = DOMPurify.sanitize(code);
    const highlightedCode = hljs.highlight(escapedCode, { language }).value;
    return `<pre><code class="hljs language-${language}">${highlightedCode}</code></pre>`;
}

export function formatError(error) {
    return `<div class="error-message">${DOMPurify.sanitize(error.message || 'An error occurred')}</div>`;
}
