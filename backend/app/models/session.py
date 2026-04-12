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
    model: str = "gpt-4o"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime = Field(default_factory=datetime.utcnow)
    conversation_history: list[dict] = Field(default_factory=list)


class SessionCreate(BaseModel):
    db_type: DBType = DBType.POSTGRESQL


class ModelUpdate(BaseModel):
    model: str


class SessionResponse(BaseModel):
    id: str
    db_type: DBType
    model: str
    created_at: datetime
    expires_at: datetime
