/**
 * Global node map to keep track of nodes across functions
 * 
 * This Map object stores information about all nodes in the diagram,
 * allowing for efficient access and modification of node data throughout the application.
 * 
 * The key is typically a string identifier for the node (e.g., 'layer0_agent1'),
 * and the value is an object containing node properties (e.g., {id: 'layer0_agent1', model_name: 'gpt-3.5-turbo', ...}).
 * 
 * Usage example:
 * // Adding a node
 * nodeMap.set('layer0_agent1', {id: 'layer0_agent1', model_name: 'gpt-3.5-turbo', temperature: 0.7});
 * 
 * // Retrieving a node
 * const node = nodeMap.get('layer0_agent1');
 * 
 * // Updating a node
 * const updatedNode = {...node, temperature: 0.8};
 * nodeMap.set('layer0_agent1', updatedNode);
 * 
 * Other files that use this map:
 * - js/diagram/diagramActions.js
 * - js/diagram/updateDiagram.js
 * - js/diagram/nodeElements.js
 * 
 * Role in overall program logic:
 * This map serves as a central data structure for storing and managing node information.
 * It enables quick lookups, updates, and consistency checks across different parts of the application,
 * facilitating efficient diagram updates and interactions with node data.
 */
export const nodeMap = new Map();
