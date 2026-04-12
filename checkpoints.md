# ChatDB — Git Checkpoints

Each checkpoint represents a meaningful, working milestone. Commits are made at each checkpoint with a descriptive message.

---

## Checkpoint 1 · Project Scaffold
**Commit:** `chore: scaffold project structure with Docker Compose and config files`
- Folder structure for frontend (React + TS + Tailwind) and backend (FastAPI + uv)
- `docker-compose.yml` with all 4 services (frontend, backend, postgres, mongo)
- `Dockerfile` for frontend and backend
- `.env.example` with all required env vars
- `pyproject.toml` (uv) and `package.json` (npm) with initial dependencies
- Tailwind + Vite config for frontend
- Empty dataset directories with READMEs
- Updated `.gitignore` and `README.md`

---

## Checkpoint 2 · Backend Foundation
**Commit:** `feat(backend): FastAPI app with config, session management, and health check`
- FastAPI entry point (`main.py`) with CORS, lifespan events
- Config module loading env vars via pydantic-settings
- Session manager — UUID generation, in-memory session store, TTL expiry background task
- Session API routes (`POST /session`, `GET /session/{id}`, `DELETE /session/{id}`)
- Health check endpoint
- Basic request/response models

---

## Checkpoint 3 · Database Layer
**Commit:** `feat(backend): PostgreSQL and MongoDB connection with session-scoped isolation`
- PostgreSQL async connection pool (asyncpg)
- MongoDB async client (motor)
- Session schema creation/teardown for PostgreSQL (`schema_<session_id>`)
- Session collection prefix for MongoDB (`sess_<id>_`)
- Base dataset cloning into session scope
- Reinitialize endpoint (drop + re-clone)
- Schema inspector — extract table names, column names, types, row counts

---

## Checkpoint 4 · Query Generation Pipeline
**Commit:** `feat(backend): LiteLLM integration with NL-to-query generation`
- LiteLLM wrapper with model switching (OpenAI, Anthropic, Gemini)
- Prompt template construction — schema metadata + conversation history + user question
- Query generation endpoint (`POST /query/generate`)
- Query execution endpoint (`POST /query/execute`)
- Conversation history tracking (per session, last N turns)
- Model selection API (`GET /models`, `PUT /session/{id}/model`)

---

## Checkpoint 5 · Security Layer
**Commit:** `feat(backend): query validation, rate limiting, and injection prevention`
- SQL AST validation via `sqlglot` — whitelist SELECT/INSERT/UPDATE/DELETE, block DROP/TRUNCATE/ALTER/CREATE/EXEC
- MongoDB operator whitelist — block `$where`, `$function`, eval-style operators
- Rate limiting — 20 query executions per session per minute
- Input sanitization for table/column names in LLM prompts
- DB user permission scoping to session schema only

---

## Checkpoint 6 · Frontend Shell
**Commit:** `feat(frontend): React app shell with three-panel layout and routing`
- Vite + React + TypeScript + Tailwind setup (working dev build)
- Three-panel layout — left sidebar, center chat, right panel
- Collapsible sidebar panels
- API client service (axios/fetch wrapper)
- Session initialization on page load
- Model selector dropdown in right panel
- Session info display with expiry countdown
- Basic theming and responsive layout

---

## Checkpoint 7 · Schema Panel
**Commit:** `feat(frontend): schema preview sidebar with live table metadata`
- Schema panel in left sidebar showing tables/collections
- Column names, data types, row counts displayed
- pgvector embedding dimension and index type shown
- DB type indicator badge
- Live updates after inserts/deletes
- Dataset selector component
- Static query suggestion chips (per dataset)

---

## Checkpoint 8 · Chat Interface
**Commit:** `feat: full chat interface with query display, editing, and result tables`
- Chat input bar with NL prompt submission
- Chat thread rendering — user bubble → query block → result block
- Syntax-highlighted query display (collapsible, copy button)
- Query edit toggle — user can modify before confirming
- Confirm / cancel / edit controls on generated query
- Paginated result table (100 rows default)
- Single-value metric card display
- Copy-to-clipboard on result rows
- Row count in result header

---

## Checkpoint 9 · Data Operations
**Commit:** `feat: CSV/JSON upload, insert/delete records, and reinitialize`
- File upload UI (CSV / JSON) in right panel
- Backend schema inference from uploaded files
- Data loading into session-scoped tables/collections
- Insert record via NL or form modal
- Delete records via NL or row selection
- Bulk delete confirmation (>10 rows)
- Reinitialize button with confirmation dialog
- Schema panel refresh after mutations

---

## Checkpoint 10 · Analytics Dashboard
**Commit:** `feat: pinned analytics dashboard with domain-specific metrics`
- Domain auto-detection from dataset metadata (fuzzy column name matching)
- pandas-based metric computation at dataset load time
- Pinned chart cards at top of center panel
- Sales domain: revenue trend, product bar chart, profit/loss area, top 5 products, regional breakdown
- Medical domain: patient count, OPD/IPD donut, surgery metrics, diagnosis bar, average stay
- HR domain: headcount bar, attrition trend, tenure metric, salary histogram
- Generic fallback: row count, null %, categorical frequencies, numeric distributions
- Recalculation on reinitialize

---

## Checkpoint 11 · Auto Visualization
**Commit:** `feat: auto-suggested charts on query results with export`
- LLM-suggested chart type based on result structure
- Supported chart types: bar, line, pie, scatter, area
- Recharts / Plotly rendering in result blocks
- User override of chart type
- Download chart as PNG
- 1–2 line LLM auto-summary (toggleable)

---

## Checkpoint 12 · Polish & Deployment
**Commit:** `chore: Docker optimization, final polish, and deployment-ready packaging`
- Multi-stage Docker builds (smaller images)
- Docker Compose production config
- Pre-loaded sample datasets bundled in `/datasets`
- LLM privacy notice in UI footer
- Error handling and edge case polish
- Loading states and empty states
- Final `README.md` with setup instructions, screenshots, architecture diagram
- End-to-end smoke test locally via `docker compose up`
