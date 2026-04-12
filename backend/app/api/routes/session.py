from fastapi import APIRouter

router = APIRouter()


@router.post("")
async def create_session():
    """Create a new session with isolated database scope."""
    pass


@router.get("/{session_id}")
async def get_session(session_id: str):
    """Get session info and status."""
    pass


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """Delete session and clean up scoped data."""
    pass


@router.post("/{session_id}/reinitialize")
async def reinitialize_session(session_id: str):
    """Drop and re-clone session data from base snapshot."""
    pass
