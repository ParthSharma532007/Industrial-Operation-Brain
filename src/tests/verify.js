/**
 * Automated Verification Script for the Industrial Operations Brain MVC System
 */
const db = require('../config/db');
const nlpService = require('../services/nlp.service');
const ragService = require('../services/rag.service');
const graphService = require('../services/graph.service');
const Document = require('../models/document.model');
const Graph = require('../models/graph.model');

async function runTests() {
  console.log("=========================================");
  console.log("  Running Operational Brain API Verification Tests  ");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // Test 1: Database Initialization
    const data = db.getData();
    assert(data.assets && data.assets.length > 0, "Database loaded seed asset assets successfully.");
    assert(data.documents && data.documents.length > 0, "Database loaded seed document records successfully.");
    assert(data.graph && data.graph.nodes.length > 0, "Database loaded seed graph network nodes successfully.");

    // Test 2: NLP Entity Extraction Service
    const sampleText = "On control valve V-202 downstream of HE-401, temperature is cycle peaking 118°C under PESO rules. Need torque checks.";
    const entities = nlpService.extractEntities(sampleText);
    const hasV202 = entities.some(e => e.text === 'V-202' && e.type === 'EquipmentTag');
    const hasHE401 = entities.some(e => e.text === 'HE-401' && e.type === 'EquipmentTag');
    const hasTemp = entities.some(e => e.text === '118°C' && e.type === 'ProcessParameter');
    const hasPeso = entities.some(e => e.text.startsWith('PESO') && e.type === 'RegulatoryReference');

    assert(hasV202, "NLP extracted Equipment Tag V-202 successfully.");
    assert(hasHE401, "NLP extracted Equipment Tag HE-401 successfully.");
    assert(hasTemp, "NLP extracted Process Parameter 118°C successfully.");
    assert(hasPeso, "NLP extracted Regulatory Reference PESO rules successfully.");

    // Test 3: Document Ingestion and Graph Linkage
    const initialEdgesCount = Graph.getGraph().edges.length;
    const testDoc = Document.create({
      id: "doc_test_audit",
      title: "Test Audit Report for Valve calibration",
      type: "Audit Log",
      category: "Incident",
      content: "Calibration test conducted on safety loop control valve V-202 due to pressure exceeding 40 bar.",
      entities: [
        { text: "V-202", type: "EquipmentTag", refId: "V-202" }
      ]
    });

    graphService.addDocumentToGraph(testDoc);
    const updatedGraph = Graph.getGraph();
    const hasTestNode = updatedGraph.nodes.some(n => n.id === 'node_doc_test_audit');
    const linkCreated = updatedGraph.edges.some(e => e.from === 'node_V-202' && e.to === 'node_doc_test_audit');

    assert(hasTestNode, "Graph updated node list with newly ingested document node successfully.");
    assert(linkCreated, "Graph established edge link from equipment V-202 to the new document successfully.");
    assert(updatedGraph.edges.length > initialEdgesCount, "Graph total edges count increased successfully.");

    // Test 4: RAG Search Context Retrieval
    const ragResult = ragService.queryRAG("isolation check protocol and LOTO procedure for pump P-101");
    assert(ragResult.answer && ragResult.answer.includes("P-101"), "RAG generated synthesized response containing target equipment name.");
    assert(ragResult.citations.length > 0, "RAG returned supporting document source citations.");
    assert(ragResult.confidenceScore > 50, `RAG returned high match confidence score: ${ragResult.confidenceScore}%.`);

    console.log("\n=========================================");
    console.log(` Verification Completed: ${passed} Passed, ${failed} Failed`);
    console.log("=========================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution threw exception:", error);
    process.exit(1);
  }
}

runTests();
