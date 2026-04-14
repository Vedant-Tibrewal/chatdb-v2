#!/usr/bin/env bash
set -euo pipefail

# ── ChatDB Deploy Script (pm2-ci) ─────────────────────────────────
# Deploys frontend + backend as pm2 processes.
# PostgreSQL and MongoDB must already be running on localhost.
#
# Usage:  chmod +x deploy.sh && ./deploy.sh
# ──────────────────────────────────────────────────────────────────

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# ── 1. Check .env ────────────────────────────────────────────────
echo "==> Step 1: Checking .env file..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  .env file created from .env.example.                      ║"
  echo "║  You MUST edit it before continuing.                       ║"
  echo "║                                                            ║"
  echo "║  Edit with:  nano .env                                     ║"
  echo "║                                                            ║"
  echo "║  1. Add at least one LLM API key:                          ║"
  echo "║       GOOGLE_API_KEY=your-key      (cheapest — Gemini)     ║"
  echo "║       OPENAI_API_KEY=your-key      (GPT-4o)                ║"
  echo "║       ANTHROPIC_API_KEY=your-key   (Claude)                ║"
  echo "║                                                            ║"
  echo "║  2. Verify database credentials (vedant user):             ║"
  echo "║       POSTGRES_USER / PASSWORD / HOST / PORT / DB          ║"
  echo "║       MONGO_USER / PASSWORD / HOST / PORT / DB             ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "After editing .env, re-run this script."
  exit 0
fi

# Validate at least one API key
if ! grep -qE '^(OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY)=.+' .env; then
  echo "ERROR: No LLM API key found in .env."
  echo "       Edit it with: nano .env"
  exit 1
fi

# ── 2. Create logs directory ─────────────────────────────────────
mkdir -p logs

# ── 3. Install backend dependencies ─────────────────────────────
echo "==> Step 2: Installing backend dependencies..."
cd "$PROJECT_DIR/backend"
uv sync --no-dev
cd "$PROJECT_DIR"

# ── 4. Install frontend dependencies and build ──────────────────
echo "==> Step 3: Building frontend..."
cd "$PROJECT_DIR/frontend"
npm ci
npm run build
cd "$PROJECT_DIR"

# ── 5. Stop existing pm2 processes ──────────────────────────────
echo "==> Step 4: Stopping existing ChatDB processes..."
pm2-ci delete chatdb-backend 2>/dev/null || true
pm2-ci delete chatdb-frontend 2>/dev/null || true

# ── 6. Start with pm2 ───────────────────────────────────────────
echo "==> Step 5: Starting ChatDB via pm2-ci..."
pm2-ci start ecosystem.config.cjs

# ── 7. Done ──────────────────────────────────────────────────────
sleep 3
pm2-ci list

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ChatDB is running!                                        ║"
echo "║                                                            ║"
echo "║  Backend:   http://localhost:6008   (FastAPI)               ║"
echo "║  Frontend:  http://localhost:6009   (Static build)          ║"
echo "║  Public:    https://chatdb.vtibrewal.com                    ║"
echo "║                                                            ║"
echo "║  Useful commands:                                          ║"
echo "║    pm2-ci logs chatdb-backend       (backend logs)         ║"
echo "║    pm2-ci logs chatdb-frontend      (frontend logs)        ║"
echo "║    pm2-ci restart all               (restart)              ║"
echo "║    pm2-ci delete all                (stop all)             ║"
echo "║    ./deploy.sh                      (rebuild & restart)    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
