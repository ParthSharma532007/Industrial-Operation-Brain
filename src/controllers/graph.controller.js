const Graph = require('../models/graph.model');

function getGraph(req, res) {
  try {
    const data = Graph.getGraph();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error." });
  }
}

function getAssetSubGraph(req, res) {
  try {
    const { assetId } = req.params;
    if (!assetId) {
      return res.status(400).json({ error: "Asset ID is required." });
    }
    const subgraph = Graph.getSubGraph(assetId);
    return res.json(subgraph);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error." });
  }
}

module.exports = {
  getGraph,
  getAssetSubGraph
};
