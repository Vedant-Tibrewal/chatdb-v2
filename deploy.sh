#!/usr/bin/env bash
set -euo pipefail

# ── ChatDB Deploy Script ──────────────────────────────────────────
# Deploys frontend + backend as Docker containers.
# Postgres and MongoDB must already be running on the VM.
#
# Usage:  chmod +x deploy.sh && ./deploy.sh
# ──────────────────────────────────────────────────────────────────

# ── 1. Check .env ────────────────────────────────────────────────
echo "==> Step 1: Checking .env file..."
if [ ! -f .env ]; then
  cp .env.example .env

  # Point databases at the host (localhost) instead of container names
  sed -i 's/^POSTGRES_HOST=.*/POSTGRES_HOST=127.0.0.1/' .env
  sed -i 's/^MONGO_HOST=.*/MONGO_HOST=127.0.0.1/'       .env

  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  .env file created. You MUST edit it before continuing.    ║"
  echo "║                                                            ║"
  echo "║  Edit with:  nano .env                                     ║"
  echo "║                                                            ║"
  echo "║  1. Add at least one LLM API key:                          ║"
  echo "║       GOOGLE_API_KEY=your-key      (cheapest — Gemini)     ║"
  echo "║       OPENAI_API_KEY=your-key      (GPT-4o)                ║"
  echo "║       ANTHROPIC_API_KEY=your-key   (Claude)                ║"
  echo "║                                                            ║"
  echo "║  2. Verify Postgres/Mongo credentials match your VM:       ║"
  echo "║       POSTGRES_HOST / PORT / USER / PASSWORD / DB          ║"
  echo "║       MONGO_HOST / PORT / DB                               ║"
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

# ── 2. Stop old containers if running ────────────────────────────
echo "==> Step 2: Stopping old containers (if any)..."
docker rm -f chatdb-backend chatdb-frontend 2>/dev/null || true

# ── 3. Build images ─────────────────────────────────────────────
echo "==> Step 3: Building backend image..."
docker build -t chatdb-backend ./backend

echo "==> Step 3b: Building frontend image..."
docker build -t chatdb-frontend ./frontend

# ── 4. Run backend (host network → reaches local Postgres/Mongo) ─
echo "==> Step 4: Starting backend on port 8000..."
docker run -d \
  --name chatdb-backend \
  --network host \
  --env-file .env \
  -v "$(pwd)/datasets:/app/datasets:ro" \
  --restart unless-stopped \
  chatdb-backend

# ── 5. Run frontend (host network, nginx on port 6004) ──────────
echo "==> Step 5: Starting frontend on port 6004..."
docker run -d \
  --name chatdb-frontend \
  --network host \
  -v "$(pwd)/nginx.prod.conf:/etc/nginx/conf.d/default.conf:ro" \
  --restart unless-stopped \
  chatdb-frontend

# ── 6. Done ──────────────────────────────────────────────────────
sleep 3
echo ""
docker ps --filter name=chatdb --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

VM_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "YOUR_VM_IP")
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ChatDB is running!                                        ║"
echo "║                                                            ║"
echo "║  Open in browser:  http://${VM_IP}:6004                    ║"
echo "║                                                            ║"
echo "║  Useful commands:                                          ║"
echo "║    docker logs -f chatdb-backend     (backend logs)        ║"
echo "║    docker logs -f chatdb-frontend    (frontend logs)       ║"
echo "║    docker rm -f chatdb-backend chatdb-frontend  (stop all) ║"
echo "║    ./deploy.sh                       (rebuild & restart)   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
