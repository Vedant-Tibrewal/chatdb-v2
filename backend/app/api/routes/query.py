from fastapi import APIRouter

router = APIRouter()


@router.post("/generate")
async def generate_query():
    """Generate a database query from natural language input."""
    pass


@router.post("/execute")
async def execute_query():
    """Execute a confirmed query against the session-scoped database."""
    pass
