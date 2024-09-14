function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

import { moaConfig, availableModels, updateMOAConfig as configUpdateMOAConfig } from '../config/config.js';
import { generateUniqueId } from '../utils/idGenerator.js';
import { MODEL_INFO } from '../config/model-config.js';
import { getModelInfo, getModelContextWindow } from '../api/modelInfo/model-info.js';


function responsivefy(svg) {
  const container = d3.select(svg.node().parentNode),
      width = parseInt(svg.style('width')),
      height = parseInt(svg.style('height')),
      aspect = width / height;

  svg.attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMinYMid')
      .call(resize);

  d3.select(window).on('resize.' + container.attr('id'), resize);

  function resize() {
    const targetWidth = parseInt(container.style('width'));
    svg.attr('width', targetWidth);
    svg.attr('height', Math.round(targetWidth / aspect));
  }
}


let nodeMap = new Map();
export function createMOADiagram() {
    return new Promise((resolve) => {
        if (!moaConfig || !moaConfig.layers || moaConfig.layers.length === 0) {
            console.warn('MOA configuration not fully loaded. Skipping diagram creation.');
            resolve();
            return;
        }
    
    let nodeMap = new Map();
    const container = d3.select('#moa-diagram');
    container.selectAll('*').remove();
    
    const containerRect = container.node().getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    const diagramWidth = width * 0.95;
    const diagramHeight = height * 0.95;
    const margin = { top: height * 0.025, left: width * 0.025 };
        
    const layerWidth = diagramWidth / (moaConfig.layers.length + 1);
    const layerHeight = diagramHeight;

    const nodes = [];
    const links = [];
    
    // Create nodes and links for each layer and agent
    nodeMap.clear(); // Clear the existing map before populating it
    moaConfig.layers.forEach((layer, layerIndex) => {
        const layerX = margin.left + (layerIndex + 1) * layerWidth;
        layer.forEach((agent, agentIndex) => {
            const agentY = margin.top + (agentIndex + 1) * (layerHeight / (layer.length + 1));
            const nodeId = `layer${layerIndex}_agent${agentIndex}`;
            nodes.push({
                id: nodeId,
                x: layerX,
                y: agentY,
                layer: layerIndex,
                agent: agentIndex,
                ...agent
            });
            // Add this node to a global map for easy access
            nodeMap.set(nodeId, nodes[nodes.length - 1]);

            // Connect to previous layer nodes
            if (layerIndex > 0) {
                moaConfig.layers[layerIndex - 1].forEach((prevAgent, prevAgentIndex) => {
                    const prevNodeId = `layer${layerIndex-1}_agent${prevAgentIndex}`;
                    const connectionStrength = calculateConnectionStrength(prevAgent, agent);
                    links.push({
                        source: prevNodeId,
                        target: nodeId,
                        weight: connectionStrength
                    });
                });
            }

            // Add self-connection for recurrent behavior
            links.push({
                source: nodeId,
                target: nodeId,
                weight: 0.5,
                type: 'self'
            });
            // Connect to next layer nodes (if not the last layer)
            if (layerIndex < moaConfig.layers.length - 1) {
                moaConfig.layers[layerIndex + 1].forEach((nextAgent, nextAgentIndex) => {
                    const nextNodeId = `layer${layerIndex+1}_agent${nextAgentIndex}`;
                    links.push({
                        source: nodeId,
                        target: nextNodeId,
                        weight: 1,
                        type: 'forward'
                    });
                });
            }
        });
    });
    function calculateConnectionStrength(prevAgent, currentAgent) {
        // Calculate model compatibility
        const modelCompatibility = MODEL_INFO[prevAgent.model_name]?.compatibility?.[currentAgent.model_name] || 0.7;
     
        // Calculate temperature compatibility
        const temperatureCompatibility = 1 - Math.abs(prevAgent.temperature - currentAgent.temperature);

        // Calculate context window compatibility
        const prevContextWindow = getModelContextWindow(prevAgent.model_name);
        const currentContextWindow = getModelContextWindow(currentAgent.model_name);
        const contextWindowCompatibility = Math.min(prevContextWindow, currentContextWindow) / Math.max(prevContextWindow, currentContextWindow);

        // Calculate task compatibility
        const taskCompatibility = calculateTaskCompatibility(prevAgent, currentAgent);

        // Calculate overall connection strength
        const connectionStrength = (
            modelCompatibility * 0.3 +
            temperatureCompatibility * 0.2 +
            contextWindowCompatibility * 0.3 +
            taskCompatibility * 0.2
        );

        return connectionStrength;
    }
    function calculateTaskCompatibility(prevAgent, currentAgent) {
        const prevModelInfo = getModelInfo(prevAgent.model_name);
        const currentModelInfo = getModelInfo(currentAgent.model_name);

        if (!prevModelInfo || !currentModelInfo) {
            return 0.5; // Default compatibility if model info is not available
        }

        const prevTasks = new Set(prevModelInfo.bestFor);
        const currentTasks = new Set(currentModelInfo.bestFor);

        const commonTasks = new Set([...prevTasks].filter(task => currentTasks.has(task)));
        const totalTasks = new Set([...prevTasks, ...currentTasks]);

        return commonTasks.size / totalTasks.size;
    }

    // Add main model node
    nodes.push({
        id: 'main_model',
        x: margin.left + diagramWidth,
        y: margin.top + diagramHeight / 2,
        model_name: moaConfig.main_model,
        temperature: moaConfig.main_temperature
    });

    // Connect last layer to main model
    const lastLayerIndex = moaConfig.layers.length - 1;
    moaConfig.layers[lastLayerIndex].forEach((agent, agentIndex) => {
        links.push({
            source: `layer${lastLayerIndex}_agent${agentIndex}`,
            target: 'main_model',
            weight: 1
        });
    });
    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(layerWidth))
        .force('charge', d3.forceManyBody().strength(-500))
        .force('x', d3.forceX(d => d.x).strength(0.5))
        .force('y', d3.forceY(d => d.y).strength(0.5))
        .on('tick', ticked)
        .restart();

    // Create links
    const link = svg.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('stroke-width', d => Math.sqrt(d.weight))
        .attr('stroke', '#999')
        .attr('opacity', 0.6)
        .attr('filter', 'url(#link-glow)')
        .attr('class', d => d.type);

    // Create nodes
    const node = svg.append('g')
        .attr('class', 'nodes')
        .selectAll('.node')
        .data(nodes)
        .enter().append('g')
        .attr('class', 'node')
        .call(d3.drag()

            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Add circles to nodes
    node.append('circle')
        .attr('r', 30)
        .attr('fill', d => d.id === 'main_model' ? '#ff4136' : '#3498db');

    // Add labels to nodes
    node.append('text')
        .attr('dy', '.3em')
        .attr('text-anchor', 'middle')
        .text(d => d.id === 'main_model' ? 'Main' : `A${d.agent}`);

    // Add model selection dropdown
    node.append('foreignObject')
        .attr('x', -75)
        .attr('y', 40)
        .attr('width', 150)
        .attr('height', 30)
        .html(d => `
            <select class="agent-model" data-id="${d.id}">
                ${availableModels.map(model => `<option value="${model}" ${model === d.model_name ? 'selected' : ''}>${model}</option>`).join('')}
            </select>
        `);

    // Add temperature input
    node.append('foreignObject')
        .attr('x', -75)
        .attr('y', 80)
        .attr('width', 150)
        .attr('height', 30)
        .html(d => `
            <input type="number" class="agent-temperature" data-id="${d.id}" min="0" max="1" step="0.1" value="${d.temperature !== undefined ? d.temperature : 0.5}">
        `);

    // Add 'Add Layer' button
    const addLayerButton = svg.append('g')
        .attr('class', 'add-layer-button')
        .attr('transform', `translate(${width - 120}, ${height - 40})`)
        .style('cursor', 'pointer')
        .on('click', addLayer);

    addLayerButton.append('rect')
        .attr('width', 100)
        .attr('height', 30)
        .attr('rx', 15)
        .attr('ry', 15)
        .attr('fill', '#ff6b6b');

    addLayerButton.append('text')
        .attr('x', 50)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-weight', 'bold')
        .text('Add Layer');

    // Add 'Add Agent' and 'Remove Layer' buttons for each layer
    moaConfig.layers.forEach((layer, layerIndex) => {
        const addAgentButton = svg.append('g')
            .attr('class', 'add-agent-button')
            .attr('transform', `translate(${(layerIndex + 1) * layerWidth - 50}, ${height - 40})`)
            .style('cursor', 'pointer')
            .on('click', () => addAgent(layerIndex));

        addAgentButton.append('rect')
            .attr('width', 100)
            .attr('height', 30)
            .attr('rx', 15)
            .attr('ry', 15)
            .attr('fill', '#4ecdc4');

        addAgentButton.append('text')
            .attr('x', 50)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-weight', 'bold')
            .text('Add Agent');

        if (layerIndex > 0) {
            const removeLayerButton = svg.append('g')
                .attr('class', 'remove-layer-button')
                .attr('transform', `translate(${(layerIndex + 1) * layerWidth - 50}, ${height - 80})`)
                .style('cursor', 'pointer')
                .on('click', () => removeLayer(layerIndex));

            removeLayerButton.append('rect')
                .attr('width', 100)
                .attr('height', 30)
                .attr('rx', 15)
                .attr('ry', 15)
                .attr('fill', '#fc5c65');

            removeLayerButton.append('text')
                .attr('x', 50)
                .attr('y', 20)
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .attr('font-weight', 'bold')
                .text('Remove Layer');
        }
        // Add 'Remove Agent' buttons
        layer.forEach((agent, agentIndex) => {
            if (layer.length > 1) {
                const removeAgentButton = svg.append('g')
                    .attr('class', 'remove-agent-button')
                    .attr('transform', `translate(${(layerIndex + 1) * layerWidth - 25}, ${(agentIndex + 1) * (layerHeight / (layer.length + 1)) + 40})`)
                    .style('cursor', 'pointer')
                    .on('click', () => removeAgent(layerIndex, agentIndex));

                removeAgentButton.append('circle')
                    .attr('r', 12)
                    .attr('fill', '#fc5c65')
                    .attr('filter', 'url(#button-glow)');

                removeAgentButton.append('text')
                    .attr('x', 0)
                    .attr('y', 5)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'white')
                    .attr('font-weight', 'bold')
                    .attr('font-size', '18px')
                    .text('×');

                // Add hover effect
                removeAgentButton
                    .on('mouseover', function() {
                        d3.select(this).select('circle')
                            .transition()
                            .duration(200)
                            .attr('r', 14)
                            .attr('fill', '#ff7675');
                    })
                    .on('mouseout', function() {
                        d3.select(this).select('circle')
                            .transition()
                            .duration(200)
                            .attr('r', 12)
                            .attr('fill', '#fc5c65');
                    });
            }
        });
    });

    // Add glow effects
    const defs = svg.append('defs');
    
    const buttonGlow = defs.append('filter')
        .attr('id', 'button-glow')
        .attr('height', '300%')
        .attr('width', '300%')
        .attr('x', '-75%')
        .attr('y', '-75%');
    
    buttonGlow.append('feGaussianBlur')
        .attr('stdDeviation', '5')
        .attr('result', 'coloredBlur');
    
    const feMerge = buttonGlow.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const nodeGlow = defs.append('filter')
        .attr('id', 'node-glow')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');

    nodeGlow.append('feGaussianBlur')
        .attr('stdDeviation', '3')
        .attr('result', 'coloredBlur');

    // Apply glow effects
    svg.selectAll('.add-layer-button rect, .add-agent-button rect, .remove-layer-button rect')
        .attr('filter', 'url(#button-glow)');

    node.select('circle')
        .attr('filter', 'url(#node-glow)');

    // Style form elements
    svg.selectAll('.agent-model, .agent-temperature')
        .style('background', 'rgba(255, 255, 255, 0.1)')
        .style('border', '1px solid rgba(255, 107, 107, 0.3)')
        .style('border-radius', '5px')
        .style('color', '#f0f0f0')
        .style('padding', '5px');

    // Add event listeners
    svg.selectAll('.agent-model, .agent-temperature')
        .on('change', updateMOAConfig);

    // Resize handler
    const resizeHandler = debounce(() => {
        createMOADiagram();
    }, 250);

    window.addEventListener('resize', resizeHandler);

    // Simulation tick function
    function ticked() {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node
            .attr('transform', d => `translate(${d.x},${d.y})`);
    }

    // Drag functions
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    // Function to handle model selection change
    function handleModelSelection(event, d) {
        const selectedModel = event.target.value;
        d.model_name = selectedModel;
        updateNodeAppearance(d3.select(event.target.closest('.node')), d);
        updateMOAConfig();
    }

    // Function to create a node
    function createNode(d) {
        const nodeGroup = d3.create('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));

        nodeGroup.append('circle')
            .attr('r', 30)
            .style('fill', getModelColor(d.model_name));

        nodeGroup.append('text')
            .attr('dy', '.35em')
            .attr('text-anchor', 'middle')
            .text(d => `Layer ${d.layer}, Agent ${d.agent}`);

        const modelSelect = nodeGroup.append('foreignObject')
            .attr('width', 150)
            .attr('height', 30)
            .attr('x', -75)
            .attr('y', 30)
            .append('xhtml:select')
            .attr('class', 'agent-model')
            .on('change', (event) => handleModelSelection(event, d));

        availableModels.forEach(model => {
            modelSelect.append('option')
                .attr('value', model)
                .text(model)
                .property('selected', model === d.model_name);
        });

        const temperatureInput = nodeGroup.append('foreignObject')
            .attr('width', 150)
            .attr('height', 30)
            .attr('x', -75)
            .attr('y', 65)
            .append('xhtml:input')
            .attr('type', 'range')
            .attr('class', 'agent-temperature')
            .attr('min', 0)
            .attr('max', 1)
            .attr('step', 0.1)
            .attr('value', d.temperature || 0.7)
            .on('input', (event) => {
                d.temperature = parseFloat(event.target.value);
                updateMOAConfig();
                updateTemperatureLabel(nodeGroup, d.temperature);
            });

        nodeGroup.append('text')
            .attr('class', 'temperature-label')
            .attr('x', 0)
            .attr('y', 90)
            .attr('text-anchor', 'middle')
            .text(`Temp: ${d.temperature || 0.7}`);

        return nodeGroup;
    }

    // Function to update temperature label
    function updateTemperatureLabel(nodeGroup, temperature) {
        nodeGroup.select('.temperature-label')
            .text(`Temp: ${temperature.toFixed(1)}`);
    }

    // Add this function to update node appearance based on the selected model
    function updateNodeAppearance(node, d) {
        // Update node color and other visual properties based on the selected model
        const color = getModelColor(d.model_name);
        const borderColor = d3.color(color).darker(0.5);
        const textColor = d3.color(color).luminance() > 0.5 ? '#000000' : '#FFFFFF';

        node.select('circle')
            .style('fill', color)
            .style('stroke', borderColor)
            .style('stroke-width', '2px');

        node.select('text')
            .style('fill', textColor);

        // Add a subtle glow effect
        node.select('circle')
            .attr('filter', 'url(#glow)');

        // Update the size based on the model's complexity or importance
        const size = getModelSize(d.model_name);
        node.select('circle')
            .transition()
            .duration(300)
            .attr('r', size);

        // Add an icon or symbol representing the model type
        const symbol = getModelSymbol(d.model_name);
        node.select('.model-symbol')
            .remove(); // Remove existing symbol if any
        node.append('text')
            .attr('class', 'model-symbol')
            .attr('x', 0)
            .attr('y', size + 15)
            .attr('text-anchor', 'middle')
            .style('font-family', 'FontAwesome')
            .style('font-size', '16px')
            .text(symbol);
    }

    // Helper function to get color based on model name
    function getModelColor(modelName) {
        // Define a color scheme for different models
        const colorScheme = {
            'llama2-70b-4096': '#FF6B6B',
            'gemma2-5b-it': '#4ECDC4',
            'mixtral-8x7b-32768': '#FFA07A',
            'gpt-3.5-turbo': '#98FB98',
            'gpt-4': '#87CEFA',
            'claude-2': '#DDA0DD',
            'palm': '#F0E68C',
            'cohere-command': '#20B2AA',
            'falcon-40b': '#FF69B4',
            'j2-jumbo': '#9370DB'
        };

        // If the model name is not in the colorScheme, generate a color based on the model name
        if (!colorScheme[modelName]) {
            let hash = 0;
            for (let i = 0; i < modelName.length; i++) {
                hash = modelName.charCodeAt(i) + ((hash << 5) - hash);
            }
            const color = `hsl(${hash % 360}, 70%, 60%)`;
            return color;
        }

        return colorScheme[modelName];
    }

    // Helper function to get size based on model name
    function getModelSize(modelName) {
        const baseSize = 30;
        const sizeMultipliers = {
            'gemma-7b-it': 1.1,
            'gemma2-9b-it': 1.2,
            'llama-3.1-70b-versatile': 1.5,
            'llama-3.1-8b-instant': 1.1,
            'llama3-70b-8192': 1.5,
            'llama3-8b-8192': 1.1,
            'llama3-groq-70b-8192-tool-use-preview': 1.5,
            'llama3-groq-8b-8192-tool-use-preview': 1.1,
            'mixtral-8x7b-32768': 1.4
        };
        return baseSize * (sizeMultipliers[modelName] || 1);
    }

    // Helper function to get symbol based on model type
    function getModelSymbol(modelName) {
        const symbols = {
            'llama': '\uf1b0', // fa-paw
            'gemma': '\uf0e7', // fa-bolt
            'mixtral': '\uf1e6' // fa-plug
        };
        const modelType = Object.keys(symbols).find(type => modelName.toLowerCase().includes(type));
        return symbols[modelType] || '\uf128'; // fa-question as default
    }

            setTimeout(() => {
            resolve();
        }, 100); // Small delay to ensure rendering is complete
});






}

