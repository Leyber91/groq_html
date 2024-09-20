// src/syncDiagram.js
import { moaConfig } from '../config/config.js';

/**
 * Synchronizes the MOA diagram with the current configuration.
 * 
 * This function performs the following steps:
 * 1. Selects the SVG element for the MOA diagram.
 * 2. Clears any existing content in the SVG.
 * 3. Iterates through each layer and agent in the moaConfig.
 * 4. For each agent, creates a group (g) element with a unique ID.
 * 5. Adds a circle and text element for each agent, positioning them based on their layer and index.
 * 
 * Usage example:
 * ```
 * import { syncDiagramWithConfig } from './syncDiagram.js';
 * 
 * // After updating moaConfig or when the page loads
 * syncDiagramWithConfig();
 * ```
 * 
 * Files that use this function:
 * - js/main/app.js (assumed main application file)
 * - js/main/configUpdater.js (assumed file for handling configuration updates)
 * 
 * Role in overall program logic:
 * This function is crucial for visualizing the current state of the MOA (Multi-Agent Organization).
 * It ensures that the diagram always reflects the latest configuration, allowing users to see
 * the structure and arrangement of agents across different layers. This visual representation
 * is likely used for both user understanding and potentially for interactive manipulation of the MOA structure.
 */
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
