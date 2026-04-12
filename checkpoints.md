# ChatDB — Git Checkpoints

Each checkpoint represents a meaningful, working milestone. Commits are made at each checkpoint with a descriptive message.

**How to use:** Start each new chat session by sharing this file and `chatdb_prd.md`. The "Status" and "Pickup context" sections tell you exactly where to resume.

---

## Checkpoint 1 · Project Scaffold ✅
**Status:** COMPLETE  
**Commit:** `chore: scaffold project structure with Docker Compose and config files`

**What was done:**
- Folder structure for frontend (React + TS + Tailwind) and backend (FastAPI + uv)
- `docker-compose.yml` with all 4 services (frontend, backend, postgres w/ pgvector, mongo)
- `Dockerfile` for frontend (multi-stage nginx) and backend (uv-based)
- `.env.example` with all required env vars
- `pyproject.toml` (uv) with deps: fastapi, uvicorn, pydantic-settings, litellm, asyncpg, motor, sqlglot, pandas, plotly
- `package.json` (npm) with Vite + React + TypeScript + Tailwind CSS v4 (`@tailwindcss/vite`)
- Frontend: three-panel layout shell (SchemaPanel, ChatPanel, SettingsPanel) + API client + TypeScript types
- Backend: FastAPI app with route stubs (session, query, schema, upload, analytics), config module, placeholder services/models/db modules
- Dataset directories with READMEs for sales, medical, HR domains
- `frontend/nginx.conf` proxying `/api/` to backend
- Updated `.gitignore` and `README.md`

**Key decisions made:**
- Package manager: uv (backend), npm (frontend)
- Tailwind v4 via `@tailwindcss/vite` plugin (no tailwind.config.js — uses `@import "tailwindcss"` in index.css)
- All three dataset domains (sales, medical, HR) will be supported
- Backend route structure: `/api/session`, `/api/query`, `/api/schema`, `/api/upload`, `/api/analytics`
- Frontend API client uses native `fetch` (not axios)

**Files that are stubs (need implementation):**
- `backend/app/core/llm.py` — docstring only
- `backend/app/core/security.py` — docstring only
- `backend/app/db/postgres.py` — docstring only
- `backend/app/db/mongodb.py` — docstring only
- `backend/app/db/session.py` — docstring only
- `backend/app/services/*.py` — docstring only
- `backend/app/models/*.py` — docstring only
- `backend/app/api/deps.py` — docstring only
- All route handlers return `pass` (no logic yet)

---

## Checkpoint 2 · Backend Foundation ✅
**Status:** COMPLETE  
**Commit:** `feat(backend): FastAPI app with config, session management, and health check`

**What was done:**
- Added `lifespan` async context manager to `main.py` (startup: creates `SessionManager`, starts TTL cleanup task; shutdown: cancels cleanup task)
- Implemented `backend/app/db/session.py` — `SessionManager` class with:
  - `create_session(db_type)` → generates 12-char hex UUID, stores `SessionState` in memory dict
  - `get_session(id)` → returns session or raises HTTP 404, updates `last_active`
  - `delete_session(id)` → removes from dict or raises 404
  - `get_expiry(session)` → computes expiry from `last_active + SESSION_TTL_MINUTES`
  - Background TTL cleanup task (asyncio, runs every 60s, purges expired sessions)
- Implemented `backend/app/models/session.py` — Pydantic models:
  - `DBType` enum (postgresql, mongodb)
  - `SessionState` (internal: id, db_type, model, created_at, last_active, conversation_history)
  - `SessionCreate` (request: db_type), `SessionResponse` (id, db_type, model, created_at, expires_at)
- Implemented session route handlers in `backend/app/api/routes/session.py`:
  - `POST /api/session` — create session (optional db_type body)
  - `GET /api/session/{id}` — get session info with expiry
  - `DELETE /api/session/{id}` — delete session
  - `POST /api/session/{id}/reinitialize` — clears conversation history, refreshes last_active
- Wired `backend/app/api/deps.py` — `get_session_manager` dependency reads from `app.state`

