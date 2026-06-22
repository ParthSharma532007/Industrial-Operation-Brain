# Walkthrough: Unified Asset & Operations Brain Deliverables

This walkthrough outlines all key deliverables for the **Unified Asset & Operations Brain** platform, including execution instructions, architectural design, slide-deck presentation links, and a full interactive demo video.

---

## 🚀 1. Working Prototype

The prototype is a fully functioning Single Page Application (SPA) backed by a Node.js/Express server using MVC architecture. It features raw text OCR ingestion, custom physics-based graph rendering, a RAG copilot with document citation, and automatic compliance and failure analysis (RCA).

### How to Run Locally

1. **Verify/Install Node.js Dependencies** (Run inside the workspace directory):
   ```bash
   npm install
   ```
2. **Start the Express Server**:
   ```bash
   npm run dev
   ```
3. **Open the Application**:
   Navigate to [http://localhost:3000/](http://localhost:3000/) in your web browser.

### Key Codebase Files
- **Server Entrypoint & Routing**: [server.js](file:///c:/Users/Parth/hackathon%20-%20AI%20for%20Industrial%20Knowledge%20Intelligence/server.js)
- **Frontend Markup**: [index.html](file:///c:/Users/Parth/hackathon%20-%20AI%20for%20Industrial%20Knowledge%20Intelligence/public/index.html)
- **Client Application Logic**: [app.js](file:///c:/Users/Parth/hackathon%20-%20AI%20for%20Industrial%20Knowledge%20Intelligence/public/app.js)
- **Design & Theme Stylesheet**: [style.css](file:///c:/Users/Parth/hackathon%20-%20AI%20for%20Industrial%20Knowledge%20Intelligence/public/style.css)
- **Controllers & Services**: Located in the [src](file:///c:/Users/Parth/hackathon%20-%20AI%20for%20Industrial%20Knowledge%20Intelligence/src) folder structure.

---

## 📊 2. Architecture Diagram

The application implements a decoupled MVC (Model-View-Controller) pattern with modular NLP extraction and vector/graph RAG searching. Below is the block flowchart:

```mermaid
graph TD
    subgraph "Frontend UI (Single Page App)"
        A["Dashboard & Safety Alerts"]
        B["Document Ingestor UI"]
        C["2D Force Graph (Canvas)"]
        D["RAG Expert Chat"]
        E["Maintenance & RCA Console"]
        F["Compliance Auditor"]
    end

    subgraph "Express MVC Backend (server.js)"
        R["API Routes"]
        C1["Document Controller"]
        C2["Chat Controller"]
        C3["Maintenance Controller"]
        C4["Compliance Controller"]
        C5["Graph Controller"]
    end

    subgraph "Knowledge Extraction & Database"
        DB["In-Memory Database State (data/)"]
        NLP["Rule-based NLP Entity Extractor"]
        KB["Ontology & Knowledge Graph Nodes"]
    end

    A & B & C & D & E & F -->|HTTP Requests| R
    R --> C1 & C2 & C3 & C4 & C5
    C1 -->|Extract & Link| NLP
    NLP -->|Nodes & Edges| KB
    C5 -->|Query Graph Nodes| KB
    C2 -->|Retrieve Context & Cite| DB
    C2 -->|Graph Search| KB
    C3 -->|Run Diagnostics & FMEA| DB
    C4 -->|Verify Compliance Laws| DB
```

---

## 📢 3. Presentation Deck

We have built a dedicated **Pitch Deck / Presentation** served directly by the web server. It contains slides covering the market challenge (the industrial knowledge cliff), our universal ingestion pipeline, core value propositions, and future roadmaps.

- **Access URL**: [http://localhost:3000/presentation.html](http://localhost:3000/presentation.html)
- **Source File**: [presentation.html](file:///c:/Users/Parth/hackathon%20-%20AI%20for%20Industrial%20Knowledge%20Intelligence/public/presentation.html)

> [!TIP]
> You can also click the **"Pitch Deck"** shortcut button directly in the top header of the main dashboard to open it in a new browser tab.

---

## 🎥 4. Demo Video & Visuals

Here is the automatically recorded walk-through demonstration showing the prototype in action:

### Walkthrough Demo Video
![Operations Brain Walkthrough Demo](operations_brain_demo.webp)

---

### Interactive UI Highlights

Below are screenshots captured during the walkthrough showing individual dashboard components:

````carousel
![2D Physics Knowledge Graph](knowledge_graph_page.png)
<!-- slide -->
![Graph Node Property Inspector](graph_node_selected.png)
<!-- slide -->
![Root Cause Analysis (RCA) Generator](rca_report_details.png)
````
