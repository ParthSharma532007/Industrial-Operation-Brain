/**
 * Natural Language Processing (NLP) Service for Industrial Document Intelligence
 * Simulates OCR-to-Text entity extraction, tagging, and relation mapping.
 */

const TAG_REGEX = /\b([A-Z]{1,3}-[0-9]{3,4})\b/g;
const PARAMETER_REGEX = /\b(\d+(?:\.\d+)?\s*(?:bar|°C|Nm|mm\/s|m³\/h|m|kW|MW|%|hours|hrs))\b/gi;
const REGULATION_REGEX = /\b(PESO|Factory Act Section \d+|Factories Act Section \d+|SMPV Rules|OISD\b[^\n,.]*)/gi;

function extractEntities(text) {
  const entities = [];
  const seenTexts = new Set();

  // 1. Extract Equipment Tags (e.g., P-101, V-202, T-301)
  let match;
  TAG_REGEX.lastIndex = 0;
  while ((match = TAG_REGEX.exec(text)) !== null) {
    const tag = match[1].toUpperCase();
    const key = `tag_${tag}`;
    if (!seenTexts.has(key)) {
      seenTexts.add(key);
      entities.push({
        text: tag,
        type: 'EquipmentTag',
        refId: tag
      });
    }
  }

  // 2. Extract Process Parameters (e.g., 120°C, 15 bar, 6.8 mm/s)
  PARAMETER_REGEX.lastIndex = 0;
  while ((match = PARAMETER_REGEX.exec(text)) !== null) {
    const param = match[1];
    const key = `param_${param.toLowerCase()}`;
    if (!seenTexts.has(key)) {
      seenTexts.add(key);
      
      let label = 'Process Parameter';
      if (param.includes('°C')) label = 'Operating Temperature';
      else if (param.includes('bar')) label = 'Operating Pressure';
      else if (param.includes('mm/s')) label = 'Vibration Level';
      else if (param.includes('Nm')) label = 'Tightening Torque';
      else if (param.includes('m³/h')) label = 'Flow Rate';

      entities.push({
        text: param,
        type: 'ProcessParameter',
        label: label
      });
    }
  }

  // 3. Extract Regulatory References
  REGULATION_REGEX.lastIndex = 0;
  while ((match = REGULATION_REGEX.exec(text)) !== null) {
    const reg = match[1].trim();
    const key = `reg_${reg.toLowerCase()}`;
    if (!seenTexts.has(key)) {
      seenTexts.add(key);
      entities.push({
        text: reg,
        type: 'RegulatoryReference',
        label: reg.startsWith('PESO') ? 'PESO Standard' : 'Compliance Code'
      });
    }
  }

  // 4. Add generic keywords if they are highly indicative
  const keywords = [
    { text: 'LOTO', type: 'SafetyProcedure', label: 'Lock-Out Tag-Out' },
    { text: 'Permit to Work', type: 'SafetyProcedure', label: 'PTW Requirements' },
    { text: 'Fencing', type: 'SafetyProcedure', label: 'Mechanical Safeguard' },
    { text: 'helium leak test', type: 'TestingProcedure', label: 'Leak Testing' },
    { text: 'Form VIII', type: 'RegulatoryDocument', label: 'Safety Certification' }
  ];

  keywords.forEach(kw => {
    if (text.toLowerCase().includes(kw.text.toLowerCase())) {
      const key = `kw_${kw.text.toLowerCase()}`;
      if (!seenTexts.has(key)) {
        seenTexts.add(key);
        entities.push(kw);
      }
    }
  });

  return entities;
}

module.exports = {
  extractEntities
};
