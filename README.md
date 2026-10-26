# AI Executive Boardroom Agent (Gemini-Powered)

An AI-powered virtual executive boardroom application designed for small businesses and startups. Business owners configure company profiles, ingest raw operational and financial data (CSV, XLSX, PDF), and ask strategic questions. Five specialist Gemini-powered executives independently examine the evidence, debate trade-offs in a substantive cross-examination critique round, and produce a unified synthesis, prioritized action plan, and downloadable PDF report.

---

## 🏛️ Architecture & Core Philosophy

This application is engineered as a **project/demo prototype** adhering to strict honesty, reliability, and conservative financial guidelines:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       NEXT.JS 14 FRONTEND (App Router)                      │
│   • Visual Boardroom (5 Executive Persona Cards, Active Speaker Pulse)      │
│   • Recharts Financial Intelligence (Deterministic Pandas KPIs)             │
│   • Real-time Server-Sent Events (SSE) Stream Listener                      │
│   • Interactive Column Mapping & Data Ingestion (CSV/XLSX Preview)          │
│   • PDF Citations Viewer & Action Items Checklist                           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST / Server-Sent Events (SSE)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                        FASTAPI BACKEND & ORCHESTRATOR                       │
│   • Google Gen AI Python SDK (`google-genai`) with Pydantic JSON Schemas    │
│   • 5 Specialist Prompts: CEO, CFO, CMO, COO, CTO (Same or Configured Model)│
│   • Multi-Round Debate Pipeline:                                            │
│       1. Problem Clarification & Evidence Audit (CEO)                       │
│       2. Independent Specialist Analyses (CFO, CMO, COO, CTO)               │
│       3. Substantive Critique & Rebuttal Cross-Examination                  │
│       4. CEO Synthesis (Preserving minority dissent & uncertainties)        │
│       5. Action Item Extraction & ReportLab PDF Generation                  │
│   • Deterministic Python/Pandas Financial Calculator (No LLM math)          │
│   • PyMuPDF (fitz) Document Text Extraction                                 │
│   • SQLite Database with SQLAlchemy ORM                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 👔 The Five Executive Specialists

All five executives utilize Google's Gemini models (`gemini-2.5-flash` by default) via the official `google-genai` Python SDK, differentiated through specialized domain system instructions and structured Pydantic response schemas:

1. **Elena Vance — CEO & Chief of Staff**:
   - Classifies the business problem, frames the strategic agenda, selects relevant specialists, moderates peer disagreement, and synthesizes the decisive final recommendation.
   - *Guardrail*: Never silently overrides factual uncertainty; strictly preserves minority dissent.
2. **Marcus Sterling — Chief Financial Officer (CFO)**:
   - Audits revenue, operating expenses, unit economics, gross/operating margins, cash runway, and capital risk.
   - *Guardrail*: Uses deterministic numbers computed by Python/Pandas. Never labels operating result as 'Net Profit' if tax or debt service are unrecorded.
3. **Sophia Chen — Chief Marketing Officer (CMO)**:
   - Evaluates target customer positioning, acquisition channels (CAC/LTV), brand messaging, and go-to-market payback.
   - *Guardrail*: Never invents marketing attribution; explicitly distinguishes verified metrics from channel assumptions.
4. **David Keller — Chief Operating Officer (COO)**:
   - Assesses execution feasibility, labor/fulfillment bottlenecks, supplier contracts, unit cost efficiencies, and timeline friction.
   - *Guardrail*: Challenges hand-waving peer timelines and flags operational capacity constraints.
5. **Dr. Tariq Al-Mansoor — Chief Technology Officer (CTO)**:
   - Evaluates technical feasibility, software architecture, SaaS vs. custom development trade-offs, API integrations, and maintenance debt.
   - *Guardrail*: Recommends off-the-shelf and low-code integrations over costly custom code.

---

## 🛡️ Non-Negotiable AI Safety & Integrity Rules

- **Official Google Gen AI SDK**: Uses official `from google import genai` SDK (`google-genai>=2.0.0`). No third-party or OpenAI/Anthropic shims.
- **Server-Side API Key Only**: `GEMINI_API_KEY` is loaded in backend `.env` only and is never transmitted to the browser, logs, or reports.
- **Deterministic Financial Calculations**: Metrics (Revenue, Expenses, Net Operating Result, Margin, MoM growth, Category breakdown) are computed deterministically via Python/Pandas, *never* hallucinated by LLM arithmetic.
- **Untrusted Document Boundary**: Uploaded PDF/CSV contents are injected into agent contexts strictly as untrusted evidence material, never as system instructions.
- **Preserved Dissent & Uncertainty**: The CEO synthesis explicitly preserves minority counter-points and unverified assumptions instead of manufacturing false consensus.
- **Transparent Simulation Fallback**: If no `GEMINI_API_KEY` is provided, the application runs in a clearly labeled offline simulation mode with verified realistic scenarios, allowing offline demonstration without falsely advertising live AI inference.

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Python 3.11+** (Tested and verified on Python 3.14.3)
- **Node.js 18+** & npm (Tested and verified on Node v24.19.0 / npm 11.17)

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` to configure your settings:
```env
# Optional: Add your Google Gemini API key from https://aistudio.google.com/
GEMINI_API_KEY=your_key_here

# Configured Gemini model:
GEMINI_MODEL=gemini-2.5-flash

