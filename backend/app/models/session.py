"""Session data models."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class DBType(str, Enum):
    POSTGRESQL = "postgresql"
    MONGODB = "mongodb"


class SessionState(BaseModel):
    id: str
    db_type: DBType = DBType.POSTGRESQL
    dataset: str | None = None
    model: str = "gemini/gemini-2.5-flash"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime = Field(default_factory=datetime.utcnow)
    conversation_history: list[dict] = Field(default_factory=list)


class SessionCreate(BaseModel):
    db_type: DBType = DBType.POSTGRESQL
    dataset: str | None = None


class ModelUpdate(BaseModel):
    model: str


class SessionResponse(BaseModel):
    id: str
    db_type: DBType
    dataset: str | None = None
    model: str
    created_at: datetime
    expires_at: datetime
