"""Query request/response models."""

from pydantic import BaseModel


class QueryGenerateRequest(BaseModel):
    session_id: str
    question: str


class QueryGenerateResponse(BaseModel):
    query: str
    db_type: str


class QueryExecuteRequest(BaseModel):
    session_id: str
    query: str
    question: str = ""  # Original NL question, for conversation history


class QueryExecuteResponse(BaseModel):
    columns: list[str]
    rows: list[dict]
    row_count: int
    execution_time_ms: float
    affected_rows: int | None = None
