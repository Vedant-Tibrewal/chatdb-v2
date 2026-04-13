import logging

from fastapi import APIRouter, Depends, Request

from app.api.deps import get_session_manager
from app.db.session import SessionManager
from app.models.session import DBType
from app.services.analytics import compute_analytics

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/{session_id}")
async def get_analytics(session_id: str, request: Request, sm: SessionManager = Depends(get_session_manager)):
    """Get pinned analytics dashboard data for the session's dataset."""
    session = sm.get_session(session_id)
    pg = request.app.state.pg
    mongo = request.app.state.mongo

    if session.db_type == DBType.POSTGRESQL:
        tables_with_data = await pg.get_all_table_data(session_id)
    else:
        tables_with_data = await mongo.get_all_collection_data(session_id)

    result = await compute_analytics(tables_with_data)
    return result
