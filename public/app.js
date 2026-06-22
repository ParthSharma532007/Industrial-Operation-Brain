/**
 * App.js: Operations Brain Client Frontend Code
 * Implements SPA navigation, API fetch, interactive physics-based canvas Knowledge Graph,
 * RAG Chat Copilot, RCA generator, and regulatory audit package compiler.
 */

// --- STATE MANAGEMENT ---
let currentTab = 'dashboard-tab';
let documents = [];
let assets = [];
let workOrders = [];
let compliance = [];
let graphData = { nodes: [], edges: [] };
let activeRCAReport = null;

// Graph Visualization Physics State
let nodes = [];
let edges = [];
let selectedNode = null;
let draggedNode = null;
let canvas, ctx;
let animationFrameId = null;

const API_BASE = '/api';

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initIngestForm();
  initChat();
  initCompliance();
  initGraphCanvas();
  
  // Initial database load
  refreshAllData().then(() => {
    renderDashboard();
  });
});

// --- API COMMUNICATIONS ---
async function refreshAllData() {
  try {
    const [docsRes, assetsRes, wosRes, compRes, graphRes] = await Promise.all([
      fetch(`${API_BASE}/documents`),
      fetch(`${API_BASE}/assets`),
      fetch(`${API_BASE}/work-orders`),
      fetch(`${API_BASE}/compliance`),
      fetch(`${API_BASE}/graph`)
    ]);

    documents = await docsRes.json();
    assets = await assetsRes.json();
    workOrders = await wosRes.json();
    compliance = await compRes.json();
    graphData = await graphRes.json();

    // Update stats counters
    document.getElementById('dash-stat-assets').innerText = assets.length;
    document.getElementById('dash-stat-docs').innerText = documents.length;
    document.getElementById('dash-stat-links').innerText = graphData.edges.length;
    document.getElementById('dash-stat-rules').innerText = compliance.length;
    
    // Update plant overall health score average
    if (assets.length > 0) {
      const avgHealth = Math.round(assets.reduce((sum, a) => sum + a.healthScore, 0) / assets.length);
      document.getElementById('dash-health-score').innerText = `${avgHealth}%`;
    }

    // Update compliance average
    if (compliance.length > 0) {
      const compliantCount = compliance.filter(c => c.status === 'Compliant').length;
      const compPercent = Math.round((compliantCount / compliance.length) * 100);
      document.getElementById('dash-compliance-percent').innerText = `${compPercent}%`;
    }

  } catch (error) {
    console.error("Failed to sync database state:", error);
  }
}

// --- VIEW NAVIGATION ---
function initTabs() {
  const navItems = document.querySelectorAll('.nav-links .nav-item');
  const panes = document.querySelectorAll('.tab-pane');
  const headerTitle = document.getElementById('current-page-title');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // Deactivate current
      navItems.forEach(i => i.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      // Activate clicked
      item.classList.add('active');
      const tabId = item.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
      currentTab = tabId;

      // Update header title
      const buttonText = item.querySelector('button').innerText.trim();
      headerTitle.innerText = buttonText + " Console";

      // Trigger tab-specific view updates
      handleTabSwitch(tabId);
    });
  });
}

