import { moaConfig, availableModels, updateMOAConfig as configUpdateMOAConfig } from '../config/config.js';
import { generateUniqueId } from '../utils/idGenerator.js';

export function createMOADiagram() {
    const container = d3.select('#moa-diagram');
    container.selectAll('*').remove();
    
    const svg = container.append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', '0 0 1000 600');

    const width = 1000;
    const height = 600;
    
    // Calculate layer positions
    const layerWidth = width / (moaConfig.layers.length + 1);
    const layerHeight = height / 2;

    // Create nodes and links
    const nodes = [];
    const links = [];

    moaConfig.layers.forEach((layer, layerIndex) => {
        const layerX = (layerIndex + 1) * layerWidth;
        layer.forEach((agent, agentIndex) => {
            const agentY = (agentIndex + 1) * (layerHeight / (layer.length + 1));
            nodes.push({
                id: `layer${layerIndex}_agent${agentIndex}`,
                x: layerX,
                y: agentY,
                layer: layerIndex,
                agent: agentIndex,
                ...agent
            });
            if (layerIndex > 0) {
                moaConfig.layers[layerIndex - 1].forEach((prevAgent, prevAgentIndex) => {
                    links.push({
                        source: `layer${layerIndex-1}_agent${prevAgentIndex}`,
                        target: `layer${layerIndex}_agent${agentIndex}`
                    });
                });
            }
        });
    });
    // Add main model node
    nodes.push({
        id: 'main_model',
        x: width - layerWidth / 2,
        y: height / 2,
        model_name: moaConfig.main_model,
        temperature: moaConfig.main_temperature
    });

    // Connect last layer to main model
    const lastLayerIndex = moaConfig.layers.length - 1;
    moaConfig.layers[lastLayerIndex].forEach((agent, agentIndex) => {
        links.push({
            source: `layer${lastLayerIndex}_agent${agentIndex}`,
            target: 'main_model'
        });
    });

    // Create links
    svg.selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('x1', d => nodes.find(n => n.id === d.source).x)
        .attr('y1', d => nodes.find(n => n.id === d.source).y)
        .attr('x2', d => nodes.find(n => n.id === d.target).x)
        .attr('y2', d => nodes.find(n => n.id === d.target).y)
        .attr('stroke', '#999')
        .attr('stroke-width', 2);

    // Create nodes
    const nodeGroups = svg.selectAll('.node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x}, ${d.y})`);

    nodeGroups.append('circle')
        .attr('r', 30)
        .attr('fill', d => d.id === 'main_model' ? '#ff4136' : '#3498db');
    nodeGroups.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '.3em')
        .text(d => d.id === 'main_model' ? 'Main' : `A${d.agent}`);

    // Add model selection and temperature input for each node
    nodeGroups.each(function(d) {
        const group = d3.select(this);
        
        group.append('foreignObject')
            .attr('x', -75)
            .attr('y', 40)
            .attr('width', 150)
            .attr('height', 30)
            .html(d => `
                <select class="agent-model" data-id="${d.id}">
                    ${availableModels.map(model => `<option value="${model}" ${model === d.model_name ? 'selected' : ''}>${model}</option>`).join('')}
                </select>
            `);

        group.append('foreignObject')
            .attr('x', -75)
            .attr('y', 80)
            .attr('width', 150)
            .attr('height', 30)
            .html(d => `
                <input type="number" class="agent-temperature" data-id="${d.id}" min="0" max="1" step="0.1" value="${d.temperature !== undefined ? d.temperature : 0.5}">
            `);
    });
    // Add buttons for adding layers and agents
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
        .attr('fill', '#ff6b6b')
        .attr('filter', 'url(#button-glow)');

    addLayerButton.append('text')
        .attr('x', 50)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-weight', 'bold')
        .text('Add Layer');

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
            .attr('fill', '#4ecdc4')
            .attr('filter', 'url(#button-glow)');

        addAgentButton.append('text')
            .attr('x', 50)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-weight', 'bold')
            .text('Add Agent');

        // Add remove layer buttons
        if (layerIndex > 0) { // Don't allow removing the base layer
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
                .attr('fill', '#fc5c65')
                .attr('filter', 'url(#button-glow)');

            removeLayerButton.append('text')
                .attr('x', 50)
                .attr('y', 20)
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .attr('font-weight', 'bold')
                .text('Remove Layer');
        }
        // Add remove agent buttons for each agent in the layer
        layer.forEach((agent, agentIndex) => {
            if (layer.length > 1) { // Don't allow removing the last agent in a layer
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
                    .attr('y', 4)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'white')
                    .attr('font-weight', 'bold')
                    .attr('font-size', '16px')
                    .text('×');
            }
        });
    });

    // Add a filter for the glow effect
    const defs = svg.append('defs');
    const filter = defs.append('filter')
        .attr('id', 'button-glow')
        .attr('height', '300%')
        .attr('width', '300%')
        .attr('x', '-75%')
        .attr('y', '-75%');
    
    filter.append('feGaussianBlur')
        .attr('stdDeviation', '5')
        .attr('result', 'coloredBlur');
    
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode')
        .attr('in', 'coloredBlur');
    feMerge.append('feMergeNode')
        .attr('in', 'SourceGraphic');

    // Add a filter for the node glow effect
    const nodeGlow = defs.append('filter')
        .attr('id', 'node-glow')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');

    nodeGlow.append('feGaussianBlur')
        .attr('stdDeviation', '3')
        .attr('result', 'coloredBlur');



    // Apply the glow effect to nodes
    nodeGroups.select('circle')
        .attr('filter', 'url(#node-glow)')
        .attr('fill', '#ff6b6b');

    // Style the model selection and temperature input
    nodeGroups.selectAll('.agent-model, .agent-temperature')
        .style('background', 'rgba(255, 255, 255, 0.1)')
        .style('border', '1px solid rgba(255, 107, 107, 0.3)')
        .style('border-radius', '5px')
        .style('color', '#f0f0f0')
        .style('padding', '5px');

    // Style the "Add Agent" and "Remove Layer" buttons
    svg.selectAll('.add-agent-button rect, .remove-layer-button rect')
        .attr('rx', 10)
        .attr('ry', 10)
        .attr('filter', 'url(#button-glow)');

    svg.selectAll('.add-agent-button text, .remove-layer-button text')
        .attr('font-weight', 'bold')
        .attr('fill', '#f0f0f0');

    // Update the event listeners
    svg.selectAll('.agent-model, .agent-temperature')
        .on('change', updateMOAConfig);

    // Update the model selection options
    const modelSelect = d3.select('#model-select');
    modelSelect.selectAll('option').remove();
    modelSelect.selectAll('option')
        .data(availableModels)
        .enter()
        .append('option')
        .attr('value', d => d)
        .text(d => d);
}

