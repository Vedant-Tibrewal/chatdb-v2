from fastapi import APIRouter, Depends

from app.api.deps import get_session_manager
from app.db.session import SessionManager
from app.models.session import ModelUpdate, SessionCreate, SessionResponse

router = APIRouter()


@router.post("", response_model=SessionResponse)
async def create_session(
    body: SessionCreate | None = None,
    sm: SessionManager = Depends(get_session_manager),
):
    """Create a new session with isolated database scope."""
    db_type = body.db_type if body else None
    session = await (sm.create_session(db_type=db_type) if db_type else sm.create_session())
    return SessionResponse(
        id=session.id,
        db_type=session.db_type,
        model=session.model,
        created_at=session.created_at,
        expires_at=sm.get_expiry(session),
    )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    sm: SessionManager = Depends(get_session_manager),
):
    """Get session info and status."""
    session = sm.get_session(session_id)
    return SessionResponse(
        id=session.id,
        db_type=session.db_type,
        model=session.model,
        created_at=session.created_at,
        expires_at=sm.get_expiry(session),
    )


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    sm: SessionManager = Depends(get_session_manager),
):
    """Delete session and clean up scoped data."""
    await sm.delete_session(session_id)
    return {"detail": "Session deleted"}


@router.post("/{session_id}/reinitialize")
async def reinitialize_session(
    session_id: str,
    sm: SessionManager = Depends(get_session_manager),
):
    """Drop and re-clone session data from base snapshot."""
    session = await sm.reinitialize_session(session_id)
    return {
        "detail": "Session reinitialized",
        "expires_at": sm.get_expiry(session).isoformat(),
    }


@router.put("/{session_id}/model", response_model=SessionResponse)
async def update_model(
    session_id: str,
    body: ModelUpdate,
    sm: SessionManager = Depends(get_session_manager),
):
    """Set the active LLM model for a session."""
    session = sm.get_session(session_id)
    session.model = body.model
    return SessionResponse(
        id=session.id,
        db_type=session.db_type,
        model=session.model,
        created_at=session.created_at,
        expires_at=sm.get_expiry(session),
    )
