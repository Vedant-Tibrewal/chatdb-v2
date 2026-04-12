"""In-memory session state management with TTL expiry."""

import asyncio
import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException

from app.core.config import settings
from app.models.session import DBType, SessionState


class SessionManager:
    def __init__(self) -> None:
        self._sessions: dict[str, SessionState] = {}
        self._cleanup_task: asyncio.Task | None = None

    def create_session(self, db_type: DBType = DBType.POSTGRESQL) -> SessionState:
        session_id = uuid.uuid4().hex[:12]
        session = SessionState(id=session_id, db_type=db_type)
        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> SessionState:
        session = self._sessions.get(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        session.last_active = datetime.utcnow()
        return session

    def delete_session(self, session_id: str) -> None:
        if session_id not in self._sessions:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        del self._sessions[session_id]

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
                del self._sessions[sid]
