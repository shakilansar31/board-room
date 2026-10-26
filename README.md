# 🏛️ AI Executive Boardroom Agent

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg?style=flat&logo=next.js&logoColor=white)](https://nextjs.org)
[![Google Gemini](https://img.shields.io/badge/Google%20GenAI-gemini--3.8--flash-4285F4.svg?style=flat&logo=google&logoColor=white)](https://aistudio.google.com)
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.14-3776AB.svg?style=flat&logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![UI Style](https://img.shields.io/badge/Design-Neo--Brutalism-FFE600.svg?style=flat)](#-neo-brutalist-interface)
[![Currency](https://img.shields.io/badge/Currency-INR%20(%E2%82%B9)-FF9933.svg?style=flat)](#-financial-intelligence-in-indian-rupees-)

An AI-powered virtual executive boardroom engineered for small businesses, founders, and decision-makers. Ingest operational files (CSV, XLSX, PDF), ask strategic business questions, and watch **5 specialist AI executives** debate live, cross-examine trade-offs, ground claims in deterministic financial analytics, and synthesize an action-ready decision matrix with downloadable executive PDF reports.

---

## 🎨 Neo-Brutalist Interface

Built with modern **Neo-Brutalism**:
- **High-Contrast Aesthetics**: Thick 2.5px solid black borders, hard offset drop shadows (`shadow-[4px_4px_0px_#000]`), and bold typography.
- **Color-Coded Executive Personas**:
  - 🟣 **CEO (Chief Executive Officer)**: `#F5F3FF` Lavender
  - 🟢 **CFO (Chief Financial Officer)**: `#ECFDF5` Mint (`₹` Currency Badge)
  - 🟡 **CMO (Chief Marketing Officer)**: `#FEFCE8` Cyber Yellow
  - 🔵 **COO (Chief Operating Officer)**: `#EFF6FF` Electric Sky Blue
  - 🟠 **CTO (Chief Technology Officer)**: `#FFF7ED` Tangerine Orange
- **Interactive Feedback**: Tactile button presses, live active-speaker speech bubbles, and step-by-step pipeline milestones.

---

## 🇮🇳 Financial Intelligence in Indian Rupees (₹)

- **Native INR Currency Models**: All financial calculations, seed scenarios, Recharts visualizations, and PDF exports are natively formatted in Indian Rupees (`₹` / `INR`).
- **Standard Indian Number Formatting**: Formatted with standard Indian numerical grouping (e.g., `₹ 8,50,000` / `₹ 49.85 L`).
- **Deterministic Python / Pandas Calculations**: Revenue, operating expenses, net operating results, gross margins, and MoM growth rates are calculated with Python/Pandas — **never hallucinated by LLM arithmetic**.

---

## 👔 The Five Executive Personas

Each executive runs on Google Gemini (`gemini-3.8-flash` or newer) via the official `google-genai` SDK, governed by domain system instructions and structured Pydantic schemas:

| Executive | Name | Role & Strategic Domain | Guardrails |
| :--- | :--- | :--- | :--- |
| **CEO** | **Elena Vance** | Chief of Staff & Moderator. Frames agenda, selects specialists, moderates debate, synthesizes final actions. | Never overrides factual uncertainty; strictly preserves minority dissent. |
| **CFO** | **Marcus Sterling** | Financial Officer. Audits cash burn, gross margins, unit economics, payback periods, and capital risk. | Uses deterministic Pandas metrics; never labels operating result as net profit if taxes/interest are unrecorded. |
| **CMO** | **Sophia Chen** | Marketing Officer. Analyzes customer acquisition (CAC), LTV, market positioning, and direct sales channels. | Never invents marketing attribution; clearly distinguishes facts from assumptions. |
| **COO** | **David Keller** | Operations Officer. Evaluates fulfillment bottlenecks, supplier contracts, logistics, and timeline friction. | Challenges optimistic peer timelines; flags bandwidth constraints. |
| **CTO** | **Dr. Tariq Al-Mansoor** | Technology Officer. Assesses system architecture, vendor APIs, SaaS vs. custom build, and maintenance debt. | Advocates pragmatic off-the-shelf tooling over costly custom code. |

---

## ⚡ Multi-Round Boardroom Pipeline

```
┌────────────────────────────────────────────────────────┐
│  Stage 1: Clarification & Evidence Audit (CEO)         │
│  - Audits metrics, documents, and frames meeting agenda │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│  Stage 2: Independent Specialist Analyses              │
│  - CFO, CMO, COO, CTO analyze evidence in parallel     │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│  Stage 3: Cross-Examination Critique & Rebuttal        │
│  - Specialists critically debate peer proposals         │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│  Stage 4: Unified Synthesis & Dissent Preservation     │
│  - Decisive recommendation, risks, and assumptions      │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│  Stage 5: Action Tasks & Executive PDF Export          │
│  - Prioritized deliverables + ReportLab PDF generation │
└────────────────────────────────────────────────────────┘
```

---

## 📦 Built-In Indian Business Scenarios

The platform includes 3 pre-seeded business workspaces ready to run out of the box:
1. **Apex Hardware & Outdoor Gear [SAMPLE]** *(Bengaluru, Karnataka)*:
   - Consumer Durables & E-Commerce (`₹49,85,000` Revenue).
   - Problem: Reversing a 4-month margin squeeze driven by raw material surges and elevated ad CAC.
2. **Nova Data Analytics [SAMPLE]** *(Pune, Maharashtra)*:
   - Enterprise B2B SaaS startup.
   - Problem: Deciding whether to launch an automated AI predictive forecasting add-on vs. core platform stability.
3. **Lumina Home Goods [SAMPLE]** *(Mumbai, Maharashtra)*:
   - Home & Lifestyle Retail.
   - Problem: Evaluating physical retail store leases in secondary Indian metros vs. national D2C digital channels.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.11+** (Tested on Python 3.11 – 3.14)
- **Node.js 18+** & `npm`
- *(Optional)* A **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/app/apikey).
  > **Note**: Even without an API key, the boardroom runs in a **transparent offline simulation mode** so anyone can test the full UI flow immediately!

---

### One-Command Setup

#### Windows:
```cmd
run_dev.bat
```

#### macOS / Linux:
```bash
chmod +x run_dev.sh
./run_dev.sh
```

---

### 💡 How to Run a Boardroom Session (4 Steps)
1. **Choose a Workspace**: Pick one of the 3 pre-seeded Indian businesses (*Apex Bengaluru*, *Nova Pune*, *Lumina Mumbai*) from the top dropdown, or click + to create your own company profile.
2. **Review Ledgers (₹ INR)**: In the *Overview* or *Data Ingestion* tab, explore deterministic revenue, margins, and cost breakdowns calculated via Python/Pandas.
3. **Convene Debate**: In the *Boardroom Debate* tab, click any of the 3 preset scenario dilemmas or type a custom strategic business question.
4. **Watch Live Deliberation & Export PDF**: Watch the CEO, CFO, CMO, COO, and CTO cross-examine proposals live via Server-Sent Events (SSE). Download the complete decision report as an Executive PDF.

---

### Manual Setup (Step-by-Step)

#### 1. Clone the Repository
```bash
git clone https://github.com/shakilansar31/board-room.git
cd board-room
```

#### 2. Configure Environment
```bash
# Copy the example environment file
cp .env.example .env
```
Edit `.env` (optional):
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
DATABASE_URL=sqlite:///./boardroom.db
FRONTEND_URL=http://localhost:3000
ALLOW_SIMULATION_MODE=true
```

#### 3. Setup & Start Backend (FastAPI)
```bash
# Create and activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run FastAPI backend
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Backend runs at `http://localhost:8000` (Interactive API docs at `http://localhost:8000/docs`).*

#### 4. Setup & Start Frontend (Next.js)
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:3000`.*

---

## 🧪 Running Automated Tests

A full suite of unit and integration tests is included:
```bash
# Run pytest from project root
pytest backend/tests
```
**Test Coverage Includes:**
- `test_calculator.py`: Deterministic financial calculations, monthly margins, MoM growth rates.
- `test_parser.py`: PDF text extraction (PyMuPDF) and CSV/XLSX custom column mapping.
- `test_api.py`: CRUD endpoints for businesses, documents, transactions, and metrics.
- `test_meeting_flow.py`: Full multi-stage boardroom execution and SSE streaming.

---

## 🏗️ Project Architecture

```
board-room/
├── backend/
│   ├── app/
│   │   ├── config.py              # Environment configuration & settings
│   │   ├── database.py            # SQLite / SQLAlchemy connection
│   │   ├── main.py                # FastAPI app entry & CORS config
│   │   ├── models/
│   │   │   ├── entities.py        # SQLAlchemy database models
│   │   │   └── schemas.py         # Pydantic v2 validation schemas
│   │   ├── routers/
│   │   │   ├── businesses.py      # Workspace management
│   │   │   ├── documents.py       # PDF/CSV file uploads
│   │   │   ├── transactions.py    # Transaction ingestion & column mapping
│   │   │   ├── meetings.py        # SSE debate stream & PDF report export
│   │   │   └── tasks.py           # Deliverables & task tracking
│   │   └── services/
│   │       ├── calculator.py      # Deterministic Pandas financial metrics
│   │       ├── document_parser.py # PyMuPDF & tabular parser
│   │       ├── gemini_orchestrator.py # Multi-agent Gemini orchestrator
│   │       ├── pdf_generator.py   # ReportLab executive PDF builder
│   │       └── sample_seeder.py   # Pre-seeded Indian business scenarios
│   └── tests/                     # 11 unit & integration tests
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css        # Neo-brutalist custom utility classes
│   │   │   ├── layout.tsx         # Root layout & typography
│   │   │   └── page.tsx           # Boardroom interactive dashboard
│   │   ├── components/
│   │   │   ├── ExecutiveCard.tsx  # Neo-brutalist executive persona cards
│   │   │   ├── FinancialCharts.tsx# High-contrast INR KPI charts (Recharts)
│   │   │   ├── StageProgress.tsx  # Meeting milestone tracker
│   │   │   ├── TaskBoard.tsx      # Deliverables & action checklist
│   │   │   ├── ColumnMappingModal.tsx # CSV/Excel column mapping
│   │   │   └── NewWorkspaceModal.tsx  # Workspace creation dialog
│   │   └── lib/
│   │       └── api.ts             # Typed REST & SSE API client
├── sample_data/                   # CSVs & PDF audit reports (in INR)
├── requirements.txt               # Python package dependencies
├── run_dev.bat                    # Windows 1-click launcher
├── run_dev.sh                     # Linux/Mac 1-click launcher
└── README.md                      # Comprehensive project guide
```

---

## 🛡️ AI Safety, Privacy & Ethics

1. **Deterministic Calculations**: No financial numbers or margins are ever generated via LLM hallucination. All numbers are computed using Pandas from verified ledger entries.
2. **Untrusted Evidence Boundary**: Uploaded user documents and tables are treated strictly as untrusted data references, never executable instructions.
3. **No Hidden Overrides**: Factual uncertainties and dissenting minority opinions are preserved in the final CEO synthesis rather than smoothed over with false consensus.
4. **Server-Side Security**: API keys are isolated to the server environment and never exposed to the client browser or git repository.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