**Key decisions:**
- Session ID is 12-char hex (first 12 of uuid4) — short enough for display, unique enough for a demo
- `SessionManager` stored on `app.state` via lifespan, accessed through FastAPI `Depends()`
- TTL cleanup is a single `asyncio.Task` — no external scheduler needed
- `reinitialize` currently only clears conversation history; DB re-clone will be added in Checkpoint 3

**Files that are still stubs:**
- `backend/app/core/llm.py` — docstring only
- `backend/app/core/security.py` — docstring only
- `backend/app/db/postgres.py` — docstring only
- `backend/app/db/mongodb.py` — docstring only
- `backend/app/services/*.py` — docstring only
- `backend/app/models/analytics.py`, `backend/app/models/query.py` — docstring only
- Route handlers for query, schema, upload, analytics — still `pass`

---

## Checkpoint 3 · Database Layer ✅
**Status:** COMPLETE  
**Commit:** `feat(backend): PostgreSQL and MongoDB connection with session-scoped isolation`

**What was done:**
- Implemented `backend/app/db/postgres.py` — `PostgresDB` class with:
  - asyncpg connection pool (min 2, max 10 connections)
  - `create_session_schema(session_id)` → creates `s_<session_id>` schema, clones tables from `base_data` using `LIKE ... INCLUDING ALL` + bulk INSERT
  - `drop_session_schema(session_id)` → `DROP SCHEMA ... CASCADE`
  - `execute_query(session_id, query)` → sets `search_path` to session schema, runs SELECT
  - `execute_write(session_id, query)` → sets `search_path`, runs INSERT/UPDATE/DELETE, returns affected row count
  - `get_schema_info(session_id)` → returns table names, columns (name, type, nullable), row counts from `information_schema`
  - `load_data(schema, table_name, columns, rows)` → CREATE TABLE + `copy_records_to_table` bulk insert
- Implemented `backend/app/db/mongodb.py` — `MongoDB` class with:
  - motor async client connection with ping verification
  - `create_session_collections(session_id)` → copies all `base_*` collections to `sess_<id>_*` (strips `_id` to avoid duplicates)
  - `drop_session_collections(session_id)` → drops all `sess_<id>_*` collections
  - `execute_query/find/insert/delete` → operations scoped to session collections
  - `get_schema_info(session_id)` → infers schema from sample document, returns collection names, fields, types, doc counts
  - `load_data(collection_name, docs)` → bulk insert
- Implemented `backend/app/services/schema_inspector.py` — `get_schema()` dispatches to PG or Mongo based on `db_type`
- Implemented `backend/app/services/data_loader.py` — base dataset loading:
  - Parses CSV files with type inference (int, float, bool, str) from first 100 rows
  - Loads into PG `base_data` schema and Mongo `base_*` collections on startup
  - Handles NaN/Inf values, empty cells → None
- Updated `backend/app/main.py` — lifespan now creates `PostgresDB` + `MongoDB`, connects, loads base datasets, stores on `app.state`, closes on shutdown
- Updated `backend/app/db/session.py` — `SessionManager` now accepts `pg`/`mongo`, async `create_session`/`delete_session`/`reinitialize_session` with full DB lifecycle
- Updated `backend/app/api/routes/session.py` — routes use async create/delete/reinitialize
- Implemented `backend/app/api/routes/schema.py` — `GET /api/schema/{session_id}` returns `db_type` + `tables` array
- Added health checks to `docker-compose.yml` for postgres and mongo services
- Created sample datasets:
  - `datasets/sales/orders.csv` — 30 rows (orders with products, categories, regions, dates)
  - `datasets/medical/patients.csv` — 25 rows (patients with diagnoses, departments, treatments)
  - `datasets/hr/employees.csv` — 25 rows (employees with departments, salaries, locations)

**Key decisions:**
- Session schema prefix is `s_` (not `schema_`) — short and avoids PG reserved words
- MongoDB base collections: `base_*` prefix; session collections: `sess_<id>_*` prefix
- CSV type inference uses majority vote from first 100 rows
- PG bulk loading uses `copy_records_to_table` for performance
- DB connections created in `lifespan`, stored on `app.state`

