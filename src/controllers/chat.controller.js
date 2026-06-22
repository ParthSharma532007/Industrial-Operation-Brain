const ragService = require('../services/rag.service');

function queryRAG(req, res) {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query string is required." });
    }

    const result = ragService.queryRAG(query);
    return res.json(result);
  } catch (error) {
    console.error("Error in queryRAG controller:", error);
    return res.status(500).json({ error: "Internal server error during search query." });
  }
}

module.exports = {
  queryRAG
};
