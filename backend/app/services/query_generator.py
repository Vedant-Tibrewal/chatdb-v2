"""NL → query generation — prompt construction and LLM call."""

import logging
import re

from app.core.llm import llm_completion
from app.models.session import DBType

logger = logging.getLogger(__name__)

MAX_HISTORY_TURNS = 10

SYSTEM_PROMPT_SQL = """\
You are a PostgreSQL query generator. Given the database schema below \
and the user's question, generate a single valid PostgreSQL query.

DATABASE SCHEMA:
{schema}

RULES:
- Return ONLY the SQL query, no explanations, no markdown fences.
- Use only the tables and columns listed in the schema above.
- For read questions, use SELECT. For insert requests, use INSERT. \
For delete requests, use DELETE. For update requests, use UPDATE.
- Do NOT use DROP, TRUNCATE, ALTER, CREATE, or any DDL statements.
- Use double quotes for identifiers only if needed (mixed case or reserved words).
- Return a single statement only — no semicolons at the end.
- If the user's request is ambiguous, make a reasonable assumption and generate the query.
"""

SYSTEM_PROMPT_MONGO = """\
You are a MongoDB query generator. Given the collection schema below \
and the user's question, generate a valid MongoDB operation.

COLLECTION SCHEMA:
{schema}

RULES:
- Return ONLY a JSON object with the operation details, no explanations, no markdown fences.
- Format: {{"operation": "<find|aggregate|insertOne|insertMany|deleteOne|deleteMany|\
updateOne|updateMany>", "collection": "<name>", "query": <query_doc>, \
"pipeline": <agg_pipeline_if_aggregate>, "update": <update_doc_if_update>, \
"document": <doc_if_insert>}}
- Include only the fields relevant to the operation type.
- Use only the collections and fields listed in the schema above.
- Do NOT use $where, $function, $accumulator, or eval-style operators.
- If the user's request is ambiguous, make a reasonable assumption and generate the query.
"""


def _format_schema_for_prompt(tables: list[dict], db_type: DBType) -> str:
    """Format schema metadata into a readable string for the LLM prompt."""
    lines = []
    for table in tables:
        entity = "Collection" if db_type == DBType.MONGODB else "Table"
        lines.append(f"{entity}: {table['name']} ({table.get('row_count', '?')} rows)")
        for col in table.get("columns", []):
            nullable = ", nullable" if col.get("nullable") else ""
            lines.append(f"  - {col['name']}: {col['type']}{nullable}")
        lines.append("")
    return "\n".join(lines)


def _build_messages(
    question: str,
    schema_info: list[dict],
    db_type: DBType,
    conversation_history: list[dict],
) -> list[dict]:
    """Build the message list for the LLM call."""
    schema_text = _format_schema_for_prompt(schema_info, db_type)

    if db_type == DBType.POSTGRESQL:
        system_content = SYSTEM_PROMPT_SQL.format(schema=schema_text)
    else:
        system_content = SYSTEM_PROMPT_MONGO.format(schema=schema_text)

    messages = [{"role": "system", "content": system_content}]

    # Add recent conversation history
    recent = conversation_history[-MAX_HISTORY_TURNS * 2:]
    messages.extend(recent)

    messages.append({"role": "user", "content": question})
    return messages


def _extract_query(llm_response: str, db_type: DBType) -> str:
    """Extract the query from LLM response, stripping markdown fences if present."""
    text = llm_response.strip()

    # Strip markdown code fences
    fence_match = re.search(r"```(?:sql|json|javascript|mongo)?\s*\n?(.*?)```", text, re.DOTALL)
    if fence_match:
        text = fence_match.group(1).strip()

    # Remove trailing semicolons for SQL
    if db_type == DBType.POSTGRESQL and text.endswith(";"):
        text = text[:-1].strip()

    return text


async def generate_query(
    question: str,
    schema_info: list[dict],
    db_type: DBType,
    model: str,
    conversation_history: list[dict],
) -> str:
    """Generate a database query from a natural language question."""
    messages = _build_messages(question, schema_info, db_type, conversation_history)
    llm_response = await llm_completion(messages=messages, model=model)
    query = _extract_query(llm_response, db_type)
    logger.info("Generated query for '%s': %s", question[:50], query[:100])
    return query
