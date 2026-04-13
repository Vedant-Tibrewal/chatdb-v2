# ChatDB

A session-based natural language interface for querying SQL and NoSQL databases using plain English. Ask questions about your data, get auto-generated queries, inline chart visualizations, and domain-specific analytics — all without writing a single line of SQL.

## Features

- **Natural Language Queries** — Ask questions in plain English; ChatDB generates and runs SQL/MongoDB queries
- **Multi-Provider LLM** — Switch between OpenAI, Anthropic, and Google (via LiteLLM) in real time
- **Dual Database Support** — PostgreSQL and MongoDB per session, switchable with one click
- **Auto Visualization** — Charts (bar, pie, line, area) auto-generated from query results with insight text
- **Analytics Dashboard** — Domain-specific metrics (e-commerce, sales, medical, HR, sports, cybersecurity)
- **Dataset Selector** — 9 pre-loaded domains; filter to a single domain or use all datasets
- **File Upload** — Upload CSV/JSON files into your session with automatic type inference
- **Session Isolation** — Each session gets its own PG schema and Mongo database (auto-expires after 7.5h)
- **Query Validation** — SQL injection protection via sqlglot AST parsing; read/write safety checks

## Quick Start

```bash
# 1. Clone and configure
git clone <repo-url> && cd chatdb-v2
cp .env.example .env    # Add at least one LLM API key

# 2. Launch (requires Docker)
docker compose up

# 3. Open
open http://localhost:3000
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Health check | http://localhost:8000/health |
| PostgreSQL | localhost:5433 |
| MongoDB | localhost:27017 |

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌─────────────────┐
│   React UI   │────▶│   FastAPI    │────▶│   LiteLLM       │
│  (nginx:3000)│◀────│  (uv:8000)  │     │ (OpenAI/Claude/ │
│              │     │              │     │  Gemini)         │
└──────────────┘     └──────┬───────┘     └─────────────────┘
                            │
                    ┌───────┴───────┐
                    │               │
              ┌─────▼─────┐  ┌─────▼─────┐
              │ PostgreSQL │  │  MongoDB  │
              │ + pgvector │  │   (v7)    │
              │   (pg16)   │  │           │
              └───────────┘  └───────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Zustand, Recharts |
| Backend | FastAPI, Python 3.12, asyncpg, motor |
| LLM Routing | LiteLLM (OpenAI, Anthropic, Google) |
| SQL Database | PostgreSQL 16 + pgvector |
| NoSQL Database | MongoDB 7 |
| Fonts | IBM Plex Sans, DM Mono, Fraunces |
| Deployment | Docker Compose (multi-stage builds) |

## Project Structure

```
├── frontend/              # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/    # UI: chat, schema, dashboard, layout
│   │   ├── services/      # API client
│   │   └── store/         # Zustand stores (session, chat)
│   ├── Dockerfile         # Multi-stage: node build → nginx
│   └── nginx.conf
├── backend/               # FastAPI (Python)
│   ├── app/
│   │   ├── api/routes/    # REST: session, query, schema, upload, analytics
│   │   ├── core/          # Config, security, LLM wrapper
│   │   ├── db/            # PostgreSQL + MongoDB drivers & session isolation
│   │   ├── models/        # Pydantic request/response models
│   │   └── services/      # Query generation, validation, analytics, data loading
│   └── Dockerfile         # python:3.12-slim + uv
├── datasets/              # 9 pre-loaded domains (CSV + JSON)
│   ├── ecommerce/         # customers, orders, order_items, products
│   ├── sports/            # teams, players, games, player_stats
│   ├── medical/           # doctors, patients, visits, prescriptions
│   ├── sales/             # deals, activities, catalog, sales_reps
│   ├── cybersecurity/     # assets, vulnerabilities, security_events, scan_results
│   ├── hr/                # employees, salary_history, performance_reviews
│   ├── education/         # students, courses, enrollments
│   ├── real_estate/       # properties, agents, transactions
│   ├── restaurant/        # menu_items, orders, order_details
│   └── iot/               # sensor_readings.json
├── docker-compose.yml     # 4 services with health checks & resource limits
└── checkpoints.md         # Development milestones
```

## Development

### Full stack (Docker)
```bash
docker compose up --build
```

### Backend only
```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### Frontend only (with Vite proxy to backend)
```bash
cd frontend
npm install
npm run dev    # http://localhost:3001, proxies /api → :8000
```

## Environment Variables

Create a `.env` file from `.env.example`. At minimum, provide one LLM API key:

```env
OPENAI_API_KEY=sk-...        # For GPT-4o
ANTHROPIC_API_KEY=sk-ant-... # For Claude
GOOGLE_API_KEY=...           # For Gemini
```

## License

Private project — not licensed for redistribution.