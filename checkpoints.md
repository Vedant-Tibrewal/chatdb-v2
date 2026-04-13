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
  - `AVAILABLE_MODELS` list: `gpt-4o`, `anthropic/claude-haiku-4-5-20251001`, `gemini/gemini-2.5-flash`
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
- One model per provider: `gpt-4o` (OpenAI), `anthropic/claude-haiku-4-5-20251001` (Anthropic), `gemini/gemini-2.5-flash` (Google) — keeps the model list clean, one per provider
- Model IDs use LiteLLM provider prefixes (`anthropic/`, `gemini/`) — OpenAI is the default provider, no prefix needed
- Swagger/OpenAPI docs auto-generated by FastAPI at `/docs` — no separate API docs file needed

**Verified — all 6 model × database combinations tested end-to-end:**
- GPT-4o + PostgreSQL ✓ | GPT-4o + MongoDB ✓
- Claude Haiku 4.5 + PostgreSQL ✓ | Claude Haiku 4.5 + MongoDB ✓
- Gemini 2.5 Flash + PostgreSQL ✓ | Gemini 2.5 Flash + MongoDB ✓

**Files that are still stubs:**
- `backend/app/core/security.py` — docstring only
- `backend/app/services/query_validator.py` — docstring only
- `backend/app/services/analytics.py` — docstring only
- `backend/app/models/analytics.py` — docstring only
- Route handlers for upload, analytics — still `pass`

---

## Checkpoint 5 · Security Layer ✅
**Status:** COMPLETE  
**Commit:** `feat(backend): query validation, rate limiting, and injection prevention`

**What was done:**
- Implemented `backend/app/services/query_validator.py`:
  - SQL: Parse via `sqlglot.parse()` (postgres dialect), walk AST, allow only SELECT/INSERT/UPDATE/DELETE/UNION, reject Drop/Create/Alter/AlterColumn/Command/Transaction/Commit/Rollback/TruncateTable
  - Raw text fallback: blocks TRUNCATE, EXEC, EXECUTE, XP_CMDSHELL, COPY, GRANT, REVOKE, SET ROLE keywords
  - MongoDB: Validates operation type against whitelist (find/aggregate/insertOne/insertMany/deleteOne/deleteMany/updateOne/updateMany), recursively checks all keys for blocked operators ($where, $function, $accumulator, $eval)
  - Custom `QueryValidationError` exception with descriptive reason
- Implemented `backend/app/core/security.py`:
  - `RateLimiter` class: in-memory per-session counter, rolling 60-second window, configurable max (default 20/min from settings), returns HTTP 429 on exceed
  - `get_rate_limiter` FastAPI dependency reads from `app.state`
  - `sanitize_identifier()`: validates table/column names against `^[a-zA-Z_][a-zA-Z0-9_]*$` pattern
  - `cleanup_session()` on RateLimiter for removing tracking on session delete
- Wired `validate_sql`/`validate_mongo` into `POST /api/query/execute` — validates before execution, returns 400 on rejection
- Wired `RateLimiter` into both `POST /api/query/generate` and `POST /api/query/execute` via FastAPI `Depends()`
- `RateLimiter` instance created in `main.py` lifespan, stored on `app.state`, configured from `settings.max_queries_per_minute`
- Session DB user access already scoped via `SET search_path` in PostgresDB (from Checkpoint 3)

**Key decisions:**
- Used sqlglot AST walking (not just keyword matching) for robust SQL validation — catches nested subqueries with DDL
- Raw keyword fallback catches operations that sqlglot might parse differently (TRUNCATE, EXEC)
- MongoDB validation is recursive — catches blocked operators at any nesting depth
- Rate limiter uses sliding window (prunes timestamps older than 60s) rather than fixed buckets
- Validation happens at the execute endpoint only (not generate) — user can see what the LLM suggested before it's rejected

**Verified — security tests passed:**
- Valid SELECT ✓ (returns data)
- DROP TABLE → 400 "Statement type not allowed: Drop" ✓
- TRUNCATE TABLE → 400 "Blocked SQL keyword: TRUNCATE" ✓
- ALTER TABLE → 400 "Statement type not allowed: Alter" ✓
- MongoDB $where → 400 "Blocked MongoDB operator: $where" ✓
- Valid MongoDB find → returns data ✓