**Files that are still stubs:**
- `backend/app/core/security.py` — docstring only
- `backend/app/services/query_validator.py` — docstring only
- `backend/app/services/analytics.py` — docstring only
- `backend/app/models/analytics.py` — docstring only
- Route handlers for upload, analytics — still `pass`

---

## Checkpoint 4 · Query Generation Pipeline ✅
**Status:** COMPLETE  
**Commit:** `feat(backend): LiteLLM integration with NL-to-query generation`

**What was done:**
- Implemented `backend/app/core/llm.py` — LiteLLM wrapper:
  - `AVAILABLE_MODELS` list: `gpt-4o`, `gpt-4o-mini`, `claude-3-5-sonnet-20241022`, `gemini/gemini-1.5-pro`
  - `get_available_models()` → filters models by which API keys are configured in env
  - `llm_completion(messages, model)` → calls `litellm.acompletion()` with `temperature=0`
  - `_ensure_env_keys()` → sets `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` as env vars from settings
- Implemented `backend/app/services/query_generator.py` — prompt construction:
  - Separate system prompts for PostgreSQL (SQL) and MongoDB (JSON operation format)
  - Schema metadata formatted as readable text (table/collection names, columns, types, row counts — never raw data)
  - Conversation history: last 10 turns appended to messages
  - `_extract_query()` strips markdown code fences and trailing semicolons from LLM response
  - `generate_query(question, schema_info, db_type, model, conversation_history)` → full pipeline
- Implemented `backend/app/models/query.py` — Pydantic models:
  - `QueryGenerateRequest` (session_id, question)
  - `QueryGenerateResponse` (query, db_type)
  - `QueryExecuteRequest` (session_id, query, question — question for conversation history)
  - `QueryExecuteResponse` (columns, rows, row_count, execution_time_ms, affected_rows)
- Implemented `backend/app/api/routes/query.py` — route handlers:
  - `GET /api/query/models` → returns available models (filtered by configured API keys)
  - `POST /api/query/generate` → fetches session + schema, calls LLM, returns generated query
  - `POST /api/query/execute` → executes query against session-scoped PG or Mongo, stores in conversation history, returns result with timing
  - `_execute_pg()` → dispatches SELECT/WITH to `execute_query`, others to `execute_write`
  - `_execute_mongo()` → parses JSON operation, dispatches to find/aggregate/insert/delete/update using MongoDB class methods
- Added `PUT /api/session/{session_id}/model` to `backend/app/api/routes/session.py` — set active LLM model for session
- Added `ModelUpdate` Pydantic model to `backend/app/models/session.py`
- Changed PostgreSQL port mapping in `docker-compose.yml` from `5432:5432` to `5433:5432` (avoids conflict with local PG)

**Key decisions:**
- LiteLLM API keys set via `os.environ.setdefault()` — doesn't override existing env vars, works in both Docker and local
- Only models with configured API keys are returned by `GET /api/query/models` — user only sees what they can use
- Conversation history stored as `{"role": "user/assistant", "content": "..."}` dicts — directly compatible with LLM message format
- Execute endpoint accepts optional `question` field — stored in history alongside the (possibly edited) query
- MongoDB operations returned as JSON: `{"operation": "find|aggregate|...", "collection": "...", "query": {...}}`
- System prompts explicitly forbid DDL (DROP/TRUNCATE/ALTER/CREATE) and dangerous MongoDB operators ($where, $function)

**Files that are still stubs:**
- `backend/app/core/security.py` — docstring only
- `backend/app/services/query_validator.py` — docstring only
- `backend/app/services/analytics.py` — docstring only
- `backend/app/models/analytics.py` — docstring only
- Route handlers for upload, analytics — still `pass`

---

## Checkpoint 5 · Security Layer
**Status:** NOT STARTED  
**Commit:** `feat(backend): query validation, rate limiting, and injection prevention`

