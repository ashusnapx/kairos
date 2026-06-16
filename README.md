# KAIROS — KYC Autonomous Intelligence & Risk Oversight System

> "From document verification to explainable trust decisions."

KAIROS is an agentic KYC intelligence platform where **seven specialized AI agents** collaborate to perform end-to-end customer due diligence. It transforms fragmented evidence into explainable, auditable decisions while preserving human authority.

Built for ranking 1st in a 300K+ participant hackathon. AMD ROCm optimized.

---

## Architecture

```
Customer Request → Document Intelligence → Identity Resolution
                                            ↓
                                  Compliance Screening
                                    ↙              ↘
                     Financial Profiling    Graph Intelligence
                                    ↘              ↙
                                  Evidence Fusion
                                        ↓
                                 Debate Engine
                                        ↓
                                Human Review Layer
                                        ↓
                              Decision Stability Engine
                                        ↓
                              Explainable Final Decision
```

### Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, TailwindCSS, shadcn/ui, Framer Motion, Recharts |
| Backend | Python 3.13, FastAPI, LangGraph, PydanticAI, Redis Streams |
| Storage | PostgreSQL 16, Neo4j 5, Redis 7, DuckDB |
| AI/ML | Qwen3 (vLLM), Qwen2.5-VL (vLLM), PaddleOCR, Sentence Transformers, LightGBM, Isolation Forest, SHAP |
| Hardware | AMD ROCm (MI250/MI300), ONNX Runtime ROCm |

---

## Quick Start

```bash
# 1. Clone and start infrastructure
docker-compose up -d

# 2. (Optional) Start AMD ROCm LLM serving
docker compose -f docker-compose.rocm.yml up -d

# 3. Seed demo data
cd backend && python scripts/seed_data.py 10

# 4. Open the dashboard
open http://localhost:3000
```

### Environment

Copy `.env.example` to `.env` and configure:

```env
LLM_PROVIDER=vllm        # vllm | gemini
VLLM_URL=http://localhost:8001
GEMINI_API_KEY=          # Fallback if no GPU
ENVIRONMENT=development
```

---

## The 4 WOW Moments

### WOW #1 — Document Tampering Detection
Documents that appear legitimate are analyzed via Error Level Analysis (ELA). KAIROS reveals:
> "Expiry date modified using image editing."

### WOW #2 — Compliance Debate
Three expert personas (Conservative Officer, Growth Officer, Investigator) debate each case. They disagree, justify, and converge on a consensus.

### WOW #3 — Counterfactual Explainability
KAIROS explains:
> "If income proof is provided, risk decreases from 84 to 51."

### WOW #4 — Graph Intelligence
KAIROS discovers:
> "This address links to a previously escalated shell entity."

---

## Agent Workforce

| Agent | Responsibility | Technology |
|---|---|---|
| Document Intelligence | OCR, field extraction, tampering detection | Qwen2.5-VL, PaddleOCR, OpenCV |
| Identity Resolution | Fuzzy matching, entity clustering | Sentence Transformers, RapidFuzz |
| Compliance Screening | PEP/sanctions, regulatory copilot | Qwen3, Policy KB |
| Financial Profiling | Anomaly detection, risk scoring, counterfactuals | LightGBM, Isolation Forest, SHAP |
| Graph Intelligence | Relationship discovery, fraud rings | Neo4j, Graph Algorithms |
| Evidence Fusion | Conflict resolution, evidence weighting | LangGraph |
| Debate Engine | Three-persona adversarial debate | Qwen3 |

---

## API

| Endpoint | Description |
|---|---|
| `POST /api/cases` | Submit new case for investigation |
| `GET /api/cases` | List all cases |
| `GET /api/cases/{id}` | Full case details with agent outputs |
| `GET /api/cases/{id}/timeline` | Investigation event timeline |
| `GET /api/cases/{id}/graph` | Graph intelligence data |
| `POST /api/review/{id}` | Human review action |
| `GET /api/judge/comparison` | Judge mode comparison matrix |
| `GET /api/observability/metrics` | System metrics |

---

## AMD ROCm Optimization

```bash
# Run benchmarks
python backend/scripts/benchmark.py

# Expected improvements:
# CPU      → 100% (baseline)
# Standard → 250% (GPU without ROCm opt)
# ROCm     → 850% (fully optimized)
```

---

## Project Structure

```
kairos/
├── docker-compose.yml          # Infrastructure services
├── docker-compose.rocm.yml     # AMD ROCm LLM serving
├── backend/
│   ├── src/
│   │   ├── agents/             # 7 specialized AI agents
│   │   ├── api/routes/         # REST API endpoints
│   │   ├── core/               # Event bus, tracing, config
│   │   ├── models/             # Pydantic schemas
│   │   ├── orchestrator/       # LangGraph workflow
│   │   ├── services/           # Narrative, audit, policy, etc.
│   │   ├── storage/            # PostgreSQL, Neo4j, Redis
│   │   └── rocm/               # ROCm benchmarks
│   └── scripts/                # Seed data, benchmarks
├── frontend/
│   └── src/
│       ├── app/                # Next.js pages
│       ├── components/         # UI components
│       └── lib/                # API client, state, utils
└── data/
    ├── synthetic/              # Generated test data
    ├── policies/               # Compliance rules
    └── samples/                # Sample documents
```

---

## License

Hackathon project — all rights reserved.