**Files that are still stubs:**
- `backend/app/services/analytics.py` — docstring only
- `backend/app/models/analytics.py` — docstring only
- Route handlers for upload, analytics — still `pass`

---

## Checkpoint 6 · Frontend Shell ✅
**Status:** COMPLETE  
**Commit:** `feat(frontend): React app shell with three-panel layout and routing`

**What was done:**
- Installed `zustand` for state management
- Created `frontend/src/store/sessionStore.ts` — zustand store with:
  - `initSession(dbType?)` → calls `POST /api/session`, stores response
  - `refreshSession()` → calls `GET /api/session/{id}`
  - `reinitialize()` → calls `POST /api/session/{id}/reinitialize`, refreshes session
  - `updateModel(model)` → calls `PUT /api/session/{id}/model`
  - `fetchModels()` → calls `GET /api/query/models`
  - State: `session`, `dbType`, `models`, `loading`, `error`
- Updated `frontend/src/services/api.ts`:
  - Added typed `SessionResponse` interface
  - Added `getModels()`, `updateModel()`, `reinitialize()` with proper return types
  - Better error handling: extracts `detail` from JSON error responses
- Updated `App.tsx`:
  - Session auto-initializes on page load (`useEffect` → `initSession()`)
  - Three-panel layout with collapsible left (schema) and right (settings) panels
  - Top header bar with ChatDB title, DB type badge, collapse/expand buttons
  - Error banner with dismiss button
  - Loading state indicator
- Updated `SettingsPanel.tsx`:
  - Model selector dropdown (fetches from `GET /api/query/models`, shows display names)
  - Session info: ID, database type, expiry countdown timer (updates every second)
  - DB type indicator (PostgreSQL / MongoDB) — visual only, set at session creation
  - Reinitialize button with confirmation dialog ("Reset all data and chat history?")
  - Collapse button
- Updated `SchemaPanel.tsx`:
  - DB type badge
  - Collapse button
  - Placeholder for schema data (Checkpoint 7)
- Updated `ChatPanel.tsx`:
  - Session-aware: shows spinner while session creates, empty state when ready
  - Input bar with Send button, disabled until session is active
  - Clean empty state with icon and descriptive text
- Applied consistent visual theming: white panels, subtle borders, blue-500 accent, rounded-lg elements

**Key decisions:**
- Zustand for state management (lightweight, no boilerplate vs Context or Redux)
- Model display names mapped from LiteLLM IDs (e.g. `anthropic/claude-haiku-4-5-20251001` → "Claude Haiku 4.5")
- Expiry countdown uses `setInterval(1000)` in SettingsPanel — simple and effective
- DB type selector is visual-only (disabled) — type is set at session creation, changing it requires a new session
- Panels collapse via parent state in App.tsx, expand buttons appear in the header bar

**Existing frontend setup:** Vite dev server on port 3000 (dev) / nginx on port 3000 (Docker). Tailwind v4 via `@import "tailwindcss"` in `index.css`. Vite proxies `/api` to `http://localhost:8000`.

---

## Checkpoint 7 · Schema Panel ✅
**Status:** COMPLETE  
**Commit:** `feat(frontend): schema preview sidebar with live table metadata`

**What was done:**
- Added `SchemaTable` type, `schema`, `pendingInput` state, `fetchSchema()`, `setPendingInput()` actions to `sessionStore.ts`
- `fetchSchema()` calls `GET /api/schema/{sessionId}` and stores table metadata in store
- Schema auto-fetched after `initSession()` and `reinitialize()` (clears schema to `null` during reinit)
- Rewrote `SchemaPanel.tsx` with full schema display:
  - Original navigation preserved (New Chat, Saved Queries buttons)
  - DB type badge under Database section
  - Tables and Suggestions sections are VS Code explorer-style collapsible panels anchored to bottom
  - Expandable table list — click to toggle columns
  - Each column shows name, type (monospace), nullable badge (yellow)
  - Row count per table displayed inline
  - Skeleton loading animation while schema loads
  - Empty state for no tables
