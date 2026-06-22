const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const docController = require('./src/controllers/document.controller');
const chatController = require('./src/controllers/chat.controller');
const maintController = require('./src/controllers/maintenance.controller');
const compController = require('./src/controllers/compliance.controller');
const graphController = require('./src/controllers/graph.controller');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));
// Serve uploaded document files
app.use('/uploads', express.static(uploadDir));

// --- API ROUTES ---

// 1. Documents Ingestion API
app.get('/api/documents', docController.getDocuments);
app.get('/api/documents/:id', docController.getDocumentById);
app.post('/api/documents/ingest', upload.single('file'), docController.uploadDocument);

// 2. RAG Expert Copilot Chat API
app.post('/api/chat', chatController.queryRAG);

// 3. Maintenance, FMEA & RCA API
app.get('/api/assets', maintController.getAssets);
app.get('/api/work-orders', maintController.getWorkOrders);
app.post('/api/work-orders', maintController.createWorkOrder);
app.post('/api/maintenance/rca', maintController.triggerRCA);

// 4. Compliance & Audit Verification API
app.get('/api/compliance', compController.getCompliance);
app.post('/api/compliance/verify', compController.verifyCompliance);
app.post('/api/compliance/audit-package', compController.generateAuditPackage);

// 5. Knowledge Graph API
app.get('/api/graph', graphController.getGraph);
app.get('/api/graph/:assetId', graphController.getAssetSubGraph);

// Catch-all route to serve UI
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Boot server
app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`  Unified Asset & Operations Brain running on http://localhost:${PORT}`);
  console.log(`================================================================`);
});
