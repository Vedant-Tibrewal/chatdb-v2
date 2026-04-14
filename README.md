# ChatDB

A session-based natural language interface for querying SQL and NoSQL databases using plain English. Ask questions about your data, get auto-generated queries, inline chart visualizations, and domain-specific analytics — all without writing a single line of SQL.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
  - [Prerequisites](#prerequisites)
  - [1. Clone & Install](#1-clone--install)
  - [2. Database Setup](#2-database-setup)
  - [3. Environment Variables](#3-environment-variables)
  - [4. Run in Development Mode](#4-run-in-development-mode)
  - [5. Run in Production Mode](#5-run-in-production-mode)
- [Quick Test](#quick-test)
- [Common Errors & Fixes](#common-errors--fixes)
- [Nginx (Production)](#nginx-production)
- [License](#license)

## Features

- **Natural Language Queries** — Ask questions in plain English; ChatDB generates and runs SQL/MongoDB queries
- **Multi-Provider LLM** — Switch between OpenAI, Anthropic, and Google (via LiteLLM) in real time
- **Dual Database Support** — PostgreSQL and MongoDB per session, switchable with one click
- **Auto Visualization** — Charts (bar, pie, line, area) auto-generated from query results with insight text
- **Analytics Dashboard** — Domain-specific metrics (e-commerce, sales, medical, HR, sports, cybersecurity)
- **Dataset Selector** — 9 pre-loaded domains; filter to a single domain or use all datasets
- **File Upload** — Upload CSV/JSON files into your session with automatic type inference
- **Session Isolation** — Each session gets its own PG schema and Mongo database (auto-expires after 30 min)
- **Query Validation** — SQL injection protection via sqlglot AST parsing; read/write safety checks
- **Saved Queries** — Bookmark query+result pairs for quick reference during a session
- **New Chat** — Clear conversation and start fresh without losing saved queries

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
| SQL Database | PostgreSQL 16 |
| NoSQL Database | MongoDB 7 |
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
├── ecosystem.config.cjs   # pm2 process configuration
├── deploy.sh              # Build + deploy via pm2-ci
└── .env                   # Environment variables (not committed)
```

## Local Setup

### Prerequisites

| Dependency | Version | Check |
|---|---|---|
| Python | 3.12+ | `python3 --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| PostgreSQL | 14+ | `psql --version` |
| MongoDB | 6+ | `mongosh --version` |
| uv (Python package manager) | latest | `uv --version` |

> **Don't have `uv` yet?** Install it with: `curl -LsSf https://astral.sh/uv/install.sh | sh`

### 1. Clone & Install

```bash
# Clone the repo
git clone <repo-url>
cd chatdb-v2

# Install backend dependencies
cd backend
uv sync           # Creates .venv and installs all packages
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Database Setup

Both PostgreSQL and MongoDB must be running locally.

**PostgreSQL:**

```bash
# Start postgres if not running (macOS Homebrew example)
brew services start postgresql@16

# Create the database user and database
# (or use the provided setup script)
chmod +x scripts/setup_postgres.sh
./scripts/setup_postgres.sh
```

The script creates a `vedant` user and a `chatdb` database. If you want different credentials, edit the script or create the user/database manually:

```sql
-- Connect as superuser
CREATE USER vedant WITH PASSWORD 'your_password';
CREATE DATABASE chatdb OWNER vedant;
```

**MongoDB:**

```bash
# Start MongoDB if not running (macOS Homebrew example)
brew services start mongodb-community

# Create the database user
# (or use the provided setup script)
chmod +x scripts/setup_mongo.sh
./scripts/setup_mongo.sh
```

The script creates a `vedant` user with `readWrite` role on the `chatdb` database. For custom credentials:

```javascript
// In mongosh
use chatdb
db.createUser({
  user: "vedant",
  pwd: "your_password",
  roles: [{ role: "readWrite", db: "chatdb" }]
})
```

### 3. Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your credentials. **At minimum, you need one LLM API key:**

```env
# LLM API Keys — at least one is required
OPENAI_API_KEY=sk-...           # GPT-4o
ANTHROPIC_API_KEY=sk-ant-...    # Claude
GOOGLE_API_KEY=...              # Gemini (cheapest option)

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=vedant
POSTGRES_PASSWORD=your_password
POSTGRES_DB=chatdb

# MongoDB
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_USER=vedant
MONGO_PASSWORD=your_password
MONGO_DB=chatdb
MONGO_AUTH_SOURCE=chatdb
```

### 4. Run in Development Mode

You need **two terminals** — one for the backend, one for the frontend.

**Terminal 1 — Backend:**

```bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 6008
```

The backend starts at `http://localhost:6008`. On first start, it loads all datasets from `datasets/` into both databases. This takes a few seconds.

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

The frontend starts at `http://localhost:6009`. Vite automatically proxies `/api` requests to the backend at `:6008` (and strips the `/api` prefix), so you don't need nginx locally.

Open **http://localhost:6009** in your browser.

### 5. Run in Production Mode

```bash
# Build the frontend and start both services via pm2
./deploy.sh
```

This builds the React app, then uses `pm2-ci` to run both the backend and a static file server for the frontend.

**pm2 commands:**

```bash
pm2-ci list                      # Show running processes
pm2-ci logs chatdb-backend       # Backend logs
pm2-ci logs chatdb-frontend      # Frontend logs
pm2-ci restart chatdb-backend    # Restart backend
pm2-ci restart all               # Restart all
pm2-ci delete all                # Stop all
```

## Quick Test

Once both services are running, verify everything works:

1. **Health check:** Open `http://localhost:6008/health` — should return `{"status": "ok"}`

2. **Open the app:** Go to `http://localhost:6009` — you should see the three-panel layout with a schema sidebar on the left

3. **Run a test query:** Type one of these in the chat input and press Enter:
   - `"How many customers are there?"` (if using the e-commerce dataset)
   - `"Show me the top 5 highest paid employees"` (if using the HR dataset)
   - `"List all teams"` (if using the sports dataset)

4. **Confirm the query:** When the generated SQL/MongoDB query appears, click **▶ Run** to execute it. You should see a result table and (if applicable) an auto-generated chart.

5. **Switch databases:** In the Settings panel (right sidebar), click **MongoDB** to switch. Ask the same question — it should generate a MongoDB aggregation pipeline instead.

## Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `connection refused` on startup | PostgreSQL or MongoDB isn't running | Start the database: `brew services start postgresql@16` / `brew services start mongodb-community` |
| `FATAL: password authentication failed for user "vedant"` | Wrong password in `.env`, or user doesn't exist | Run `scripts/setup_postgres.sh` or create the user manually. Double-check `POSTGRES_PASSWORD` in `.env` |
| `No LLM API key configured` | None of the 3 API key env vars are set | Add at least one of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GOOGLE_API_KEY` to `.env` |
| `ModuleNotFoundError` in the backend | Dependencies not installed, or wrong venv | Run `cd backend && uv sync` to install. Make sure you're running with `uv run` |
| Frontend shows "Waiting for session..." | Backend isn't running or unreachable | Make sure the backend is running on port 6008. Check the terminal for errors |
| `uv: command not found` | uv isn't installed | Install with: `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Port 6008/6009 already in use | Another process is using the port | Kill it: `lsof -i :6008` then `kill <PID>`, or change the port in config |

## Nginx (Production)

Nginx routes for `chatdb.vtibrewal.com`:
- `/api/*` → `http://localhost:6008` (strips `/api` prefix)
- Everything else → `http://localhost:6009` (React SPA)

**Backend routes must NOT include `/api` prefix** — nginx strips it before forwarding.

## License

Private project — not licensed for redistribution.