- Static query suggestion chips per dataset domain:
  - Sales (orders): "Top 5 products by revenue", "Total revenue by region", "Monthly sales trend", "Show all orders from last quarter"
  - Medical (patients): "Patient count by diagnosis", "Average length of stay", "Patients by department", "Most common treatments"
  - HR (employees): "Headcount by department", "Average salary by department", "Top 5 highest paid employees", "Employee count by location"
- Clicking a suggestion chip sets `pendingInput` in the store
- Updated `ChatPanel.tsx`:
  - Controlled input with `useState`
  - `useEffect` watches `pendingInput` — auto-populates input field when suggestion chip is clicked
  - Send button disabled when input is empty

**Key decisions:**
- Suggestions are derived dynamically from schema table names — only shown for recognized datasets (orders/patients/employees)
- `pendingInput` pattern (store → ChatPanel) decouples SchemaPanel from ChatPanel without prop drilling
- Collapsible sections use `flex-1` spacer to push to bottom; capped with `max-h-[50%]`/`max-h-[40%]` when open

**Files modified:**
- `frontend/src/store/sessionStore.ts` — added schema + pendingInput state and actions
- `frontend/src/components/schema/SchemaPanel.tsx` — complete rewrite with live schema + suggestion chips
- `frontend/src/components/chat/ChatPanel.tsx` — controlled input + pendingInput handling

---

## Checkpoint 8 · Chat Interface ✅
**Status:** COMPLETE  
**Commit:** `feat: full chat interface with query display, editing, and result tables`

**What was done:**
- Created `frontend/src/store/chatStore.ts` — zustand store for chat state:
  - `ChatMessage` type: `user` | `query` | `result` | `error`, with `status` for query messages (`pending` | `confirmed` | `cancelled` | `editing`)
  - `sendQuestion(sessionId, question)` → appends user bubble, calls `POST /api/query/generate`, appends query block with `pending` status
  - `confirmQuery(sessionId, messageId, question)` → calls `POST /api/query/execute` with the (possibly edited) query, appends result message
  - `cancelQuery(messageId)` → marks query as cancelled
  - `updateQueryText(messageId, text)` → updates query content for edit mode
  - `setQueryStatus(messageId, status)` → toggles between pending/editing
  - `clearMessages()` → resets on reinitialize
  - State: `messages`, `generating`, `executing`
- Rewrote `frontend/src/components/chat/ChatPanel.tsx` with full chat experience:
  - **Chat thread:** user bubbles (right-aligned, blue), query blocks, result tables, error banners
  - **Query block (`QueryBlock` component):**
    - Collapsible query display with chevron toggle
    - SQL/MongoDB label based on db_type
    - Copy button with ✓ feedback
    - Edit mode: switches to textarea for inline editing
    - Action buttons: Run (confirms and executes), Edit (toggles edit mode), Cancel (dismisses query)
    - Status badges: "✓ Executed" for confirmed, "Cancelled" for dismissed
  - **Result table (`ResultTable` component):**
    - Paginated data table (100 rows/page) with horizontal scroll
    - Sticky header row, row count + execution time display
    - Page navigation (‹ ›) when results exceed page size
    - Single-value results rendered as metric card (large number + column name)
    - Write operations show "{n} rows affected" card
    - Null values displayed with gray "null" text
  - **Input bar:** submit on Enter or Send button, disabled during generate/execute
  - **Auto-scroll:** `useRef` + `scrollIntoView` on message updates
  - **Loading states:** spinning indicators for "Generating query..." and "Running query..."
  - **Empty state:** centered prompt when no messages
  - Suggestion chip integration preserved (pendingInput → input field + focus)
- Updated `sessionStore.ts`:
  - Imports `useChatStore` and calls `clearMessages()` on reinitialize
  - Chat thread resets when user reinitializes session

**Key decisions:**
- Separate `chatStore` from `sessionStore` — chat state is UI-local, session state is server-synced
- No syntax highlighting library — uses `<pre>` with monospace font; keeps bundle small, avoids prism-react-renderer dependency
- Query block shows Run/Edit/Cancel only while `pending` or `editing`; once confirmed or cancelled, only the query text and status badge remain
- Edited query is what gets sent to execute endpoint (via `updateQueryText`) — matches PRD requirement
- `fetchSchema()` called after every query execution to keep schema panel up-to-date after mutations
- Message IDs use simple counter (`msg-1`, `msg-2`, ...) — sufficient for single-session UI