function handleTabSwitch(tabId) {
  // Cancel active graph physics animation frame if not in graph tab
  if (tabId !== 'graph-tab') {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  refreshAllData().then(() => {
    switch (tabId) {
      case 'dashboard-tab':
        renderDashboard();
        break;
      case 'ingest-tab':
        renderIngestedDocuments();
        break;
      case 'graph-tab':
        setupGraphSimulation();
        break;
      case 'maint-tab':
        renderMaintenanceView();
        break;
      case 'compliance-tab':
        renderComplianceView();
        break;
    }
  });
}

// --- 1. DASHBOARD VIEW RENDER ---
function renderDashboard() {
  const alertsList = document.getElementById('dashboard-alerts-list');
  alertsList.innerHTML = "";

  // 1. Check for degraded assets
  const degradedAssets = assets.filter(a => a.status === 'Degraded');
  degradedAssets.forEach(a => {
    const row = document.createElement('div');
    row.className = 'asset-status-row status-degraded';
    row.innerHTML = `
      <div>
        <strong style="color: var(--accent-amber);"><i class="fa-solid fa-triangle-exclamation"></i> ${a.id} Telemetry Warning</strong>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
          Sensor reporting critical vibration ${a.metrics.vibration} and elevated heat ${a.metrics.temperature}.
        </p>
      </div>
      <div>
        <button class="rca-btn" onclick="openRCAForAsset('${a.id}')"><i class="fa-solid fa-brain"></i> Trigger RCA</button>
      </div>
    `;
    alertsList.appendChild(row);
  });

  // 2. Check for overdue compliance items
  const nonCompliant = compliance.filter(c => c.status === 'Non-Compliant');
  nonCompliant.forEach(c => {
    const row = document.createElement('div');
    row.className = 'asset-status-row status-degraded';
    row.innerHTML = `
      <div>
        <strong style="color: var(--accent-rose);"><i class="fa-solid fa-file-shield"></i> Regulatory Compliance Overdue</strong>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
          Standard "${c.ruleName}" under ${c.authority} is overdue for target asset ${c.targetAsset}.
        </p>
      </div>
      <div>
        <button class="rca-btn" style="background: rgba(0, 230, 118, 0.1); border-color: rgba(0, 230, 118, 0.3); color: var(--accent-emerald);" onclick="switchToComplianceTab()">Verify Gaps</button>
      </div>
    `;
    alertsList.appendChild(row);
  });

  // 3. Check for open Breakdown tickets
  const activeWOs = workOrders.filter(w => w.status === 'Pending' && w.type === 'Breakdown');
  activeWOs.forEach(w => {
    const row = document.createElement('div');
    row.className = 'asset-status-row status-degraded';
    row.innerHTML = `
      <div>
        <strong style="color: var(--accent-rose);"><i class="fa-solid fa-screwdriver-wrench"></i> Active Breakdown Ticket (${w.id})</strong>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
          Asset ${w.assetId} - "${w.title}" - Scheduled for: ${w.scheduledDate}
        </p>
      </div>
      <div>
        <button class="rca-btn" onclick="openRCAForAsset('${w.assetId}')"><i class="fa-solid fa-brain"></i> Analyze Failures</button>
      </div>
    `;
    alertsList.appendChild(row);
  });

  if (alertsList.children.length === 0) {
    alertsList.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 14px;">
        <i class="fa-solid fa-circle-check" style="font-size: 32px; color: var(--accent-emerald); margin-bottom: 12px; display: block;"></i>
        All plant monitoring loops operate within safe threshold envelopes. Zero alerts active.
      </div>
    `;
  }
}

function switchToComplianceTab() {
  const item = document.querySelector('.nav-links button[data-tab="compliance-tab"]') || document.querySelector('[data-tab="compliance-tab"]');
  item.click();
}

// --- 2. DOCUMENT INGESTOR VIEW ---
function initIngestForm() {
  const form = document.getElementById('upload-doc-form');
  const statusDiv = document.getElementById('upload-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusDiv.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Analyzing document text via NLP pipeline...`;

    const title = document.getElementById('upload-title').value;
    const type = document.getElementById('upload-type').value;
    const category = document.getElementById('upload-category').value;
    const content = document.getElementById('upload-content').value;

    try {
      const response = await fetch(`${API_BASE}/documents/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, category, content })
      });

      if (!response.ok) {
        throw new Error("Server ingest error");
      }

      const result = await response.json();
      statusDiv.innerHTML = `<span style="color: var(--accent-emerald);"><i class="fa-solid fa-circle-check"></i> Ingestion and Graph Linkage Complete!</span>`;
      
      // Clear inputs
      form.reset();

      // Show entity preview panel
      showExtractedEntities(result.document, result.entities);
      
      // Reload document lists
      refreshAllData().then(() => {
        renderIngestedDocuments();
      });

    } catch (err) {
      statusDiv.innerHTML = `<span style="color: var(--accent-rose);"><i class="fa-solid fa-circle-xmark"></i> Failed to ingest document. Check network/server.</span>`;
    }
  });

  // Setup Document details overlay close
  document.getElementById('btn-close-overlay').addEventListener('click', () => {
    document.getElementById('doc-viewer-overlay').style.display = 'none';
  });
}

function showExtractedEntities(doc, entities) {
  const card = document.getElementById('extraction-preview-card');
  const msg = document.getElementById('extracted-msg');
  const badgesContainer = document.getElementById('extracted-badge-container');

  card.style.display = 'block';
  msg.innerHTML = `Discovered <strong>${entities.length} metadata elements</strong> in <em>"${doc.title}"</em>:`;
  badgesContainer.innerHTML = "";

  if (entities.length === 0) {
    badgesContainer.innerHTML = `<span style="font-size: 13px; color: var(--text-muted);">No key tags or numbers extracted automatically. Node created inside graph standalone.</span>`;
    return;
  }

  entities.forEach(entity => {
    const badge = document.createElement('span');
    let colorClass = 'entity-tag';
    let icon = 'fa-tag';

    if (entity.type === 'ProcessParameter') {
      colorClass = 'entity-param';
      icon = 'fa-gauge';
    } else if (entity.type === 'RegulatoryReference') {
      colorClass = 'entity-reg';
      icon = 'fa-shield';
    } else if (entity.type === 'SafetyProcedure') {
      colorClass = 'entity-warning';
      icon = 'fa-lock';
    }

    badge.className = `entity-badge ${colorClass}`;
    badge.innerHTML = `<i class="fa-solid ${icon}"></i> <strong>${entity.text}</strong> (${entity.label || entity.type})`;
    badgesContainer.appendChild(badge);
  });
}

function renderIngestedDocuments() {
  const docsList = document.getElementById('ingested-docs-list');
  docsList.innerHTML = "";

  if (documents.length === 0) {
    docsList.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">Zero indexed documents. Paste an instruction sheet above to initialize index.</div>`;
    return;
  }

  documents.forEach(doc => {
    const row = document.createElement('div');
    row.className = 'asset-status-row';
    row.style.cursor = 'pointer';
    row.style.marginBottom = '8px';
    
    let typeIcon = 'fa-file-lines';
    if (doc.category === 'P&ID') typeIcon = 'fa-compass-drafting';
    else if (doc.category === 'Regulation') typeIcon = 'fa-scale-balanced';
    else if (doc.category === 'Incident') typeIcon = 'fa-fire-extinguisher';

    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="font-size: 20px; color: var(--accent-cyan);"><i class="fa-solid ${typeIcon}"></i></div>
        <div>
          <strong style="color: #fff;">${doc.title}</strong>
          <span style="font-size: 11px; color: var(--text-muted); display: block; margin-top: 3px;">
            Type: ${doc.type} | Date Indexed: ${new Date(doc.uploadDate).toLocaleDateString()}
          </span>
        </div>
      </div>
    `;
    
    row.addEventListener('click', () => openDocViewer(doc));
    docsList.appendChild(row);
  });
}

function openDocViewer(doc) {
  document.getElementById('overlay-doc-title').innerText = doc.title;
  document.getElementById('overlay-doc-body').innerHTML = `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; font-family: var(--font-sans);">
      ${doc.content.replace(/\n/g, '<br>')}
    </div>
  `;

  const badges = document.getElementById('overlay-doc-entities');
  badges.innerHTML = "";
  if (doc.entities && doc.entities.length > 0) {
    doc.entities.forEach(entity => {
      const badge = document.createElement('span');
      let typeClass = 'entity-tag';
      if (entity.type === 'ProcessParameter') typeClass = 'entity-param';
      else if (entity.type === 'RegulatoryReference') typeClass = 'entity-reg';
      
      badge.className = `entity-badge ${typeClass}`;
      badge.innerText = `${entity.text} [${entity.label || entity.type}]`;
      badges.appendChild(badge);
    });
  } else {
    badges.innerHTML = `<span style="color: var(--text-muted);">None</span>`;
  }

  document.getElementById('doc-viewer-overlay').style.display = 'flex';
}

// --- 3. DYNAMIC KNOWLEDGE GRAPH EXPLORER (2D PHYSICS SIMULATION) ---
function initGraphCanvas() {
  canvas = document.getElementById('graph-canvas');
  ctx = canvas.getContext('2d');

  // Handle Resize
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Mouse Listeners for Drag and Select
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseUp);

  document.getElementById('btn-refresh-graph').addEventListener('click', () => {
    setupGraphSimulation();
  });
}

function resizeCanvas() {
  if (canvas) {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight || 500;
  }
}

function setupGraphSimulation() {
  resizeCanvas();
  
  if (!graphData.nodes || graphData.nodes.length === 0) {
    return;
  }

  // Pre-process nodes mapping them to physics elements
  nodes = graphData.nodes.map(n => {
    // Check if node exists already in memory to preserve position
    const existing = nodes.find(old => old.id === n.id);
    return {
      id: n.id,
      label: n.label,
      group: n.group,
      details: n.details,
      x: existing ? existing.x : Math.random() * (canvas.width - 200) + 100,
      y: existing ? existing.y : Math.random() * (canvas.height - 200) + 100,
      vx: 0,
      vy: 0,
      radius: n.group === 'Equipment' ? 24 : n.group === 'Incident' ? 20 : 18,
      pinned: false
    };
  });

  edges = graphData.edges.map(e => {
    return {
      fromNode: nodes.find(n => n.id === e.from),
      toNode: nodes.find(n => n.id === e.to),
      label: e.label
    };
  }).filter(e => e.fromNode && e.toNode); // Filter out dead links

  selectedNode = null;
  document.getElementById('graph-node-details-card').style.display = 'none';

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  animationFrameId = requestAnimationFrame(updatePhysicsFrame);
}

function updatePhysicsFrame() {
  if (currentTab !== 'graph-tab') return;

  // Physics Simulation calculations (forces: center pull, repulsion, spring attraction)
  const kSpring = 0.04;
  const lenSpring = 120;
  const repulsionDistSq = 20000;
  const kRepel = 200;
  const friction = 0.85;

  // 1. Center Pull Force
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  nodes.forEach(n => {
    if (n.pinned) return;
    
    // Pull slightly to center
    n.vx += (cx - n.x) * 0.001;
    n.vy += (cy - n.y) * 0.001;

    // Node Repulsion
    nodes.forEach(other => {
      if (n.id === other.id) return;
      const dx = n.x - other.x;
      const dy = n.y - other.y;
      const distSq = dx*dx + dy*dy + 0.01;

      if (distSq < repulsionDistSq) {
        const force = kRepel / Math.sqrt(distSq);
        n.vx += (dx / Math.sqrt(distSq)) * force;
        n.vy += (dy / Math.sqrt(distSq)) * force;
      }
    });
  });

  // 2. Hooke's Law Spring Force for Links
  edges.forEach(e => {
    const dx = e.toNode.x - e.fromNode.x;
    const dy = e.toNode.y - e.fromNode.y;
    const dist = Math.sqrt(dx*dx + dy*dy) + 0.01;

    const force = (dist - lenSpring) * kSpring;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    if (!e.fromNode.pinned) {
      e.fromNode.vx += fx;
      e.fromNode.vy += fy;
    }
    if (!e.toNode.pinned) {
      e.toNode.vx -= fx;
      e.toNode.vy -= fy;
    }
  });

  // 3. Apply positions
  nodes.forEach(n => {
    if (n.pinned) return;

    n.vx *= friction;
    n.vy *= friction;
    
    n.x += n.vx;
    n.y += n.vy;

    // Keep in boundary
    n.x = Math.max(n.radius, Math.min(canvas.width - n.radius, n.x));
    n.y = Math.max(n.radius, Math.min(canvas.height - n.radius, n.y));
  });

  // 4. Render Frame
  drawGraph();

  animationFrameId = requestAnimationFrame(updatePhysicsFrame);
}

function drawGraph() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Edges first
  ctx.lineWidth = 1.5;
  edges.forEach(e => {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.moveTo(e.fromNode.x, e.fromNode.y);
    ctx.lineTo(e.toNode.x, e.toNode.y);
    ctx.stroke();

    // Draw edge labels in the middle of link
    const mx = (e.fromNode.x + e.toNode.x) / 2;
    const my = (e.fromNode.y + e.toNode.y) / 2;
    ctx.font = '10px Outfit';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.fillText(e.label, mx, my - 4);
  });

  // Draw Nodes
  nodes.forEach(n => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
    
    let color = '#273142';
    let glowColor = 'rgba(39, 49, 66, 0.5)';
    let textColor = '#fff';

    if (n.group === 'Equipment') {
      color = 'var(--accent-cyan)';
      glowColor = 'rgba(0, 216, 255, 0.3)';
    } else if (n.group === 'Document') {
      color = '#a855f7';
      glowColor = 'rgba(168, 85, 247, 0.3)';
    } else if (n.group === 'Regulation') {
      color = 'var(--accent-emerald)';
      glowColor = 'rgba(0, 230, 118, 0.3)';
    } else if (n.group === 'Incident') {
      color = 'var(--accent-rose)';
      glowColor = 'rgba(255, 61, 0, 0.3)';
    }

    // Shadow glow
    ctx.shadowBlur = 12;
    ctx.shadowColor = glowColor;
    ctx.fillStyle = color;
    ctx.fill();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw border if selected
    if (selectedNode && selectedNode.id === n.id) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }

    // Node labels
    ctx.font = '11px Outfit';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(n.label, n.x, n.y + n.radius + 15);
  });
}

// Mouse event handlers for graph canvas
function handleMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  // Find if we clicked on a node
  let clicked = null;
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    const dx = n.x - mx;
    const dy = n.y - my;
    if (dx*dx + dy*dy <= n.radius*n.radius) {
      clicked = n;
      break;
    }
  }

  if (clicked) {
    selectedNode = clicked;
    draggedNode = clicked;
    clicked.pinned = true;
    
    // Fill node inspector
    showNodeDetails(clicked);
  } else {
    selectedNode = null;
    document.getElementById('graph-node-details-card').style.display = 'none';
  }
}

function handleMouseMove(e) {
  if (draggedNode) {
    const rect = canvas.getBoundingClientRect();
    draggedNode.x = e.clientX - rect.left;
    draggedNode.y = e.clientY - rect.top;
  }
}

function handleMouseUp() {
  if (draggedNode) {
    draggedNode.pinned = false;
    draggedNode = null;
  }
}

function showNodeDetails(node) {
  const card = document.getElementById('graph-node-details-card');
  const body = document.getElementById('graph-node-inspector-body');

  card.style.display = 'block';
  
  let entityDetailsHtml = "";
  if (node.group === 'Equipment') {
    const asset = assets.find(a => a.id === node.id.replace('node_', ''));
    if (asset) {
      entityDetailsHtml = `
        <p><strong>Asset Tag ID:</strong> ${asset.id}</p>
        <p><strong>Common Name:</strong> ${asset.name}</p>
        <p><strong>Current Operational Status:</strong> <span class="badge-status ${asset.status === 'Active' ? 'status-compliant' : 'status-gap'}">${asset.status}</span></p>
        <p><strong>Plant Location:</strong> ${asset.location}</p>
        <p><strong>Health Score Index:</strong> ${asset.healthScore}%</p>
        <div style="margin-top: 10px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;">
          <strong>Live Sensor Telemetry:</strong>
          <ul style="margin-left: 20px; margin-top: 4px;">
            ${Object.entries(asset.metrics).map(([k, v]) => `<li>${k}: ${v}</li>`).join('')}
          </ul>
        </div>
      `;
    }
  } else if (node.group === 'Document') {
    const docId = node.id.replace('node_', '');
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      entityDetailsHtml = `
        <p><strong>Document ID:</strong> ${doc.id}</p>
        <p><strong>Title:</strong> ${doc.title}</p>
        <p><strong>File Classification:</strong> ${doc.type}</p>
        <p><strong>Extracted OCR Content Snippet:</strong></p>
        <blockquote style="margin: 8px 0; border-left: 2px solid var(--accent-cyan); padding-left: 10px; font-style: italic; color: var(--text-muted);">
          "${doc.content.substring(0, 160)}..."
        </blockquote>
        <button class="upload-btn" style="padding: 6px 12px; font-size: 12px;" onclick="openDocViewerById('${doc.id}')">View Full Text Content</button>
      `;
    }
  } else {
    // Regulations or Incident nodes
    entityDetailsHtml = `
      <p><strong>Classification:</strong> ${node.group}</p>
      <p><strong>Element Identifier:</strong> ${node.label}</p>
      <p><strong>Description Details:</strong> ${node.details}</p>
    `;
  }

  body.innerHTML = entityDetailsHtml;
}

function openDocViewerById(docId) {
  const doc = documents.find(d => d.id === docId);
  if (doc) openDocViewer(doc);
}

// --- 4. EXPERT COPILOT VIEW (RAG CHAT) ---
function initChat() {
  const chatInput = document.getElementById('chat-input-field');
  const chatSendBtn = document.getElementById('chat-send-btn');
  const chatConversation = document.getElementById('chat-conversation');

  chatSendBtn.addEventListener('click', sendChatMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });

  // Setup click for suggestion chips
  const chips = document.querySelectorAll('.suggested-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      chatInput.value = q;
      sendChatMessage();
    });
  });
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input-field');
  const conversation = document.getElementById('chat-conversation');
  const query = input.value.trim();

  if (!query) return;

  // Append user message
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble bubble-user';
  userBubble.innerText = query;
  conversation.appendChild(userBubble);
  
  // Clear input
  input.value = "";
  conversation.scrollTop = conversation.scrollHeight;

  // Append loading state
  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'chat-bubble bubble-ai';
  loadingBubble.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Operations Brain is traversing documents and graph...`;
  conversation.appendChild(loadingBubble);
  conversation.scrollTop = conversation.scrollHeight;

  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (!response.ok) throw new Error();

    const data = await response.json();

    // Format AI Answer markup (simple markdown parsing for header lists)
    let formattedText = data.answer
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\* (.*)/g, '<li>$1</li>')
      .replace(/(\n|^)<li>/g, '$1<ul><li>') // Wrap sequential list items
      .replace(/<\/li>(\n|$)(?!<li>)/g, '</li></ul>$1'); // close lists

    // Parse citation links footnotes like [1] to trigger file view clicks
    formattedText = formattedText.replace(/\[([0-9])\]/g, (match, num) => {
      const citationIdx = parseInt(num) - 1;
      const citation = data.citations[citationIdx];
      if (citation) {
        return `[<a class="citation-link" onclick="openDocViewerById('${citation.id}')">${num}</a>]`;
      }
      return match;
    });

    // Replace the loading bubble with complete output
    loadingBubble.innerHTML = `
      <div class="confidence-indicator">
        <i class="fa-solid fa-circle-nodes"></i> Confidence: ${data.confidenceScore}%
      </div>
      <div class="chat-response-content">${formattedText}</div>
    `;

    conversation.scrollTop = conversation.scrollHeight;

  } catch (err) {
    loadingBubble.innerHTML = `<span style="color: var(--accent-rose);"><i class="fa-solid fa-circle-xmark"></i> Connection error. Could not reach RAG agent.</span>`;
  }
}

// --- 5. MAINTENANCE & RCA AGENT VIEW ---
function renderMaintenanceView() {
  const container = document.getElementById('maintenance-assets-list');
  container.innerHTML = "";

  assets.forEach(asset => {
    const row = document.createElement('div');
    const isDegraded = asset.status === 'Degraded';
    row.className = `asset-status-row ${isDegraded ? 'status-degraded' : 'status-active'}`;
    row.style.marginBottom = '10px';

    row.innerHTML = `
      <div>
        <strong style="color: #fff;">${asset.id} : ${asset.name}</strong>
        <span style="font-size: 12px; color: var(--text-muted); display: block; margin-top: 3px;">
          Location: ${asset.location} | Criticality: ${asset.criticality} | Health Score: ${asset.healthScore}%
        </span>
      </div>
      <div>
        <button class="rca-btn" onclick="openRCAForAsset('${asset.id}')">
          <i class="fa-solid fa-brain"></i> ${isDegraded ? 'Generate Brain RCA' : 'Run Diagnostics'}
        </button>
      </div>
    `;

    container.appendChild(row);
  });
}

async function openRCAForAsset(assetId) {
  // Switch to maintenance tab if not there
  const maintTabBtn = document.querySelector('[data-tab="maint-tab"]');
  if (!maintTabBtn.parentElement.classList.contains('active')) {
    maintTabBtn.click();
  }

  const outputCard = document.getElementById('rca-output-card');
  outputCard.style.display = 'block';
  
  // Fill loading state
  document.getElementById('rca-card-title').innerText = `Generating Root Cause Analysis for ${assetId}...`;
  document.getElementById('rca-confidence').innerText = "Analyzing links...";
  document.getElementById('rca-chronology-container').innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Traversing ontology graph...`;
  document.getElementById('rca-hypotheses-container').innerHTML = "";
  document.getElementById('rca-actions-container').innerHTML = "";

  try {
    const response = await fetch(`${API_BASE}/maintenance/rca`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId })
    });

    if (!response.ok) throw new Error();

    const data = await response.json();
    activeRCAReport = data;

    document.getElementById('rca-card-title').innerHTML = `<i class="fa-solid fa-file-invoice"></i> Root Cause Analysis Report: <strong>${data.assetId}</strong>`;
    
    // Show overall count based on graph
    const detailsVal = data.failurePatternContext.pastIncidentsCount > 0 ? "HIGH CONFIDENCE" : "MED CONFIDENCE";
    document.getElementById('rca-confidence').innerText = `${detailsVal} (${data.failurePatternContext.pastIncidentsCount} Historical Matches)`;

    // Chronology
    const chronBox = document.getElementById('rca-chronology-container');
    chronBox.innerHTML = "";
    data.chronology.forEach(c => {
      const div = document.createElement('div');
      div.className = 'rca-chronology-item';
      div.innerHTML = `
        <span class="chronology-step">${c.step}</span>
        <span class="chronology-desc">${c.desc}</span>
      `;
      chronBox.appendChild(div);
    });

    // Hypotheses
    const hypBox = document.getElementById('rca-hypotheses-container');
    hypBox.innerHTML = "";
    data.hypotheses.forEach(h => {
      const card = document.createElement('div');
      card.className = 'rca-hypothesis-card';
      card.innerHTML = `
        <div>
          <strong style="color: #fff;">${h.title}</strong>
          <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">${h.logic}</p>
        </div>
        <div style="text-align: right; min-width: 80px;">
          <span style="color: var(--accent-amber); font-weight: 700;">${h.confidence}</span>
          <span style="font-size: 10px; display: block; color: var(--text-muted);">Match Probability</span>
        </div>
      `;
      hypBox.appendChild(card);
    });

    // Corrective Action Guidelines
    const actBox = document.getElementById('rca-actions-container');
    actBox.innerHTML = "";
    data.correctiveActions.forEach(a => {
      const card = document.createElement('div');
      card.className = 'rca-action-row';
      card.innerHTML = `
        <div class="action-title">${a.action}</div>
        <div class="action-desc">${a.procedure}</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
          <strong>Origin:</strong> ${a.authority}
        </div>
      `;
      actBox.appendChild(card);
    });

    // Scroll to report output
    outputCard.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    document.getElementById('rca-chronology-container').innerText = "Failed to load RCA report details. Check server endpoints.";
  }
}

// --- 6. REGULATORY COMPLIANCE HUB VIEW ---
function renderComplianceView() {
  const rows = document.getElementById('compliance-rows');
  rows.innerHTML = "";

  compliance.forEach(item => {
    const tr = document.createElement('tr');
    const isCompliant = item.status === 'Compliant';
    
    tr.innerHTML = `
      <td><strong>${item.ruleName}</strong></td>
      <td style="font-family: var(--font-mono); font-size: 12px;">${item.authority}</td>
      <td><span style="color: var(--accent-cyan); font-weight: 500;">${item.targetAsset}</span></td>
      <td>${item.lastAuditDate}</td>
      <td>${item.frequency}</td>
      <td>
        <span class="badge-status ${isCompliant ? 'status-compliant' : 'status-gap'}">
          ${item.status}
        </span>
      </td>
      <td>
        ${isCompliant 
          ? `<button class="rca-btn" style="background: rgba(0, 216, 255, 0.1); border-color: rgba(0, 216, 255, 0.3); color: var(--accent-cyan);" onclick="verifyComplianceItem('${item.id}', 'Compliant')">Audit Check</button>`
          : `<button class="rca-btn" style="background: rgba(255, 61, 0, 0.1); border-color: rgba(255, 61, 0, 0.3); color: var(--accent-rose);" onclick="verifyComplianceItem('${item.id}', 'Compliant')">Resolve Gap</button>`
        }
      </td>
    `;
    rows.appendChild(tr);
  });
}

async function verifyComplianceItem(id, status) {
  try {
    const response = await fetch(`${API_BASE}/compliance/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });

    if (response.ok) {
      refreshAllData().then(() => {
        renderComplianceView();
      });
    }
  } catch (err) {
    console.error("Compliance update failed:", err);
  }
}

