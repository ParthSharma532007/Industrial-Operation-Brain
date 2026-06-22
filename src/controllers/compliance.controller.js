const Compliance = require('../models/compliance.model');
const Document = require('../models/document.model');
const Maintenance = require('../models/maintenance.model');

function getCompliance(req, res) {
  try {
    const list = Compliance.getComplianceItems();
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error." });
  }
}

function verifyCompliance(req, res) {
  try {
    const { id, status } = req.body;
    if (!id || !status) {
      return res.status(400).json({ error: "Compliance ID and Status are required." });
    }

    const updated = Compliance.updateCompliance(id, {
      status: status,
      lastAuditDate: new Date().toISOString().split('T')[0]
    });

    if (!updated) {
      return res.status(404).json({ error: "Compliance item not found." });
    }

    return res.json({
      message: "Compliance checklist verified and updated.",
      item: updated
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error." });
  }
}

function generateAuditPackage(req, res) {
  try {
    const { authority } = req.body; // e.g., "PESO" or "Factories Act"
    if (!authority) {
      return res.status(400).json({ error: "Compliance Authority is required." });
    }

    const items = Compliance.getComplianceItems().filter(
      item => item.authority.toLowerCase().includes(authority.toLowerCase())
    );

    // Build the package evidence
    const documents = Document.findAll();
    const workOrders = Maintenance.getWorkOrders();

    const auditPackage = {
      packageId: `AUDIT-${authority.toUpperCase().replace(/\s+/g, '_')}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      governingAuthority: authority,
      auditedClauses: items.map(item => ({
        id: item.id,
        ruleName: item.ruleName,
        clauseRef: item.authority,
        status: item.status,
        targetAsset: item.targetAsset,
        lastVerification: item.lastAuditDate
      })),
      supportingEvidence: items.map(item => {
        const evidenceDoc = documents.find(d => d.id === item.evidenceDoc);
        const relatedWos = workOrders.filter(w => w.assetId === item.targetAsset && w.status === 'Completed');
        
        return {
          clauseId: item.id,
          linkedDocument: evidenceDoc ? {
            title: evidenceDoc.title,
            type: evidenceDoc.type,
            extractedReference: evidenceDoc.content.substring(0, 150) + "..."
          } : null,
          completedWorkOrdersCount: relatedWos.length,
          completedWorkOrdersList: relatedWos.map(w => ({
            id: w.id,
            title: w.title,
            completedDate: w.completedDate,
            inspector: w.performedBy
          }))
        };
      }),
      complianceAffirmation: {
        certificationStamp: `AI-BRAIN-COMPLIANCE-VERIFIED-${authority.toUpperCase().substring(0, 4)}`,
        status: items.every(i => i.status === 'Compliant') ? "FULLY_COMPLIANT" : "PENDING_GAPS",
        reviewerSignature: "Unified Operations Brain Automated Compliance Auditor"
      }
    };

    return res.json(auditPackage);
  } catch (error) {
    console.error("Error generating audit package:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}

module.exports = {
  getCompliance,
  verifyCompliance,
  generateAuditPackage
};