export function updateMOAConfig() {
    const svg = d3.select('#moa-diagram svg');
    
    const newConfig = {
        layers: [],
        main_model: '',
        main_temperature: 0
    };

    svg.selectAll('.node').each(function(d) {
        const node = d3.select(this);
        const modelSelect = node.select('.agent-model');
        const tempInput = node.select('.agent-temperature');
        
        if (d.id !== 'main_model') {
            const [layer, agent] = d.id.split('_').map(part => parseInt(part.replace(/\D/g, '')));
            if (!newConfig.layers[layer]) {
                newConfig.layers[layer] = [];
            }
            newConfig.layers[layer][agent] = {
                model_name: modelSelect.property('value'),
                temperature: parseFloat(tempInput.property('value'))
            };
        } else {
            newConfig.main_model = modelSelect.property('value');
            newConfig.main_temperature = parseFloat(tempInput.property('value'));
        }
    });

    configUpdateMOAConfig(newConfig);
    createMOADiagram();
}

export function addLayer() {
    moaConfig.layers.push([{ model_name: 'llama3-8b-8192', temperature: 0.5 }]);
    createMOADiagram();
}

export function addAgent(layerIndex) {
    moaConfig.layers[layerIndex].push({ model_name: 'llama3-8b-8192', temperature: 0.5 });
    createMOADiagram();
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
    
    // Animate the agents in the current layer
    nodes.filter(d => d.layer === index)
        .select('circle')
        .transition()
        .duration(500)
        .attr('fill', '#ff7b72')
        .transition()
        .duration(500)
        .attr('fill', '#3498db');

    // Animate the connections to the next layer
    links.filter(d => nodes.data().find(n => n.id === d.source).layer === index)
        .transition()
        .duration(500)
        .attr('stroke', '#ff4136')
        .attr('stroke-width', 4)
        .transition()
        .duration(500)
        .attr('stroke', '#999')
        .attr('stroke-width', 2);

    // Animate the main model if it's the last layer
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

export function updateDiagram(performanceMetrics = {}) {
    const svg = d3.select('#moa-diagram svg');
    const nodes = svg.selectAll('.node');

    nodes.each(function(d) {
        const node = d3.select(this);
        const metric = performanceMetrics[d.id];
        if (metric) {
            const color = d3.interpolateRdYlGn(metric.outputQuality);
            node.select('circle').attr('fill', color);
            node.append('title').text(`Processing Time: ${metric.processingTime}ms\nOutput Quality: ${metric.outputQuality.toFixed(2)}`);
        }
    });
}