**Files created:**
- `frontend/src/store/chatStore.ts`

**Files modified:**
- `frontend/src/components/chat/ChatPanel.tsx` — complete rewrite
- `frontend/src/store/sessionStore.ts` — clearMessages on reinitialize

---

## Checkpoint 9 · Data Operations ✅
**Status:** COMPLETE  
**Commit:** `feat: CSV/JSON upload, insert/delete records, and reinitialize`

**What was done:**
- Implemented `backend/app/api/routes/upload.py` — `POST /api/upload/{session_id}`:
  - Accepts `multipart/form-data` with a single file (CSV or JSON)
  - Validates file extension (.csv or .json) and UTF-8 encoding
  - Derives table name from filename (sanitized via `sanitize_identifier`)
  - CSV parsing: infers column types from first 100 rows (int, float, bool, str)
  - JSON parsing: expects array of objects, infers types from first 100 entries
  - Creates/replaces table in session-scoped PG schema or Mongo collection
  - Returns `table_name`, `columns` (name + type), `row_count`
- Added upload UI to `frontend/src/components/layout/SettingsPanel.tsx`:
  - "Upload CSV / JSON" button with hidden file input
  - Upload progress indicator (spinner)
  - Success feedback: shows table name + row count after upload
  - Triggers `fetchSchema()` to update SchemaPanel after upload
  - Error handling via session store's `setError`
- Added `setError` action to `frontend/src/store/sessionStore.ts`
- Fixed `api.uploadDataset()` in `frontend/src/services/api.ts` to properly handle error responses
- Insert/delete via NL: already handled by query generation pipeline (INSERT/DELETE are whitelisted in query validator)
- Reinitialize wiring: already functional from Checkpoint 3 (backend) and Checkpoint 6 (frontend with confirmation modal + chat context reset)
- Schema auto-refreshes after query execution (Checkpoint 8) and after file upload

**Key decisions:**
- File upload replaces existing table/collection with same name (DROP + recreate) — avoids duplicate data confusion
- Table name derived from filename with sanitization — falls back to "uploaded_data" if filename has invalid characters
- Reused type inference logic from `data_loader.py` (kept as separate functions in upload route for independence)
- No separate bulk delete confirmation dialog — handled naturally through the query execution flow (user sees the DELETE query and confirms before execution)

---

## Checkpoint 10 · Analytics Dashboard ✅
**Status:** COMPLETE  
**Commit:** `feat: pinned analytics dashboard with domain-specific metrics`

**What was done:**
- Implemented `backend/app/models/analytics.py` — Pydantic models:
  - `ChartCard` (id, title, type, data, value, subtitle)
  - `AnalyticsResponse` (domain, cards)
- Implemented `backend/app/services/analytics.py`:
  - Domain detection via fuzzy keyword matching against table/column names (ecommerce, sales, medical, hr, sports, cybersecurity, generic fallback)
  - Domain-specific analytics handlers:
    - **E-Commerce:** total revenue, total orders, orders by payment method, orders by status, products by category, avg price, total customers
    - **Sales:** pipeline value, total deals, deals by stage, deals by source, reps by region
    - **Medical:** total patients, by diagnosis, by insurance, total visits, by department, avg visit cost, doctors by specialization
    - **HR:** headcount, by department, by location, avg salary, by status, reviews by rating
    - **Sports:** total teams, by conference, total players, by position, avg salary, total games
    - **Cybersecurity:** total vulnerabilities, by severity, total assets, by criticality, total events, by type
    - **Generic fallback:** row counts, null %, top 5 categorical frequencies
  - All computation in pure Python (no LLM dependency)
