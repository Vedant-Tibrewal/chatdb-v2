from fastapi import APIRouter

router = APIRouter()


@router.get("/{session_id}")
async def get_schema(session_id: str):
    """Get schema metadata for the session's database scope."""
    pass
