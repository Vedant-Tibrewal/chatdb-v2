from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import session, query, schema, upload, analytics
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="ChatDB API",
        version="0.1.0",
        description="Natural language database query interface",
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
