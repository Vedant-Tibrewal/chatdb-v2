import json
import logging
import time

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.deps import get_session_manager
from app.core.llm import get_available_models
from app.db.session import SessionManager
from app.models.query import (
    QueryExecuteRequest,
    QueryExecuteResponse,
    QueryGenerateRequest,
    QueryGenerateResponse,
)
from app.models.session import DBType
from app.services.query_generator import generate_query
from app.services.schema_inspector import get_schema

router = APIRouter()

logger = logging.getLogger(__name__)


@router.get("/models")
async def list_models():
    """Return the list of available LLM models (only those with configured API keys)."""
    return get_available_models()


@router.post("/generate", response_model=QueryGenerateResponse)
async def generate(
    body: QueryGenerateRequest,
    request: Request,
    sm: SessionManager = Depends(get_session_manager),
):
    """Generate a database query from natural language input."""
    session = sm.get_session(body.session_id)

    pg = request.app.state.pg
    mongo = request.app.state.mongo
    schema_info = await get_schema(session.id, session.db_type, pg, mongo)

    try:
        query = await generate_query(
            question=body.question,
            schema_info=schema_info,
            db_type=session.db_type,
            model=session.model,
            conversation_history=session.conversation_history,
        )
    except Exception as e:
        logger.error("LLM call failed: %s", e)
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")

    return QueryGenerateResponse(query=query, db_type=session.db_type.value)


@router.post("/execute", response_model=QueryExecuteResponse)
async def execute(
    body: QueryExecuteRequest,
    request: Request,
    sm: SessionManager = Depends(get_session_manager),
):
    """Execute a confirmed query against the session-scoped database."""
    session = sm.get_session(body.session_id)

    pg = request.app.state.pg
    mongo = request.app.state.mongo

    start = time.perf_counter()

    if session.db_type == DBType.POSTGRESQL:
        result = await _execute_pg(pg, session.id, body.query)
    else:
        result = await _execute_mongo(mongo, session.id, body.query)

    elapsed_ms = (time.perf_counter() - start) * 1000

    # Store in conversation history (the executed query, possibly user-edited)
    if body.question:
        session.conversation_history.append({"role": "user", "content": body.question})
        session.conversation_history.append({"role": "assistant", "content": body.query})

    return QueryExecuteResponse(
        columns=result["columns"],
        rows=result["rows"],
        row_count=result["row_count"],
        execution_time_ms=round(elapsed_ms, 2),
        affected_rows=result.get("affected_rows"),
    )


async def _execute_pg(pg, session_id: str, query: str) -> dict:
    """Execute a SQL query against the session PG schema."""
    q_upper = query.strip().upper()

    if q_upper.startswith("SELECT") or q_upper.startswith("WITH"):
        rows = await pg.execute_query(session_id, query)
        columns = list(rows[0].keys()) if rows else []
        return {
            "columns": columns,
            "rows": rows,
            "row_count": len(rows),
        }
    else:
        affected = await pg.execute_write(session_id, query)
        return {
            "columns": [],
            "rows": [],
            "row_count": 0,
            "affected_rows": affected,
        }


async def _execute_mongo(mongo, session_id: str, query_str: str) -> dict:
    """Execute a MongoDB operation against the session collections."""
    try:
        op = json.loads(query_str)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid MongoDB query JSON: {e}")

    operation = op.get("operation", "find")
    collection = op.get("collection", "")

    if operation == "find":
        docs = await mongo.execute_find(session_id, collection, op.get("query", {}))
        columns = list(docs[0].keys()) if docs else []
        return {
            "columns": columns,
            "rows": docs,
            "row_count": len(docs),
        }
    elif operation == "aggregate":
        pipeline = op.get("pipeline", [])
        docs = await mongo.execute_query(session_id, collection, pipeline)
        rows = []
        for doc in docs:
            row = {}
            for k, v in doc.items():
                row[k] = str(v) if k == "_id" else v
            rows.append(row)
        columns = list(rows[0].keys()) if rows else []
        return {
            "columns": columns,
            "rows": rows,
            "row_count": len(rows),
        }
    elif operation in ("insertOne", "insertMany"):
        doc = op.get("document", op.get("documents", []))
        if operation == "insertOne":
            affected = await mongo.execute_insert(session_id, collection, [doc])
        else:
            affected = await mongo.execute_insert(session_id, collection, doc)
        return {
            "columns": [],
            "rows": [],
            "row_count": 0,
            "affected_rows": affected,
        }
    elif operation in ("deleteOne", "deleteMany"):
        q = op.get("query", {})
        affected = await mongo.execute_delete(session_id, collection, q)
        return {
            "columns": [],
            "rows": [],
            "row_count": 0,
            "affected_rows": affected,
        }
    elif operation in ("updateOne", "updateMany"):
        q = op.get("query", {})
        update = op.get("update", {})
        col_name = f"sess_{session_id}_{collection}"
        if operation == "updateOne":
            result = await mongo.db[col_name].update_one(q, update)
        else:
            result = await mongo.db[col_name].update_many(q, update)
        return {
            "columns": [],
            "rows": [],
            "row_count": 0,
            "affected_rows": result.modified_count,
        }
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported operation: {operation}")
