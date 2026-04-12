"""Schema metadata extraction — table names, columns, types, row counts."""

from app.db.mongodb import MongoDB
from app.db.postgres import PostgresDB
from app.models.session import DBType


async def get_schema(
    session_id: str, db_type: DBType, pg: PostgresDB, mongo: MongoDB
) -> list[dict]:
    if db_type == DBType.POSTGRESQL:
        return await pg.get_schema_info(session_id)
    else:
        return await mongo.get_schema_info(session_id)