DATABASE_URL=sqlite:///./boardroom.db
FRONTEND_URL=http://localhost:3000
ALLOW_SIMULATION_MODE=true
```

### 3. Backend Setup
```bash
# Create and activate virtual environment
python -m venv .venv

# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Or Windows CMD:
.\.venv\Scripts\activate.bat

# Install backend dependencies
pip install -r backend/requirements.txt
```

### 4. Frontend Setup
```bash
cd frontend
npm install
```

### 5. Starting the Application

#### Option A: Quick Launcher (Windows PowerShell)
Run the automated launcher:
```powershell
.\run_all.ps1
```

#### Option B: Individual Terminals

**Terminal 1 (Backend):**
```bash
# Windows
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Open your browser at **`http://localhost:3000`**. The backend API documentation is available at **`http://localhost:8000/docs`**.

---

## 🎬 Three Required Demo Scenarios

The system automatically initializes 3 seed business workspaces with realistic data:

### Scenario 1: Profit Decline & Margin Compression
- **Workspace**: *Apex Hardware & Outdoor Gear [SAMPLE]*
- **Context**: 6 months of ledger data showing steady revenue (~$80k/mo) but plunging operating margins due to ad CAC inflation and supplier price hikes (+11%). Includes sample operational audit PDF.
- **Preset Question**: *"How should we address our 4-month margin decline caused by surging ad CAC and supplier MOQ hikes?"*
- **Debate Dynamics**: CFO Marcus Sterling pinpoints exact margin deterioration; CMO Sophia Chen recommends pausing ungrounded retargeting; COO David Keller targets supplier terms; CEO synthesizes a tranche-gated remediation plan.

### Scenario 2: New Product Launch Feasibility
- **Workspace**: *Nova Data Analytics [SAMPLE]*
- **Context**: B2B analytics SaaS weighing whether to allocate 3 of their 6 developers to build an AI predictive forecasting add-on vs. focusing on core stability.
- **Preset Question**: *"Should we allocate 3 of our 6 developers to launch the AI predictive forecasting add-on this quarter?"*
- **Debate Dynamics**: CTO Dr. Tariq Al-Mansoor flags technical integration risk; CMO demands customer pre-validation interviews; CFO sets strict ROI payback boundaries.

### Scenario 3: Channel Expansion Decision (Retail vs. DTC)
- **Workspace**: *Lumina Home Goods [SAMPLE]*
- **Context**: Specialty lifestyle retailer with $150k capital evaluating 2 physical store leases vs. national direct-to-consumer digital scaling.
- **Preset Question**: *"Should we allocate our $150k expansion budget to 2 new retail store leases or scale national DTC e-commerce?"*
- **Debate Dynamics**: COO debates lease commitment risk; CMO compares physical foot-traffic to digital conversion; CEO issues a phased recommendation with preserved minority dissent.

---

## 🧪 Testing & Verification Evidence

All tests pass cleanly:

```bash
# Backend pytest suite (11 passed tests):
.\.venv\Scripts\python.exe -m pytest -o pythonpath=. backend/tests
```

```text
============================= test session starts =============================
platform win32 -- Python 3.14.3, pytest-9.1.1
collected 11 items

backend\tests\test_api.py ....                                           [ 36%]
backend\tests\test_calculator.py ...                                     [ 63%]
backend\tests\test_meeting_flow.py .                                     [ 72%]
backend\tests\test_parser.py ...                                         [100%]
======================= 11 passed in 5.97s ====================================
```

```bash
# Frontend Next.js production build:
cd frontend && npm run build
```

```text
 ✓ Compiled successfully
   Checking validity of types ...
 ✓ Generating static pages (5/5)
   Finalizing page optimization ...
Route (app)                              Size     First Load JS
┌ ○ /                                    131 kB          218 kB
└ ○ /_not-found                          873 B          88.1 kB
+ First Load JS shared by all            87.2 kB
```

---

## 📋 Features Implemented & Scope Boundaries

### Implemented Features
- [x] Multi-workspace business management (Create, Edit, Delete, Switch, Seed).
- [x] Deterministic financial analytics via Pandas (Revenue, Expenses, Net Operating Result, Margins, MoM growth, Category breakdown).
- [x] CSV and XLSX ingestion with interactive column mapping modal & data preview.
- [x] PDF text extraction and page-grounded document citations via PyMuPDF.
- [x] Five specialist executive personas with distinct role prompts and JSON schemas.
- [x] 5-Stage boardroom pipeline: Clarification -> Specialist Analyses -> Critique & Rebuttal -> CEO Synthesis -> Action Plan.
- [x] Server-Sent Events (SSE) live streaming with real-time speaker indicators.
- [x] Decision synthesis preserving minority dissent, counter-arguments, and uncertainties.
- [x] Action item task board with status transitions (To Do / In Progress / Done) and priority tags.
- [x] Executive PDF report export generated on-demand via ReportLab.
- [x] Follow-up meetings referencing prior workspace sessions without context leakage.
- [x] Transparent offline simulation mode when no Gemini key is provided.

### Scope Boundaries & Known Limitations
- **No autonomous payments or external emails**: As specified, the application does not execute financial transactions or external third-party actions.
- **Accounting Scope**: Net operating result reflects only ingested revenues minus operating expenses; it does not deduct corporate income taxes, loan interest, or equity depreciation unless explicitly categorized in the ledger.
- **Single-Node SQLite**: Configured for local workstation project mode. For distributed production, migrate SQLite to PostgreSQL using the provided SQLAlchemy models.
