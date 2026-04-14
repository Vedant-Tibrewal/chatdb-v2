"""In-memory session state management with TTL expiry."""

import asyncio
import logging
import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException

from app.core.config import settings
from app.models.session import DBType, SessionState

logger = logging.getLogger(__name__)


class SessionManager:
    def __init__(self, pg=None, mongo=None, dataset_map: dict[str, dict[str, str]] | None = None) -> None:
        self._sessions: dict[str, SessionState] = {}
        self._cleanup_task: asyncio.Task | None = None
        self.pg = pg
        self.mongo = mongo
        self.dataset_map = dataset_map or {}

    def _build_table_filter(self, dataset: str | None) -> dict[str, str] | None:
        """Build base→session table name mapping for a dataset (or all datasets)."""
        if dataset:
            return self.dataset_map.get(dataset)
        if not self.dataset_map:
            return None
        # Merge all datasets; detect collisions by session name
        seen: dict[str, int] = {}  # session_name → occurrence count
        for ds_tables in self.dataset_map.values():
            for session_name in ds_tables.values():
                seen[session_name] = seen.get(session_name, 0) + 1
        combined: dict[str, str] = {}
        for ds_tables in self.dataset_map.values():
            for base_name, session_name in ds_tables.items():
                if seen[session_name] > 1:
                    # Collision — keep the prefixed base name
                    combined[base_name] = base_name
                else:
                    combined[base_name] = session_name
        return combined

    async def create_session(
        self, db_type: DBType = DBType.POSTGRESQL, dataset: str | None = None
    ) -> SessionState:
        session_id = uuid.uuid4().hex[:12]
        session = SessionState(id=session_id, db_type=db_type, dataset=dataset)
        self._sessions[session_id] = session

        # Determine which tables to clone
        table_filter = self._build_table_filter(dataset)

        # Create session-scoped DB schema/collections
        if db_type == DBType.POSTGRESQL and self.pg:
            await self.pg.create_session_schema(session_id, table_filter=table_filter)
            logger.info("Created PG session schema for %s (dataset=%s)", session_id, dataset)
        elif db_type == DBType.MONGODB and self.mongo:
            await self.mongo.create_session_collections(session_id, table_filter=table_filter)
            logger.info("Created Mongo session collections for %s (dataset=%s)", session_id, dataset)

        return session

    def get_session(self, session_id: str) -> SessionState:
        session = self._sessions.get(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        session.last_active = datetime.utcnow()
        return session

    async def delete_session(self, session_id: str) -> None:
        session = self._sessions.get(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

        # Drop session DB data
        if session.db_type == DBType.POSTGRESQL and self.pg:
            await self.pg.drop_session_schema(session_id)
        elif session.db_type == DBType.MONGODB and self.mongo:
            await self.mongo.drop_session_collections(session_id)

        del self._sessions[session_id]

    async def reinitialize_session(self, session_id: str) -> SessionState:
        session = self.get_session(session_id)
        table_filter = self._build_table_filter(session.dataset)

        # Drop and re-clone
        if session.db_type == DBType.POSTGRESQL and self.pg:
            await self.pg.drop_session_schema(session_id)
            await self.pg.create_session_schema(session_id, table_filter=table_filter)
        elif session.db_type == DBType.MONGODB and self.mongo:
            await self.mongo.drop_session_collections(session_id)
            await self.mongo.create_session_collections(session_id, table_filter=table_filter)

        session.conversation_history.clear()
        session.last_active = datetime.utcnow()
        return session

    def get_expiry(self, session: SessionState) -> datetime:
        return session.last_active + timedelta(minutes=settings.session_ttl_minutes)

    async def start_cleanup_task(self) -> None:
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def stop_cleanup_task(self) -> None:
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass

    async def _cleanup_loop(self) -> None:
        while True:
            await asyncio.sleep(60)
            now = datetime.utcnow()
            ttl = timedelta(minutes=settings.session_ttl_minutes)
            expired = [
                sid for sid, s in self._sessions.items()
                if now - s.last_active > ttl
            ]
            for sid in expired:
                try:
                    await self.delete_session(sid)
                    logger.info("Cleaned up expired session %s", sid)
                except Exception as e:
                    logger.error("Failed to cleanup session %s: %s", sid, e)