export function updateMOAConfig() {
    const svg = d3.select('#moa-diagram svg');
    const newConfig = initializeNewConfig();

    svg.selectAll('.node').each(function(d) {
        updateConfigForNode(newConfig, d, this);
    });

    configUpdateMOAConfig(newConfig);
    createMOADiagram();
}

function initializeNewConfig() {
    return {
        layers: [],
        main_model: '',
        main_temperature: 0
    };
}

function updateConfigForNode(config, nodeData, nodeElement) {
    const node = d3.select(nodeElement);
    const modelSelect = node.select('.agent-model');
    const tempInput = node.select('.agent-temperature');
    
    if (nodeData.id !== 'main_model') {
        updateLayerConfig(config, nodeData, modelSelect, tempInput);
    } else {
        updateMainModelConfig(config, modelSelect, tempInput);
    }
}

function updateLayerConfig(config, nodeData, modelSelect, tempInput) {
    const [layer, agent] = nodeData.id.split('_').map(part => parseInt(part.replace(/\D/g, '')));
    if (!config.layers[layer]) {
        config.layers[layer] = [];
    }
    config.layers[layer][agent] = {
        model_name: modelSelect.property('value'),
        temperature: parseFloat(tempInput.property('value'))
    };
}

function updateMainModelConfig(config, modelSelect, tempInput) {
    config.main_model = modelSelect.property('value');
    config.main_temperature = parseFloat(tempInput.property('value'));
}

