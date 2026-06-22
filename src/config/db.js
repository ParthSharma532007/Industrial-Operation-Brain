const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/db.json');
const SEED_PATH = path.join(__dirname, '../data/seed.json');

let dbMemory = null;

function initDb() {
  if (dbMemory) return dbMemory;

  // Make sure directories exist
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load database or initialize from seed
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      dbMemory = JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse db.json, falling back to seed.json:", e);
      loadSeed();
    }
  } else {
    loadSeed();
  }

  return dbMemory;
}

function loadSeed() {
  if (fs.existsSync(SEED_PATH)) {
    const raw = fs.readFileSync(SEED_PATH, 'utf8');
    dbMemory = JSON.parse(raw);
    saveDb();
  } else {
    // Ultimate fallback if seed doesn't exist yet
    dbMemory = {
      assets: [],
      documents: [],
      graph: { nodes: [], edges: [] },
      workOrders: [],
      compliance: []
    };
    saveDb();
  }
}

function saveDb() {
  if (!dbMemory) return;
  fs.writeFileSync(DB_PATH, JSON.stringify(dbMemory, null, 2), 'utf8');
}

function getData() {
  return initDb();
}

function updateData(newData) {
  dbMemory = newData;
  saveDb();
  return dbMemory;
}

module.exports = {
  getData,
  updateData,
  saveDb
};
