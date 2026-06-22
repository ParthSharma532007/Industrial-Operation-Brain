const db = require('../config/db');
const graphService = require('../services/graph.service');

class Graph {
  static getGraph() {
    return db.getData().graph || { nodes: [], edges: [] };
  }

  static addNode(node) {
    const dbData = db.getData();
    const nodes = dbData.graph.nodes;
    if (!nodes.some(n => n.id === node.id)) {
      nodes.push(node);
      db.updateData(dbData);
    }
    return node;
  }

  static addEdge(edge) {
    const dbData = db.getData();
    const edges = dbData.graph.edges;
    // Prevent duplicate edges
    if (!edges.some(e => e.from === edge.from && e.to === edge.to && e.label === edge.label)) {
      edges.push(edge);
      db.updateData(dbData);
    }
    return edge;
  }

  static getSubGraph(assetId) {
    return graphService.queryAssetSubGraph(assetId);
  }
}

module.exports = Graph;
