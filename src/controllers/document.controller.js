const Document = require('../models/document.model');
const nlpService = require('../services/nlp.service');
const graphService = require('../services/graph.service');

async function uploadDocument(req, res) {
  try {
    const { title, content, type, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required." });
    }

    // 1. Run NLP Entity Extraction
    const entities = nlpService.extractEntities(content);

    // 2. Create the document database entry
    const docId = `doc_${Date.now()}`;
    const newDoc = Document.create({
      id: docId,
      title,
      type,
      category,
      content,
      entities,
      filePath: req.file ? `/uploads/${req.file.filename}` : `/uploads/manual_${docId}.txt`
    });

    // 3. Connect document and entities inside the Knowledge Graph
    graphService.addDocumentToGraph(newDoc);

    return res.status(201).json({
      message: "Document ingested successfully and linked to Knowledge Graph.",
      document: newDoc,
      entities: entities
    });
  } catch (error) {
    console.error("Error in uploadDocument:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}

function getDocuments(req, res) {
  try {
    const docs = Document.findAll();
    return res.json(docs);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error." });
  }
}

function getDocumentById(req, res) {
  try {
    const doc = Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }
    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error." });
  }
}

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById
};
