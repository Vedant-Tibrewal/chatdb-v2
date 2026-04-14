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
cp .env.example .env    # Add at least one LLM API key + DB credentials

# 2. Set up databases (one-time, on server)
chmod +x scripts/setup_postgres.sh scripts/setup_mongo.sh
./scripts/setup_postgres.sh   # Creates vedant user + chatdb database
./scripts/setup_mongo.sh      # Creates vedant user with readWrite on chatdb

# 3. Install & build
cd backend && uv sync && cd ..
cd frontend && npm ci && npm run build && cd ..

# 4. Deploy with pm2
./deploy.sh

# 5. Open
open https://chatdb.vtibrewal.com
```

| Service | URL |
|---|---|
| Public URL | https://chatdb.vtibrewal.com |
| Backend API | http://localhost:6008 |
| Frontend | http://localhost:6009 |
| Health check | http://localhost:6008/health |
| PostgreSQL | localhost:5432 |
| MongoDB | localhost:27017 |

## Architecture

```
                          ┌─────────────────┐
    https://chatdb.       │     Nginx       │
    vtibrewal.com ──────▶ │  (admin-managed)│
                          └───────┬─────────┘
                           /api/* │  else
                      ┌──────────┴──────────┐
                      ▼                     ▼
               ┌──────────────┐     ┌──────────────┐
               │   FastAPI    │     │  React SPA   │
               │  (:6008)     │     │  (:6009)     │
               └──────┬───────┘     └──────────────┘
                      │
              ┌───────┴───────┐
              │               │
        ┌─────▼─────┐  ┌─────▼─────┐
        │ PostgreSQL │  │  MongoDB  │
        │   (:5432)  │  │  (:27017) │
        └───────────┘  └───────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Zustand, Recharts |
| Backend | FastAPI, Python 3.12, asyncpg, motor |
| LLM Routing | LiteLLM (OpenAI, Anthropic, Google) |
| SQL Database | PostgreSQL 16 (shared, managed by admin) |
| NoSQL Database | MongoDB 7 (shared, managed by admin) |
| Fonts | IBM Plex Sans, DM Mono, Fraunces |
| Deployment | pm2-ci (no Docker) + nginx reverse proxy |

## Project Structure

```
├── frontend/              # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/    # UI: chat, schema, dashboard, layout
│   │   ├── services/      # API client
│   │   └── store/         # Zustand stores (session, chat)
│   └── package.json
├── backend/               # FastAPI (Python)
│   ├── app/
│   │   ├── api/routes/    # REST: session, query, schema, upload, analytics
│   │   ├── core/          # Config, security, LLM wrapper
│   │   ├── db/            # PostgreSQL + MongoDB drivers & session isolation
│   │   ├── models/        # Pydantic request/response models
│   │   └── services/      # Query generation, validation, analytics, data loading
│   └── pyproject.toml
├── datasets/              # 9 pre-loaded domains (CSV + JSON)
├── scripts/               # Database setup scripts
│   ├── setup_postgres.sh  # Create vedant user + chatdb database
│   ├── setup_mongo.sh     # Create vedant user with readWrite
│   └── generate_datasets.py
├── ecosystem.config.cjs   # pm2 process configuration
├── deploy.sh              # Build + deploy via pm2-ci
└── checkpoints.md         # Development milestones
```

## Development

### Backend (local)
```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 6008
```

### Frontend (local dev with Vite proxy)
```bash
cd frontend
npm install
npm run dev    # http://localhost:6009, proxies /api → :6008 (strips /api prefix)
```

### Production Deploy
```bash
./deploy.sh    # Builds frontend, starts both services via pm2-ci
```

### pm2 Commands
```bash
pm2-ci list                      # Show running processes
pm2-ci logs chatdb-backend       # Backend logs
pm2-ci logs chatdb-frontend      # Frontend logs
pm2-ci restart chatdb-backend    # Restart backend
pm2-ci restart all               # Restart all
pm2-ci delete all                # Stop all
```

## Environment Variables

Create a `.env` file from `.env.example`. At minimum, provide one LLM API key:

```env
# LLM (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=vedant
POSTGRES_PASSWORD=ReswapNumber1
POSTGRES_DB=chatdb

# MongoDB
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_USER=vedant
MONGO_PASSWORD=ReswapNumber1
MONGO_DB=chatdb
MONGO_AUTH_SOURCE=chatdb
```

## Nginx (admin-managed)

Nginx routes for `chatdb.vtibrewal.com`:
- `/api/*` → `http://localhost:6008` (strips `/api` prefix)
- Everything else → `http://localhost:6009` (React SPA)

**Backend routes must NOT include `/api` prefix** — nginx strips it before forwarding.

## License

Private project — not licensed for redistribution.