// src/syncDiagram.js
import { moaConfig } from '../config/config.js';

export function syncDiagramWithConfig() {
    const svg = d3.select('#moa-diagram svg');
    svg.selectAll('*').remove(); // Clear existing diagram

    moaConfig.layers.forEach((layer, layerIndex) => {
        layer.forEach((agent, agentIndex) => {
            const nodeId = `layer${layerIndex}_agent${agentIndex}`;
            const agentNode = svg.append('g')
                .attr('id', nodeId)
                .attr('class', 'agent-node');

            // Add circle and text elements for the agent
            agentNode.append('circle')
                .attr('r', 20)
                .attr('cx', (agentIndex + 1) * 100)
                .attr('cy', (layerIndex + 1) * 100);

            agentNode.append('text')
                .attr('x', (agentIndex + 1) * 100)
                .attr('y', (layerIndex + 1) * 100)
                .text(`L${layerIndex}A${agentIndex}`);
        });
    });
}
