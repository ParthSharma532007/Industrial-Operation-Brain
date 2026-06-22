const db = require('../config/db');

/**
 * Knowledge Graph Service
 * Updates the graph nodes and edges when new documents are added, and provides traversal queries.
 */

function addDocumentToGraph(doc) {
  const dbData = db.getData();
  const graph = dbData.graph;

  const docNodeId = `node_${doc.id}`;
  
  // 1. Add Document Node if not already exists
  let docNode = graph.nodes.find(n => n.id === docNodeId);
  if (!docNode) {
    docNode = {
      id: docNodeId,
      label: doc.category + ": " + (doc.title.length > 25 ? doc.title.substring(0, 22) + "..." : doc.title),
      group: "Document",
      details: doc.title
    };
    graph.nodes.push(docNode);
  }

  // 2. Loop through entities and establish relations
  doc.entities.forEach(entity => {
    if (entity.type === 'EquipmentTag') {
      const equipNodeId = `node_${entity.refId}`;
      
      // Ensure equipment node exists
      let equipNode = graph.nodes.find(n => n.id === equipNodeId);
      if (!equipNode) {
        // Auto-create basic asset
        equipNode = {
          id: equipNodeId,
          label: `${entity.refId} (Auto)`,
          group: "Equipment",
          details: `Auto-discovered tag ${entity.refId}`
        };
        graph.nodes.push(equipNode);

        // Also add basic asset structure if missing in asset list
        const assetExists = dbData.assets.some(a => a.id === entity.refId);
        if (!assetExists) {
          dbData.assets.push({
            id: entity.refId,
            name: `Auto-extracted Equipment ${entity.refId}`,
            location: "Discovered from " + doc.title,
            criticality: "Medium",
            status: "Active",
            specs: {},
            healthScore: 80,
            metrics: {}
          });
        }
      }

      // Create edge between Equipment and Document
      let relation = "depicted_in";
      if (doc.category === 'SOP') relation = "governed_by";
      else if (doc.category === 'Incident') relation = "experienced";
      else if (doc.category === 'Regulation') relation = "applies_to";

      const edgeId = `edge_${entity.refId}_${doc.id}`;
      const edgeExists = graph.edges.some(e => e.id === edgeId || (e.from === equipNodeId && e.to === docNodeId));
      
      if (!edgeExists) {
        // Correct order: Equipment relates to Document, e.g., Pump P-101 is governed_by SOP
        graph.edges.push({
          id: edgeId,
          from: equipNodeId,
          to: docNodeId,
          label: relation
        });
      }
    }

    if (entity.type === 'RegulatoryReference') {
      // Find or create regulatory node
      const cleanRegName = entity.text.replace(/Section \d+/i, '').trim();
      const regNodeId = `node_reg_${cleanRegName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      
      let regNode = graph.nodes.find(n => n.id === regNodeId);
      if (!regNode) {
        regNode = {
          id: regNodeId,
          label: cleanRegName,
          group: "Regulation",
          details: entity.text
        };
        graph.nodes.push(regNode);
      }

      // Link doc to regulation
      const docRegEdgeId = `edge_${doc.id}_${regNodeId}`;
      if (!graph.edges.some(e => e.id === docRegEdgeId)) {
        graph.edges.push({
          id: docRegEdgeId,
          from: docNodeId,
          to: regNodeId,
          label: "complies_with"
        });
      }

      // If document links both an asset and a regulation, link the asset to the regulation directly
      const assetEntity = doc.entities.find(e => e.type === 'EquipmentTag');
      if (assetEntity) {
        const equipNodeId = `node_${assetEntity.refId}`;
        const assetRegEdgeId = `edge_${assetEntity.refId}_${regNodeId}`;
        if (!graph.edges.some(e => e.id === assetRegEdgeId)) {
          graph.edges.push({
            id: assetRegEdgeId,
            from: equipNodeId,
            to: regNodeId,
            label: "subject_to"
          });
        }
      }
    }
  });

  db.updateData(dbData);
  return graph;
}

/**
 * Get all entities & documents connected to a specific node (by ID) up to 2 hops
 */
function queryAssetSubGraph(assetId) {
  const dbData = db.getData();
  const graph = dbData.graph;
  const targetNodeId = `node_${assetId}`;

  const connectedNodes = new Set([targetNodeId]);
  const connectedEdges = [];

  // Hop 1: direct edges
  graph.edges.forEach(edge => {
    if (edge.from === targetNodeId || edge.to === targetNodeId) {
      connectedEdges.push(edge);
      connectedNodes.add(edge.from);
      connectedNodes.add(edge.to);
    }
  });

  // Hop 2: find connections of connected nodes
  graph.edges.forEach(edge => {
    if (!connectedEdges.includes(edge)) {
      const fromInSet = connectedNodes.has(edge.from);
      const toInSet = connectedNodes.has(edge.to);
      if (fromInSet || toInSet) {
        connectedEdges.push(edge);
        connectedNodes.add(edge.from);
        connectedNodes.add(edge.to);
      }
    }
  });

  return {
    nodes: graph.nodes.filter(n => connectedNodes.has(n.id)),
    edges: connectedEdges
  };
}

module.exports = {
  addDocumentToGraph,
  queryAssetSubGraph
};
