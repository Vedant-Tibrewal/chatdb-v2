# ChatDB

A session-based natural language interface for querying SQL, NoSQL, and vector databases using plain English.

## Quick Start

```bash
cp .env.example .env   # add your API keys
docker compose up
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Health check:** http://localhost:8000/health

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Tailwind CSS |
| Backend | FastAPI (Python) |
| LLM Routing | LiteLLM (OpenAI, Anthropic, Google) |
| SQL Database | PostgreSQL + pgvector |
| NoSQL Database | MongoDB |
| Deployment | Docker Compose |

## Project Structure

```
├── frontend/              # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/    # UI components (chat, schema, dashboard, layout)
│   │   ├── services/      # API client
│   │   └── types/         # TypeScript type definitions
│   ├── Dockerfile
│   └── package.json
├── backend/               # FastAPI (Python)
│   ├── app/
│   │   ├── api/routes/    # REST endpoints (session, query, schema, upload, analytics)
│   │   ├── core/          # Config, security, LLM wrapper
│   │   ├── db/            # PostgreSQL + MongoDB connection & session management
│   │   ├── models/        # Pydantic models
│   │   └── services/      # Business logic (query gen, validation, analytics)
│   ├── tests/
│   ├── Dockerfile
│   └── pyproject.toml
├── datasets/              # Pre-loaded sample datasets (sales, medical, HR)
├── docker-compose.yml
├── .env.example
└── checkpoints.md         # Development milestones
```

## Development

### Backend (standalone)
```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### Frontend (standalone)
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

See [.env.example](.env.example) for all required configuration.

## License

Private project — not licensed for redistribution.