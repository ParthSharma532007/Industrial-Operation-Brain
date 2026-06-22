const db = require('../config/db');

/**
 * Retrieval-Augmented Generation (RAG) Service
 * Implements local keyword search, ranking, context retrieval, and expert response synthesis.
 */

function cleanText(t) {
  return t.toLowerCase().replace(/[^a-z0-9\s-]/g, '');
}

function queryRAG(queryText) {
  const dbData = db.getData();
  const documents = dbData.documents;
  const assets = dbData.assets;
  const workOrders = dbData.workOrders;

  const queryClean = cleanText(queryText);
  const queryWords = queryClean.split(/\s+/).filter(w => w.length > 2);

  // 1. Detect Equipment Tag in Query
  let targetAsset = null;
  for (const asset of assets) {
    if (queryClean.includes(asset.id.toLowerCase())) {
      targetAsset = asset;
      break;
    }
  }

  // 2. Score and retrieve relevant document chunks
  const searchResults = [];

  documents.forEach(doc => {
    let score = 0;
    const docTextClean = cleanText(doc.content + " " + doc.title + " " + doc.type);

    // Exact tag match gets huge boost
    if (targetAsset && docTextClean.includes(targetAsset.id.toLowerCase())) {
      score += 100;
    }

    // Keyword match overlap
    queryWords.forEach(word => {
      if (docTextClean.includes(word)) {
        score += 20;
      }
    });

    if (score > 0) {
      // Find the most relevant paragraph/sentence as snippet
      const sentences = doc.content.split(/[.!?]+/);
      let bestSnippet = "";
      let bestSnippetScore = 0;

      sentences.forEach(s => {
        let sScore = 0;
        const sClean = cleanText(s);
        
        queryWords.forEach(w => {
          if (sClean.includes(w)) sScore += 10;
        });
        if (targetAsset && sClean.includes(targetAsset.id.toLowerCase())) {
          sScore += 50;
        }

        if (sScore > bestSnippetScore) {
          bestSnippetScore = sScore;
          bestSnippet = s.trim();
        }
      });

      if (!bestSnippet && sentences.length > 0) {
        bestSnippet = sentences[0].trim();
      }

      // Calculate confidence (cap at 98% for realistic AI scores)
      const confidence = Math.min(98, Math.round(50 + (score / 3)));

      searchResults.push({
        id: doc.id,
        title: doc.title,
        type: doc.type,
        category: doc.category,
        filePath: doc.filePath,
        snippet: bestSnippet,
        score: score,
        confidence: confidence
      });
    }
  });

  // Sort by relevance score
  searchResults.sort((a, b) => b.score - a.score);

  // 3. Synthesize the Expert Response (Simulated LLM Generator)
  let answer = "";
  let confidenceScore = 0;

  if (searchResults.length === 0) {
    answer = "I could not find any relevant documents or operating history in the Asset Database matching your query. Please refine your query to include specific equipment tags (e.g., P-101, V-202) or standard operational terms (e.g., isolation, calibration, LOTO).";
    confidenceScore = 15;
  } else {
    // Select top citations (limit to 3)
    const topCitations = searchResults.slice(0, 3);
    confidenceScore = Math.max(...topCitations.map(c => c.confidence));

    // Dynamic synthesis depending on query intent
    const isIsolation = queryClean.includes('isolate') || queryClean.includes('isolation') || queryClean.includes('shut') || queryClean.includes('loto') || queryClean.includes('maintenance');
    const isCalibration = queryClean.includes('calibrate') || queryClean.includes('calibration') || queryClean.includes('instrument') || queryClean.includes('leak');
    const isIncident = queryClean.includes('incident') || queryClean.includes('failure') || queryClean.includes('leak') || queryClean.includes('breakdown') || queryClean.includes('downtime');
    const isRegulation = queryClean.includes('regulation') || queryClean.includes('rule') || queryClean.includes('act') || queryClean.includes('compliance') || queryClean.includes('peso') || queryClean.includes('factory');

    if (targetAsset) {
      answer += `### Operational Intelligence Report for **${targetAsset.id}** (${targetAsset.name})\n\n`;
      answer += `* **Active Operating Location**: ${targetAsset.location}\n`;
      answer += `* **Criticality Class**: **${targetAsset.criticality}**\n`;
      answer += `* **Current Asset Health Score**: ${targetAsset.healthScore}%\n`;
      
      if (targetAsset.id === 'V-202' && targetAsset.status === 'Degraded') {
        answer += `* ⚠️ **ALERT**: This asset is currently flagged as **${targetAsset.status}** with high vibration (**${targetAsset.metrics.vibration}**) and high operating temperature (**${targetAsset.metrics.temperature}**).\n\n`;
      } else {
        answer += `* **Status**: ${targetAsset.status}\n\n`;
      }

      if (isIsolation && targetAsset.id === 'P-101') {
        answer += `According to the standard operating procedures, the isolation protocol for **P-101** requires a sequence of electrical and process safety lockouts [1]:\n\n`;
        answer += `1. **Electrical Isolation**: Switch off the pump motor locally and apply electrical **LOTO** at the Substation Electrical Panel.\n`;
        answer += `2. **Valving**: Close the pump suction valve completely (chain-lock secured), then close the discharge valve.\n`;
        answer += `3. **Pressure Bleeding**: Open the casing drain valve slowly to blowdown. Casing pressure must be verified at **0 bar** on the local pressure gauge before dismantling [1].\n`;
        answer += `4. **Compliance Note**: Mechanical guarding must remain securely locked during operation to comply with **Factory Act Section 21** [1, 3].\n\n`;
      } else if (isCalibration || (isIsolation && targetAsset.id === 'V-202')) {
        answer += `For high-pressure regulating control valve **V-202**, calibration and isolation guidelines dictate specific care due to thermal and cyclic fatigue risk (max design: 45 bar, 120°C) [2]:\n\n`;
        answer += `1. **Bypass Configuration**: Open the bypass line to maintain circuit flow prior to V-202 isolation.\n`;
        answer += `2. **Actuator Calibration**: Set air regulators and stroke the valve progressively (0% to 100%) to calibrate the digital positioner [2].\n`;
        answer += `3. **Critical Fatigue Mitigation**: Inspect the gland packing regularly. A previous leak incident on V-202 in October 2025 [4] due to vibration fatigue (6.5 mm/s) requires that gland packing bolts be torqued to exactly **45 Nm** using a calibrated torque wrench [4].\n`;
        answer += `4. **Regulatory Requirement**: Under **PESO SMPV Rules**, relief loops and control elements require mandatory annual checking [3].\n\n`;
      } else if (isIncident && targetAsset.id === 'V-202') {
        answer += `Historically, control valve **V-202** experienced a **thermal fatigue hydrocarbon vapor leak** on **October 18, 2025** [4].\n\n`;
        answer += `* **Impact**: 18 hours of unplanned plant downtime.\n`;
        answer += `* **Root Cause**: Thermal cycle changes (up to 118°C) combined with high vibration (6.5 mm/s) loosened the gland packing nuts, drying out the seal packing.\n`;
        answer += `* **Mitigation / SOP Change**: Installed high-density graphite rings, mandating monthly vibration audits, and tightening bolts to **45 Nm** during calibration as updated in the valve SOP [2, 4].\n\n`;
      } else {
        // General asset info search synthesis
        answer += `Database query indicates **${targetAsset.id}** is depicted in the engineering drawing **${searchResults[0].title}** [1].\n`;
        const governedDoc = topCitations.find(c => c.category === 'SOP');
        if (governedDoc) {
          answer += `Its operations are governed by standard operating procedure **${governedDoc.title}** [2].\n`;
        }
        const incidentDoc = topCitations.find(c => c.category === 'Incident');
        if (incidentDoc) {
          answer += `⚠️ **Note**: This asset was involved in a past reliability incident: *"${incidentDoc.title}"* [4]. Refer to the incident report to check corrective actions.\n`;
        }
        answer += `\n`;
      }
    } else {
      // General non-asset query synthesis
      answer += `### Search results for query: "${queryText}"\n\n`;
      answer += `I found relevant guidelines in **${searchResults.length}** document(s) in the corpus. Here is a summary of the retrieved information:\n\n`;
      
      topCitations.forEach((cit, idx) => {
        answer += `* **[Reference ${idx + 1}]** *${cit.title}* (${cit.type}): "${cit.snippet}"\n`;
      });
      answer += `\n`;
    }

    // Add citations footnotes formatting
    answer += `#### Citations & Sources\n`;
    topCitations.forEach((cit, idx) => {
      answer += `* **[${idx + 1}]** [${cit.title}](file:///${cit.filePath}) - Category: *${cit.category}* (Confidence: ${cit.confidence}%)\n`;
    });
  }

  return {
    answer: answer,
    citations: searchResults,
    confidenceScore: confidenceScore
  };
}

module.exports = {
  queryRAG
};
