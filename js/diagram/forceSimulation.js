/**
 * Creates a force-directed graph simulation using D3.js
 * 
 * This function sets up a force simulation for visualizing nodes and links in a graph.
 * It applies various forces to create an interactive and visually appealing layout.
 * 
 * @param {Array} nodes - An array of node objects to be simulated
 * @param {Array} links - An array of link objects connecting the nodes
 * @param {number} layerWidth - The desired distance between connected nodes
 * @returns {d3.Simulation} The created force simulation object
 * 
 * Usage example:
 * const nodes = [{id: 'node1'}, {id: 'node2'}];
 * const links = [{source: 'node1', target: 'node2'}];
 * const simulation = createForceSimulation(nodes, links, 100);
 * 
 * Files that use this function:
 * - js/diagram/diagramRenderer.js (assumed)
 * - js/diagram/graphLayout.js (assumed)
 * 
 * Role in overall program logic:
 * This function is crucial for creating interactive graph visualizations.
 * It sets up the physics simulation that determines how nodes and links
 * are positioned and move in response to user interactions and each other.
 */
export function createForceSimulation(nodes, links, layerWidth) {
    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(layerWidth))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('x', d3.forceX((d) => d.x).strength(0.5))
      .force('y', d3.forceY((d) => d.y).strength(0.5))
      .force('collision', d3.forceCollide().radius(30)) // Add collision force to prevent node overlap
      .alphaDecay(0.01) // Slow down the simulation cooling
      .velocityDecay(0.3) // Increase node movement
      .on('tick', ticked)
      .restart();
  
    /**
     * Updates the positions of nodes and links on each tick of the simulation
     * 
     * This function is called on each step of the force simulation to update
     * the visual representation of nodes and links based on their current positions.
     * 
     * Usage:
     * This function is not called directly but is passed to the simulation's 'tick' event.
     * 
     * Role in overall program logic:
     * It ensures that the visual representation of the graph stays in sync
     * with the underlying data model as the simulation progresses.
     */
    function ticked() {
      // Use more efficient d3 selection
      const links = d3.select('.links').selectAll('line');
      const nodes = d3.select('.nodes').selectAll('.node');
  
      links
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);
  
      nodes.attr('transform', (d) => `translate(${d.x},${d.y})`);
  
      // Add boundary forces to keep nodes within svg
      nodes.each((d) => {
        d.x = Math.max(30, Math.min(d.x, window.innerWidth - 30));
        d.y = Math.max(30, Math.min(d.y, window.innerHeight - 30));
      });
    }
  
    return simulation;
  }