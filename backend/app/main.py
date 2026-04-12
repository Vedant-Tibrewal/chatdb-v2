import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import session, query, schema, upload, analytics
from app.core.config import settings
from app.core.security import RateLimiter
from app.db.mongodb import MongoDB
from app.db.postgres import PostgresDB
from app.db.session import SessionManager
from app.services.data_loader import load_base_datasets

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    pg = PostgresDB()
    mongo = MongoDB()

    await pg.connect()
    logger.info("PostgreSQL connected")
    await mongo.connect()
    logger.info("MongoDB connected")

    # Load base datasets
    await load_base_datasets(pg, mongo)
    logger.info("Base datasets loaded")

    sm = SessionManager(pg=pg, mongo=mongo)
    app.state.session_manager = sm
    app.state.pg = pg
    app.state.mongo = mongo
    app.state.rate_limiter = RateLimiter(max_per_minute=settings.max_queries_per_minute)
    await sm.start_cleanup_task()

    yield

    # Shutdown
    await sm.stop_cleanup_task()
    await pg.close()
    await mongo.close()
    logger.info("Database connections closed")


def create_app() -> FastAPI:
    app = FastAPI(
        title="ChatDB API",
        version="0.1.0",
        description="Natural language database query interface",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(session.router, prefix="/api/session", tags=["session"])
    app.include_router(query.router, prefix="/api/query", tags=["query"])
    app.include_router(schema.router, prefix="/api/schema", tags=["schema"])
    app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
    app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])

    @app.get("/health")
    async def health_check():
        return {"status": "ok"}

    return app


app = create_app()
