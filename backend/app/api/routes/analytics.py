from fastapi import APIRouter

router = APIRouter()


@router.get("/{session_id}")
async def get_analytics(session_id: str):
    """Get pinned analytics dashboard data for the session's dataset."""
    pass