export function addLayer() {
    if (typeof moaConfig !== 'undefined' && Array.isArray(moaConfig.layers)) {
        moaConfig.layers.push([{ model_name: 'llama3-8b-8192', temperature: 0.5 }]);
        createMOADiagram();
    } else {
        console.error('moaConfig is not properly defined');
    }
}

export function addAgent(layerIndex) {
    if (typeof moaConfig !== 'undefined' && Array.isArray(moaConfig.layers) && moaConfig.layers[layerIndex]) {
        moaConfig.layers[layerIndex].push({ model_name: 'llama3-8b-8192', temperature: 0.5 });
        createMOADiagram();
    } else {
        console.error('Invalid layer index or moaConfig is not properly defined');
    }
}
export function removeLayer(layerIndex) {
    if (moaConfig.layers.length > 1) {
        moaConfig.layers.splice(layerIndex, 1);
        createMOADiagram();
    } else {
        alert("Cannot remove the last layer.");
    }
}

export function removeAgent(layerIndex, agentIndex) {
    if (moaConfig.layers[layerIndex].length > 1) {
        moaConfig.layers[layerIndex].splice(agentIndex, 1);
        createMOADiagram();
    } else {
        alert("Cannot remove the last agent in a layer.");
    }
}

export function animateAgent(index) {
    const svg = d3.select('#moa-diagram svg');
    const nodes = svg.selectAll('.node');
    const links = svg.selectAll('line');
    
    animateLayerNodes(nodes, index);
    animateLayerLinks(nodes, links, index);
    animateMainModelIfLastLayer(nodes, index);
}

