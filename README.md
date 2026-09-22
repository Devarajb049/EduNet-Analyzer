# EduNet Analyzer — University E-Learning Network Performance Analyzer

> **Tagline:** *Simulate. Measure. Compare. Optimize.*

EduNet Analyzer is a professional full-stack web-based network simulation and performance analysis platform engineered for university Computer Networks and Internet Protocols laboratories. It models real-world university e-learning environments where varying student loads access centralized Learning Management System (LMS) servers through bandwidth-constrained access and core routers.

The system allows students and instructors to configure traffic parameters, execute **NS-2 (Network Simulator 2)** runs, parse generated `.tr` wired trace files, compute standard network performance metrics, and visualize results through interactive engineering dashboards, multi-experiment comparisons, and exportable academic PDF/CSV laboratory reports.

---

## Key Features

1. **Dual-Mode NS-2 Simulation Engine:**
   - **NS-2 Live Engine:** Directly executes native `ns` or WSL `wsl ns` Tcl simulations and parses genuine output trace files (`.tr`).
   - **Demo Mode (Academic Sample Data):** For machines without NS-2 installed, clearly-labeled calibrated discrete-event sample datasets are processed through the identical trace parsing pipeline—**never showing fake/random numbers**.
2. **Standard Performance Metrics Engine:**
   - **Throughput (Kbps):** Successfully delivered bits divided by simulation time.
   - **Packet Loss Rate (%):** Queue drop percentage at bottleneck routers.
   - **Packet Delivery Ratio (PDR %):** Percentage of sent packets successfully arriving at destination.
   - **Average End-to-End Delay (ms):** Average packet transmission and queuing transit latency.
   - **Conservation Tracking:** Total packets sent, received, and dropped.
3. **Multi-Protocol & Load Analysis:**
   - Compare **TCP NewReno** (AIMD congestion control) vs **UDP CBR** (uncontrolled multimedia stream).
   - Evaluate scalability from 10 to 200 concurrent student clients.
4. **Interactive Educational Simulators:**
   - **Sliding Window Protocol:** Visualizes window boundary advancement, in-flight frames, and receiver acknowledgements.
   - **Go-Back-N Retransmission:** Demonstrates packet loss detection, timeout expiration, receiver rejection of out-of-order packets, and window retransmission.
   - **Leaky Bucket Traffic Shaping:** Interactive buffer tank visualizer illustrating burst traffic smoothing into constant outflow.
5. **Interactive Campus Network Topology:**
   - Dynamic SVG diagram showing Student Workstations ($N_1 \dots N_k$) $\rightarrow$ Access Router $R_1$ $\rightarrow$ Bottleneck Core Link $\rightarrow$ Core Router $R_2$ $\rightarrow$ LMS Server.
   - Node Inspector Drawer detailing IP addresses, interface bandwidths, delays, and queue disciplines.
6. **Publication-Grade Academic Reports:**
   - Generates official university laboratory PDF reports with executive summary, topology, metrics tables, and evaluation signature blocks.
   - Direct CSV raw telemetry data export.

---

## Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   React 18 + TypeScript + Vite                         │
│   Tailwind CSS  │  Recharts  │  Lucide Icons  │  Canvas/SVG Simulators │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Backend (Python)                        │
│   Uvicorn  │  Pydantic v2  │  SQLAlchemy 2.0 (SQLite)  │  ReportLab    │
└───────────┬───────────────────────┬──────────────────────┬─────────────┘
            │                       │                      │
            ▼                       ▼                      ▼
┌───────────────────────┐ ┌───────────────────┐ ┌────────────────────────┐
│  Simulation Service   │ │ Trace Parser &    │ │ Report Generator       │
│  - Dynamic Tcl Gen    │ │ Metrics Engine    │ │ - PDF (ReportLab)      │
│  - Subprocess Runner  │ │ - Throughput      │ │ - CSV Streaming        │
│  - Multi-stage Worker │ │ - Loss, Delay, PDR│ │ - Academic Template    │
└───────────────────────┘ └───────────────────┘ └────────────────────────┘
            │                       │
            ▼                       │