**Pickup context:** Full query pipeline works end-to-end (NL → LLM → query → execute → result). Models endpoint filters by configured API keys. Session model can be changed via `PUT /api/session/{id}/model`. Conversation history tracked in session state. Need to add security before any untrusted query hits the DB.

**What to implement:**
- `backend/app/services/query_validator.py`:
  - SQL: Parse via `sqlglot.parse()`, walk AST, allow only SELECT/INSERT/UPDATE/DELETE, reject DROP/TRUNCATE/ALTER/CREATE/EXEC/xp_cmdshell
  - MongoDB: Recursively check operator keys, block `$where`, `$function`, `$accumulator`, `$eval`
- `backend/app/core/security.py`:
  - Rate limiter: in-memory counter per session, max 20 queries/minute, resets every 60s
  - Input sanitizer: strip/validate table/column names before including in LLM prompts (alphanumeric + underscore only)
- Wire validator into query execution flow (validate before executing, return 400 on rejection)
- Wire rate limiter as FastAPI dependency
- Ensure session DB user only has access to their own schema (PG `SET search_path`)

---

## Checkpoint 6 · Frontend Shell
**Status:** NOT STARTED  
**Commit:** `feat(frontend): React app shell with three-panel layout and routing`

**Pickup context:** Backend is fully functional (session mgmt, DB, query gen, security). Frontend has a basic three-panel layout shell. Components exist as stubs: `SchemaPanel.tsx`, `ChatPanel.tsx`, `SettingsPanel.tsx`, `DashboardPanel.tsx`. API client at `src/services/api.ts`. Types at `src/types/index.ts`.

**What to implement:**
- Make sidebar panels collapsible (toggle buttons)
- Session initialization on page load (call `POST /api/session`, store session ID in state)
- Model selector dropdown in SettingsPanel (fetch from `GET /api/query/models`, call `PUT /api/session/{id}/model` on change)
- Session info display (session ID, created time, expiry countdown timer)
- Reinitialize button wired to `POST /api/session/{id}/reinitialize` with confirmation dialog
- Basic theming — clean, demo-quality appearance
- Loading/error states for API calls
- Global state management (React context or zustand — decide at implementation time)

**Existing frontend setup:** Vite dev server on port 5173 (dev) / nginx on port 3000 (Docker). Tailwind v4 via `@import "tailwindcss"` in `index.css`. No `tailwind.config.js`.

---

## Checkpoint 7 · Schema Panel
**Status:** NOT STARTED  
**Commit:** `feat(frontend): schema preview sidebar with live table metadata`

**Pickup context:** Frontend shell is functional — session creates on load, model selector works, panels collapse. SchemaPanel is a stub.

**What to implement:**
- Fetch schema from `GET /api/schema/{sessionId}` on session create and after mutations
- Render table list with expandable sections (click to see columns)
- Show column name, type, nullable badge per column
- Show row count per table
- For pgvector columns: show embedding dimension and index type
- DB type indicator badge (PostgreSQL / MongoDB) at top of panel
- Dataset selector component (if multiple datasets loaded)
- Static query suggestion chips below schema (per dataset, hardcoded list — see PRD §5.2 F-04)
- Clicking a suggestion chip populates and submits the chat input

---

## Checkpoint 8 · Chat Interface
**Status:** NOT STARTED  
**Commit:** `feat: full chat interface with query display, editing, and result tables`

**Pickup context:** Schema panel shows live metadata. Frontend talks to backend. Need the core chat experience.

**What to implement:**
- Chat input bar at bottom of center panel (submit on Enter or button click)
- Send NL question to `POST /api/query/generate`, receive query back
- Render chat thread: user bubble → generated query block → result block
- Query block: syntax-highlighted SQL/MongoDB (use a lightweight highlighter like `prism-react-renderer`), collapsible, copy button
- Edit toggle on query block: switch to editable textarea, user can modify before confirming
- Confirm / Cancel / Edit action buttons on the query block
- On confirm: call `POST /api/query/execute` with the (possibly edited) query
- Result rendering: paginated table (100 rows default), row count header, copy-to-clipboard per row
- If result is single value: render as a metric card instead of table
- Auto-scroll to latest message
- Loading spinner while LLM generates / query executes

