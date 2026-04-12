import csv
import io
import json
import logging
import math

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File

from app.api.deps import get_session_manager
from app.core.security import sanitize_identifier
from app.db.session import SessionManager
from app.models.session import DBType

router = APIRouter()
logger = logging.getLogger(__name__)

# Map inferred types to PostgreSQL types
_PG_TYPE_MAP = {
    "int": "BIGINT",
    "float": "DOUBLE PRECISION",
    "str": "TEXT",
    "bool": "BOOLEAN",
}


def _infer_type(value: str) -> str:
    if value == "":
        return "str"
    try:
        int(value)
        return "int"
    except ValueError:
        pass
    try:
        float(value)
        return "float"
    except ValueError:
        pass
    if value.lower() in ("true", "false"):
        return "bool"
    return "str"


def _cast_value(value: str, dtype: str):
    if value == "":
        return None
    if dtype == "int":
        return int(value)
    if dtype == "float":
        v = float(value)
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    if dtype == "bool":
        return value.lower() == "true"
    return value


def _parse_csv_content(content: str) -> tuple[list[dict], list[list], list[str]]:
    """Parse CSV string, infer column types, return (columns_meta, rows, col_names)."""
    reader = csv.reader(io.StringIO(content))
    headers = [h.strip().lower().replace(" ", "_") for h in next(reader)]
    raw_rows = list(reader)

    if not raw_rows:
        return [], [], headers

    sample = raw_rows[:min(100, len(raw_rows))]
    col_types = ["str"] * len(headers)
    for col_idx in range(len(headers)):
        type_votes: dict[str, int] = {}
        for row in sample:
            if col_idx < len(row) and row[col_idx].strip():
                t = _infer_type(row[col_idx].strip())
                type_votes[t] = type_votes.get(t, 0) + 1
        if type_votes:
            col_types[col_idx] = max(type_votes, key=type_votes.get)

    columns = [
        {"name": headers[i], "type": col_types[i], "pg_type": _PG_TYPE_MAP[col_types[i]]}
        for i in range(len(headers))
    ]

    rows = []
    for raw_row in raw_rows:
        row = []
        for i, col in enumerate(columns):
            val = raw_row[i].strip() if i < len(raw_row) else ""
            row.append(_cast_value(val, col["type"]))
        rows.append(row)

    return columns, rows, headers


def _parse_json_content(content: str) -> tuple[list[dict], list[list], list[str]]:
    """Parse JSON array of objects, infer column types."""
    data = json.loads(content)
    if not isinstance(data, list) or not data:
        raise ValueError("JSON must be a non-empty array of objects")
    if not isinstance(data[0], dict):
        raise ValueError("JSON array must contain objects")

    headers = list(data[0].keys())
    headers = [h.strip().lower().replace(" ", "_") for h in headers]

    col_types = ["str"] * len(headers)
    for col_idx, key in enumerate(data[0].keys()):
        type_votes: dict[str, int] = {}
        for doc in data[:100]:
            val = doc.get(key)
            if val is None:
                continue
            if isinstance(val, bool):
                type_votes["bool"] = type_votes.get("bool", 0) + 1
            elif isinstance(val, int):
                type_votes["int"] = type_votes.get("int", 0) + 1
            elif isinstance(val, float):
                type_votes["float"] = type_votes.get("float", 0) + 1
            else:
                type_votes["str"] = type_votes.get("str", 0) + 1
        if type_votes:
            col_types[col_idx] = max(type_votes, key=type_votes.get)

    columns = [
        {"name": headers[i], "type": col_types[i], "pg_type": _PG_TYPE_MAP[col_types[i]]}
        for i in range(len(headers))
    ]

    original_keys = list(data[0].keys())
    rows = []
    for doc in data:
        row = []
        for i, key in enumerate(original_keys):
            val = doc.get(key)
            if val is None:
                row.append(None)
            elif isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
                row.append(None)
            else:
                row.append(val)
        rows.append(row)

    return columns, rows, headers


@router.post("/{session_id}")
async def upload_dataset(
    session_id: str,
    file: UploadFile = File(...),
    request: Request = None,
    sm: SessionManager = Depends(get_session_manager),
):
    """Upload a CSV or JSON file to create a table/collection in session scope."""
    session = sm.get_session(session_id)

    # Validate file type
    filename = file.filename or "upload"
    if not filename.lower().endswith((".csv", ".json")):
        raise HTTPException(status_code=400, detail="Only CSV and JSON files are supported")

    # Read file content
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded")

    # Derive table name from filename
    table_name = filename.rsplit(".", 1)[0].strip().lower().replace(" ", "_").replace("-", "_")
    try:
        table_name = sanitize_identifier(table_name)
    except ValueError:
        table_name = "uploaded_data"

    # Parse content
    try:
        if filename.lower().endswith(".csv"):
            columns, rows, headers = _parse_csv_content(text)
        else:
            columns, rows, headers = _parse_json_content(text)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {e}")

    if not rows:
        raise HTTPException(status_code=400, detail="File contains no data rows")

    pg = request.app.state.pg
    mongo = request.app.state.mongo

    if session.db_type == DBType.POSTGRESQL:
        schema = f"s_{session_id}"
        # Drop existing table if any
        async with pg.pool.acquire() as conn:
            await conn.execute(f'DROP TABLE IF EXISTS "{schema}"."{table_name}"')
        await pg.load_data(schema, table_name, columns, rows)
        logger.info("Uploaded %d rows into PG %s.%s", len(rows), schema, table_name)
    else:
        col_name = mongo._session_collection(session_id, table_name)
        await mongo.db[col_name].drop()
        col_names = [c["name"] for c in columns]
        docs = []
        for row in rows:
            doc = {col_names[i]: row[i] for i in range(len(col_names))}
            docs.append(doc)
        await mongo.load_data(col_name, docs)
        logger.info("Uploaded %d docs into Mongo %s", len(docs), col_name)

    return {
        "table_name": table_name,
        "columns": [{"name": c["name"], "type": c["type"]} for c in columns],
        "row_count": len(rows),
    }