┌───────────────────────┐           │
│ NS-2 Engine (.tcl)    │           │
│ Trace Output (.tr)    ├───────────┘
└───────────────────────┘
```

---

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide React, React Router 6.
- **Backend:** Python 3.10+, FastAPI, Uvicorn, SQLAlchemy, Pydantic v2, ReportLab, Pandas.
- **Database:** SQLite with WAL (Write-Ahead Logging) mode.
- **Simulation:** NS-2 (Network Simulator 2), Tcl scripts, AWK / Python trace parsers.

---

## Directory Structure

```text
edunet-analyzer/
├── backend/
│   ├── app/
│   │   ├── api/             # REST endpoints (dashboard, experiments, simulations, reports, system)
│   │   ├── database.py      # SQLite connection and WAL pragmas
│   │   ├── models.py        # SQLAlchemy schema (Experiment, Result)
│   │   ├── schemas.py       # Pydantic v2 validation models
│   │   ├── services/
│   │   │   ├── simulation_service.py # Tcl generator & NS-2 subprocess runner
│   │   │   ├── trace_parser.py       # NS-2 wired trace parser (+, -, r, d)
│   │   │   ├── report_service.py     # ReportLab PDF & CSV generators
│   │   │   └── seed_data.py          # Benchmark academic baseline seeder
│   │   └── main.py          # Application entrypoint & lifespan
│   ├── tests/               # Pytest suite for API and trace parser
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── layouts/         # Sidebar, Header, MainLayout
│   │   ├── pages/           # Dashboard, Simulate, Monitor, Results, Compare, Topology, etc.
│   │   ├── services/        # API client
│   │   └── types/           # TypeScript interfaces
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── simulation/
│   ├── tcl/                 # Tcl simulation scripts & templates
│   ├── traces/              # Generated NS-2 trace files (.tr)
│   └── scripts/
│       ├── parse_trace.awk  # AWK script for lab trace analysis
│       └── parse_trace.py   # Standalone Python CLI trace parser
├── reports/                 # Generated PDF/CSV reports
├── docker-compose.yml
└── README.md
```

---

## Installation & Setup

### Prerequisites
- **Python 3.10+**
- **Node.js 18+ and npm**
- *(Optional for live NS-2)* **WSL2 (Ubuntu)** or Linux host with `ns2` installed.

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd "f:/EduNet Analyzer/backend"

# Install Python requirements
pip install -r requirements.txt

# Run backend automated tests
python -m pytest tests/ -v

# Start FastAPI development server (runs on http://localhost:8000)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to frontend
cd "f:/EduNet Analyzer/frontend"

# Install frontend dependencies
npm install

# Build for production (verifies TypeScript compilation)
npm run build

# Start Vite development server (runs on http://localhost:5173)
npm run dev
```

Open your browser to `http://localhost:5173` to access the application.

---

### 3. NS-2 Live Simulation Setup (Optional)

On Windows systems, NS-2 runs natively inside **WSL2 (Ubuntu)**:

```bash
# 1. Open your terminal or WSL prompt
wsl -d Ubuntu

# 2. Update package lists and install NS-2 and NAM
sudo apt-get update && sudo apt-get install -y ns2 nam

# 3. Verify installation
ns -version
```

Once installed, the backend will auto-detect `wsl ns` and execute real wired simulation runs generating trace files on your drive.

---

## Standalone CLI Trace Analysis (For Lab Assignments)

You can also run trace parsing directly from the terminal using the provided Python or AWK scripts:

```bash
# Standalone Python Parser
python simulation/scripts/parse_trace.py simulation/traces/sample_baseline.tr 12 60.0

# Traditional AWK Parser
awk -f simulation/scripts/parse_trace.awk simulation/traces/sample_baseline.tr
```

---

## REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health check probe |
| `/api/dashboard/summary` | `GET` | Aggregated KPIs, trends, and TCP vs UDP averages |
| `/api/experiments` | `GET` | List all experiments with search & filter parameters |
| `/api/experiments/{id}` | `GET` | Get detailed experiment metadata and parsed metrics |
| `/api/experiments/{id}` | `DELETE` | Delete experiment and associated trace file |
| `/api/simulations/run` | `POST` | Trigger asynchronous NS-2 simulation pipeline |
| `/api/simulations/{id}/status` | `GET` | Poll live progress percentage, stage, and console logs |
| `/api/simulations/{id}/results`| `GET` | Fetch final results for completed simulation |
| `/api/experiments/compare` | `POST` | Multi-experiment comparative analytics |
| `/api/reports/{id}/csv` | `GET` | Stream raw CSV metrics file |
| `/api/reports/{id}/pdf` | `GET` | Download official university academic PDF report |
| `/api/system/status` | `GET` | NS-2 binary presence, WSL state, and database health |
| `/api/system/seed` | `POST` | Reset and reseed calibrated baseline experiments |

---

## Performance Metrics Calculation Formulas

1. **Network Throughput:**
   $$\text{Throughput (Kbps)} = \frac{\sum \text{Received Packet Bytes} \times 8}{\text{Simulation Duration (s)} \times 1000}$$

2. **Packet Delivery Ratio (PDR):**
   $$\text{PDR (\%)} = \left( \frac{\text{Packets Received at Server}}{\text{Packets Sent by Student Nodes}} \right) \times 100$$

3. **Packet Loss Rate:**
   $$\text{Loss Rate (\%)} = \left( \frac{\text{Packets Dropped at Intermediate Queues}}{\text{Packets Sent by Student Nodes}} \right) \times 100$$

4. **Average End-to-End Delay:**
   $$\text{Average Delay (ms)} = \frac{\sum (t_{\text{receive}} - t_{\text{send}})}{N_{\text{received}}} \times 1000$$

---

## Academic Laboratory Submission Checklist

- [x] Configure student client load (10 to 200 nodes).
- [x] Execute wired campus simulation under TCP NewReno and UDP CBR.
- [x] Verify bottleneck queue congestion and packet drop progression.
- [x] Review second-by-second throughput and delay time-series curves.
- [x] Run Side-by-Side Multi-Experiment Comparison with Radar Chart.
- [x] Test Sliding Window flow control dynamics and Go-Back-N loss recovery.
- [x] Demonstrate Leaky Bucket traffic shaping with burst injection.
- [x] Export telemetry dataset to CSV.
- [x] Download official signed University Academic PDF Laboratory Report.
#   E d u N e t - A n a l y z e r  
 