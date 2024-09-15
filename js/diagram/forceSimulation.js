export function createForceSimulation(nodes, links, layerWidth) {
    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(layerWidth))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('x', d3.forceX((d) => d.x).strength(0.5))
      .force('y', d3.forceY((d) => d.y).strength(0.5))
      .on('tick', ticked)
      .restart();
  
    function ticked() {
      d3.selectAll('.links line')
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);
  
      d3.selectAll('.nodes .node').attr('transform', (d) => `translate(${d.x},${d.y})`);
    }
  
    return simulation;
  }
  