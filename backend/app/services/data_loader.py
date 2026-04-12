"""CSV/JSON upload — schema inference and data loading into base schemas."""

import csv
import json
import logging
import math
from pathlib import Path

from app.core.config import settings
from app.db.mongodb import MongoDB
from app.db.postgres import PostgresDB

logger = logging.getLogger(__name__)

# Map Python/pandas types to PostgreSQL types
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
        return float(value)
    if dtype == "bool":
        return value.lower() == "true"
    return value


def _clean_float(value):
    """Convert NaN/Inf floats to None for DB compatibility."""
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    return value


def _parse_csv(filepath: Path) -> tuple[list[dict], list[list], list[str]]:
    """Parse CSV, infer column types, return (columns_meta, rows, col_names)."""
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        headers = [h.strip().lower().replace(" ", "_") for h in next(reader)]
        raw_rows = list(reader)

    if not raw_rows:
        return [], [], headers

    # Infer types from first 100 rows
    sample = raw_rows[: min(100, len(raw_rows))]
    col_types = ["str"] * len(headers)
    for col_idx in range(len(headers)):
        type_votes = {}
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
            casted = _cast_value(val, col["type"])
            casted = _clean_float(casted)
            row.append(casted)
        rows.append(row)

    return columns, rows, headers


async def load_base_datasets(pg: PostgresDB, mongo: MongoDB) -> None:
    """Load all CSV files from datasets/ subdirectories into base PG schema and Mongo."""
    dataset_path = Path(settings.base_dataset_path)
    if not dataset_path.exists():
        logger.warning("Dataset path %s does not exist, skipping base data load", dataset_path)
        return

    csv_files = sorted(dataset_path.rglob("*.csv"))
    if not csv_files:
        logger.info("No CSV files found in %s", dataset_path)
        return

    for csv_file in csv_files:
        table_name = csv_file.stem.lower()
        logger.info("Loading base dataset: %s from %s", table_name, csv_file)

        columns, rows, _headers = _parse_csv(csv_file)
        if not rows:
            logger.warning("Skipping empty CSV: %s", csv_file)
            continue

        # Load into PostgreSQL base_data schema
        try:
            await pg.load_data("base_data", table_name, columns, rows)
            logger.info("PG: loaded %d rows into base_data.%s", len(rows), table_name)
        except Exception as e:
            logger.error("PG load failed for %s: %s", table_name, e)

        # Load into MongoDB base_ collection
        try:
            col_names = [c["name"] for c in columns]
            docs = []
            for row in rows:
                doc = {}
                for i, col_name in enumerate(col_names):
                    doc[col_name] = row[i]
                docs.append(doc)
            base_col = mongo._base_collection(table_name)
            # Drop existing to avoid duplicates on restart
            await mongo.db[base_col].drop()
            await mongo.load_data(base_col, docs)
            logger.info("Mongo: loaded %d docs into %s", len(docs), base_col)
        except Exception as e:
            logger.error("Mongo load failed for %s: %s", table_name, e)
