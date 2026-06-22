const db = require('../config/db');

class Compliance {
  static getComplianceItems() {
    return db.getData().compliance || [];
  }

  static getComplianceById(id) {
    return this.getComplianceItems().find(item => item.id === id) || null;
  }

  static updateCompliance(id, updateData) {
    const dbData = db.getData();
    const idx = dbData.compliance.findIndex(c => c.id === id);
    if (idx !== -1) {
      dbData.compliance[idx] = { ...dbData.compliance[idx], ...updateData };
      db.updateData(dbData);
      return dbData.compliance[idx];
    }
    return null;
  }

  static createCompliance(compData) {
    const dbData = db.getData();
    const newItem = {
      id: compData.id || `comp_${Date.now()}`,
      ruleName: compData.ruleName,
      authority: compData.authority,
      frequency: compData.frequency || "Annual",
      targetAsset: compData.targetAsset,
      lastAuditDate: compData.lastAuditDate || new Date().toISOString().split('T')[0],
      status: compData.status || "Compliant",
      evidenceDoc: compData.evidenceDoc || null,
      notes: compData.notes || ""
    };

    dbData.compliance.push(newItem);
    db.updateData(dbData);
    return newItem;
  }
}

module.exports = Compliance;