**Per PRD:** The edited query (not the original LLM output) is what gets stored in conversation history. No warning on edit.

---

## Checkpoint 9 · Data Operations
**Status:** NOT STARTED  
**Commit:** `feat: CSV/JSON upload, insert/delete records, and reinitialize`

**Pickup context:** Chat interface works end-to-end. Users can ask questions and see results. Need CRUD operations.

**What to implement:**
- **Frontend:** File upload component in SettingsPanel (drag & drop or file picker, CSV/JSON only)
- **Backend:** `POST /api/upload/{sessionId}` — `backend/app/services/data_loader.py`:
  - Read CSV via pandas / JSON via `json.load`
  - Auto-infer schema (column names, types)
  - Create table/collection in session scope
  - Load data
  - Return created schema metadata
- Insert/delete via NL: already handled by query generation pipeline (INSERT/DELETE are whitelisted)
- Confirmation dialog for bulk deletes (>10 rows) — frontend checks row count from result and prompts
- Reinitialize wiring: already has route, needs frontend confirmation modal + chat context reset
- After any mutation: re-fetch schema to update SchemaPanel

---

## Checkpoint 10 · Analytics Dashboard
**Status:** NOT STARTED  
**Commit:** `feat: pinned analytics dashboard with domain-specific metrics`

**Pickup context:** Full CRUD works. Data can be uploaded, queried, inserted, deleted. Need the pinned analytics panel.

**What to implement:**
- **Backend:** `backend/app/services/analytics.py`:
  - Domain detection: fuzzy match column names against known patterns (revenue/price/product → sales, patient/diagnosis → medical, employee/salary/department → HR)
  - Compute metrics per domain using pandas (see PRD §6 for exact metrics per domain)
  - Generic fallback: row count, null %, top 5 categorical frequencies, numeric distributions
  - `GET /api/analytics/{sessionId}` returns list of chart cards with type + data
- **Frontend:** `DashboardPanel.tsx`:
  - Fetch analytics on session create and after reinitialize
  - Render chart cards at top of center panel (above chat thread)
  - Metric cards for single values, Recharts for bar/line/pie/area/histogram
  - Install Recharts: `npm install recharts`
- Recalculate on reinitialize

---

## Checkpoint 11 · Auto Visualization
**Status:** NOT STARTED  
**Commit:** `feat: auto-suggested charts on query results with export`

**Pickup context:** Analytics dashboard shows pinned domain metrics. Need per-query chart suggestions.

**What to implement:**
- After query execution, send result structure (column names + types + row count) to LLM
- LLM suggests chart type: bar, line, pie, scatter, area (or "none" for non-chartable results)
- Render suggested chart below result table in the chat thread
- User can override chart type via dropdown on chart card
- Download chart as PNG (Recharts' `toDataURL` or html2canvas)
- 1–2 line LLM auto-summary of the result (toggleable — small "Show insight" link)
- This is a second LLM call per query (chart suggestion + insight), so make it non-blocking

---

## Checkpoint 12 · Polish & Deployment
**Status:** NOT STARTED  
**Commit:** `chore: Docker optimization, final polish, and deployment-ready packaging`

**Pickup context:** All features work. Need production-readiness and polish.

**What to implement:**
- Multi-stage Docker builds (already partially done — optimize layer caching, minimize image size)
- Docker Compose production config (resource limits, restart policies)
- Pre-loaded sample datasets: generate realistic CSV files for sales, medical, HR domains and place in `datasets/`
- LLM privacy notice in UI footer: _"Your schema metadata is sent to the selected LLM provider."_
- Error handling: API error toasts, network failure recovery, LLM timeout handling
- Loading states: skeleton loaders for schema panel, chat typing indicator, query execution spinner
- Empty states: no data, no chat history, no analytics
- Final `README.md` with setup instructions, screenshots, architecture diagram
- End-to-end smoke test: `docker compose up` → create session → upload data → query → see results + analytics