function animateLayerNodes(nodes, index) {
    nodes.filter(d => d.layer === index)
        .select('circle')
        .transition()
        .duration(500)
        .attr('fill', '#ff7b72')
        .transition()
        .duration(500)
        .attr('fill', '#3498db');
}

function animateLayerLinks(nodes, links, index) {
    links.filter(d => {
        const sourceNode = nodes.data().find(n => n.id === d.source.id);
        return sourceNode && sourceNode.layer === index;
    })
        .transition()
        .duration(500)
        .attr('stroke', '#ff4136')
        .attr('stroke-width', 4)
        .transition()
        .duration(500)
        .attr('stroke', '#999')
        .attr('stroke-width', 2);
}

function animateMainModelIfLastLayer(nodes, index) {
    if (index === moaConfig.layers.length - 1) {
        nodes.filter(d => d.id === 'main_model')
            .select('circle')
            .transition()
            .duration(500)
            .attr('fill', '#ff7b72')
            .transition()
            .duration(500)
            .attr('fill', '#ff4136');
    }
}

export function updateDiagram(layerIndex, agentIndex, modelName, status) {
    if (layerIndex === undefined || agentIndex === undefined) {
        console.error(`Invalid layer or agent index: Layer ${layerIndex}, Agent ${agentIndex}`);
        return;
    }

    const nodeId = `layer${layerIndex}_agent${agentIndex}`;
    const svg = d3.select('#moa-diagram svg');
    const agentNode = svg.select(`.node[data-id="${nodeId}"]`);

    if (agentNode.empty()) {
        console.warn(`Node not found for Layer ${layerIndex}, Agent ${agentIndex}. Recreating diagram...`);
        createMOADiagram();
        return;
    }

    // Update the model name in the dropdown
    agentNode.select('.agent-model')
        .property('value', modelName);

    // Animate the node based on status
    agentNode.select('circle')
        .transition()
        .duration(500)
        .attr('fill', status === 'success' ? '#4CAF50' : '#FF5252')
        .transition()
        .duration(500)
        .attr('fill', '#3498db');

    // Update the node label
    agentNode.select('text')
        .text(`A${agentIndex}`);

    // Update the node in the global nodeMap
    if (nodeMap.has(nodeId)) {
        const updatedNode = nodeMap.get(nodeId);
        updatedNode.model_name = modelName;
        nodeMap.set(nodeId, updatedNode);
    }

    // Trigger a partial redraw of the diagram
    updateNodeConnections(layerIndex, agentIndex);
}

function updateNodeConnections(layerIndex, agentIndex) {
    const svg = d3.select('#moa-diagram svg');
    const links = svg.selectAll('.links line');

    links.each(function(d) {
        const link = d3.select(this);
        const sourceId = d.source.id || d.source;
        const targetId = d.target.id || d.target;

        if (sourceId === `layer${layerIndex}_agent${agentIndex}` || targetId === `layer${layerIndex}_agent${agentIndex}`) {
            const weight = calculateConnectionStrength(nodeMap.get(sourceId), nodeMap.get(targetId));
            link.transition()
                .duration(500)
                .attr('stroke-width', Math.sqrt(weight))
                .attr('stroke', '#999');
        }
    });

    
}