- Added `get_all_table_data()` to `backend/app/db/postgres.py` — fetches schema + all rows for analytics
- Added `get_all_collection_data()` to `backend/app/db/mongodb.py` — fetches schema + all docs for analytics
- Implemented `backend/app/api/routes/analytics.py` — `GET /api/analytics/{session_id}` returns domain + chart cards
- Rewrote `frontend/src/components/dashboard/DashboardPanel.tsx`:
  - Fetches analytics on session init via `api.getAnalytics()`
  - Renders metric cards (large numbers) in a responsive grid row
  - Chart cards rendered via Recharts: BarChart, PieChart, LineChart, AreaChart
  - Domain header with card count
  - Loading spinner and error states
- Installed `recharts` npm package
- Added `./backend/app:/app/app:ro` volume mount to `docker-compose.yml` for development hot-reload

**Key decisions:**
- Analytics computed from actual row data (fetched via `get_all_table_data`), not from LLM — as specified in PRD
- Domain detection is keyword-based (no ML), matching table/column names against known patterns
- Each domain handler falls back to generic analytics if no relevant data found
- Chart types: metric (single value), bar, pie, line, area — mapped to Recharts components
- Backend volume mount added for faster development iteration (avoids rebuild on every code change)

---

## Checkpoint 11 · Auto Visualization ✅
**Status:** COMPLETE  
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

**What was done:**
- Client-side chart suggestion in `ResultChart` component (no extra LLM call — analyzes column types/data shape):
  - Detects category vs numeric columns from result data
  - Auto-selects chart type: pie (≤6 categories), bar/horizontal_bar (≤20), area/line (many points)
  - Returns `none` for single-value results, write ops, empty results, or >200 rows
- Chart type switcher toolbar: Bar, H-Bar, Pie, Line, Area buttons
- Auto-generated text insight (e.g., "Offline leads at 36% of the total")
- Show/hide insight toggle
- Renders inline below ResultTable using Recharts with theme-consistent colors
- Fixed `affected_rows` null vs undefined bug: Pydantic sends `null` in JSON, JS needed `!= null` (loose equality) instead of `!== undefined`

**Bug fixes included in this checkpoint:**
- Timestamp type inference: added `_TIMESTAMP_RE` and `_DATE_RE` regex to `data_loader._infer_type()` — columns like `event_timestamp` now created as `TIMESTAMPTZ` instead of `TEXT`
- Base data schema recreation: changed `postgres.py` startup from `CREATE SCHEMA IF NOT EXISTS` to `DROP SCHEMA CASCADE` + `CREATE SCHEMA` so type changes take effect on restart
- Query execution error handling: wrapped `_execute_pg`/`_execute_mongo` in try/except returning 400 with actual DB error instead of unhandled 500
- Dataset selector "All Datasets": changed `initSession` signature to accept `string | null`, so selecting "All" properly passes `null` instead of `undefined` (which fell back to current dataset)
- Int/float type promotion: if a column has any float values alongside ints, the whole column is promoted to `float`
- Cast fallback: `_cast_value` for `int` catches ValueError and falls back to `float`

**Additional work:**
- Generated test datasets for upload pipeline testing:
  - `datasets/education/` — students.csv, courses.csv, enrollments.csv
  - `datasets/real_estate/` — properties.csv, agents.csv, transactions.csv
  - `datasets/restaurant/` — menu_items.csv, orders.csv, order_details.csv
  - `datasets/iot/` — sensor_readings.json (JSON format)

---

## Checkpoint 12 · Polish & Deployment ✅
**Status:** COMPLETE  
**Commit:** `chore: Docker optimization, final polish, and deployment-ready packaging`

**What was done:**
- `.dockerignore` files for backend and frontend (smaller build contexts)
- Docker Compose production config: `restart: unless-stopped`, `deploy.resources.limits.memory` for all services
- LLM privacy notice in chat input footer: "Your schema metadata is sent to the selected LLM provider"
- Error banner auto-dismiss after 8s via `ErrorBanner` component with `useEffect` timer
- Loading states verified: schema panel skeleton loaders, dashboard spinner, chat generating/executing indicators
- Empty states verified: schema "No tables found", dashboard "No analytics data", chat "Ask a question about your data"
- Pre-loaded sample datasets: 9 domains (ecommerce, sports, medical, sales, cybersecurity, hr, education, real_estate, restaurant) + 1 JSON (iot)
- Final `README.md`: architecture diagram, full feature list, tech stack, project structure, dev setup, environment variables

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
