from fastapi import APIRouter, Depends, Request

from app.api.deps import get_session_manager
from app.db.session import SessionManager
from app.services.schema_inspector import get_schema

router = APIRouter()


@router.get("/{session_id}")
async def get_session_schema(
    session_id: str,
    request: Request,
    sm: SessionManager = Depends(get_session_manager),
):
    """Get schema metadata for the session's database scope."""
    session = sm.get_session(session_id)
    pg = request.app.state.pg
    mongo = request.app.state.mongo
    tables = await get_schema(session_id, session.db_type, pg, mongo)
    return {"db_type": session.db_type.value, "tables": tables}
