from fastapi import APIRouter

router = APIRouter()


@router.post("/{session_id}")
async def upload_dataset(session_id: str):
    """Upload a CSV or JSON file to create a table/collection in session scope."""
    pass