function initCompliance() {
  const btnExport = document.getElementById('btn-export-peso');
  const btnClose = document.getElementById('btn-close-audit-overlay');
  const btnDownload = document.getElementById('btn-download-audit-file');

  btnClose.addEventListener('click', () => {
    document.getElementById('audit-package-overlay').style.display = 'none';
  });

  btnExport.addEventListener('click', async () => {
    try {
      const response = await fetch(`${API_BASE}/compliance/audit-package`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authority: 'PESO' })
      });

      if (!response.ok) throw new Error();

      const data = await response.json();
      
      // Load formatted json into text block
      const jsonBlock = document.getElementById('audit-package-json');
      jsonBlock.innerText = JSON.stringify(data, null, 2);

      // Open Modal
      document.getElementById('audit-package-overlay').style.display = 'flex';

    } catch (err) {
      alert("Error compiling regulatory package. Try again.");
    }
  });

  btnDownload.addEventListener('click', () => {
    const text = document.getElementById('audit-package-json').innerText;
    if (!text) return;

    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance_audit_evidence_package_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// Make globally clickable inside templates
window.openDocViewerById = openDocViewerById;
window.verifyComplianceItem = verifyComplianceItem;
window.openRCAForAsset = openRCAForAsset;
window.switchToComplianceTab = switchToComplianceTab;
