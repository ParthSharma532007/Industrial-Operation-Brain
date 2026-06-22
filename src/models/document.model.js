const db = require('../config/db');

class Document {
  static findAll() {
    return db.getData().documents || [];
  }

  static findById(id) {
    const docs = this.findAll();
    return docs.find(d => d.id === id) || null;
  }

  static create(docData) {
    const dbData = db.getData();
    
    const newDoc = {
      id: docData.id || `doc_${Date.now()}`,
      title: docData.title || "Untitled Document",
      type: docData.type || "Other Document",
      category: docData.category || "General",
      filePath: docData.filePath || "/uploads/default.pdf",
      content: docData.content || "",
      entities: docData.entities || [],
      uploadDate: docData.uploadDate || new Date().toISOString()
    };

    dbData.documents.push(newDoc);
    db.updateData(dbData);
    return newDoc;
  }
}

module.exports = Document;
