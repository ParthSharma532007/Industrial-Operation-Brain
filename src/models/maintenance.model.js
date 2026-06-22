const db = require('../config/db');

class Maintenance {
  static getAssets() {
    return db.getData().assets || [];
  }

  static getAssetById(id) {
    return this.getAssets().find(a => a.id === id) || null;
  }

  static updateAsset(id, updateData) {
    const dbData = db.getData();
    const idx = dbData.assets.findIndex(a => a.id === id);
    if (idx !== -1) {
      dbData.assets[idx] = { ...dbData.assets[idx], ...updateData };
      db.updateData(dbData);
      return dbData.assets[idx];
    }
    return null;
  }

  static getWorkOrders() {
    return db.getData().workOrders || [];
  }

  static createWorkOrder(woData) {
    const dbData = db.getData();
    const newWo = {
      id: woData.id || `WO-${Math.floor(1000 + Math.random() * 9000)}`,
      assetId: woData.assetId,
      title: woData.title,
      type: woData.type || "Preventive",
      status: woData.status || "Pending",
      scheduledDate: woData.scheduledDate || new Date().toISOString().split('T')[0],
      completedDate: woData.completedDate || null,
      performedBy: woData.performedBy || "Maint Team",
      findings: woData.findings || "",
      sopChecked: woData.sopChecked || null
    };

    dbData.workOrders.push(newWo);
    db.updateData(dbData);
    return newWo;
  }

  static updateWorkOrder(id, updateData) {
    const dbData = db.getData();
    const idx = dbData.workOrders.findIndex(wo => wo.id === id);
    if (idx !== -1) {
      dbData.workOrders[idx] = { ...dbData.workOrders[idx], ...updateData };
      db.updateData(dbData);
      return dbData.workOrders[idx];
    }
    return null;
  }
}

module.exports = Maintenance;
