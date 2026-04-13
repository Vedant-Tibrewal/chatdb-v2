"""PostgreSQL async connection pool and session schema management."""

import asyncpg

from app.core.config import settings


class PostgresDB:
    def __init__(self) -> None:
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        self._pool = await asyncpg.create_pool(
            host=settings.postgres_host,
            port=settings.postgres_port,
            user=settings.postgres_user,
            password=settings.postgres_password,
            database=settings.postgres_db,
            min_size=2,
            max_size=10,
        )
        # Recreate base schema fresh on every startup so type changes take effect
        async with self._pool.acquire() as conn:
            await conn.execute("DROP SCHEMA IF EXISTS base_data CASCADE")
            await conn.execute("CREATE SCHEMA base_data")

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()
            self._pool = None

    @property
    def pool(self) -> asyncpg.Pool:
        if self._pool is None:
            raise RuntimeError("PostgresDB not connected")
        return self._pool

    async def create_session_schema(
        self, session_id: str, table_filter: list[str] | None = None
    ) -> None:
        schema = f"s_{session_id}"
        async with self.pool.acquire() as conn:
            await conn.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema}"')
            # Clone tables from base_data into session schema
            tables = await conn.fetch(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'base_data'"
            )
            for row in tables:
                table = row["tablename"]
                if table_filter and table not in table_filter:
                    continue
                await conn.execute(
                    f'CREATE TABLE "{schema}"."{table}" '
                    f'(LIKE "base_data"."{table}" INCLUDING ALL)'
                )
                await conn.execute(
                    f'INSERT INTO "{schema}"."{table}" '
                    f'SELECT * FROM "base_data"."{table}"'
                )

    async def drop_session_schema(self, session_id: str) -> None:
        schema = f"s_{session_id}"
        async with self.pool.acquire() as conn:
            await conn.execute(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE')

    async def execute_query(self, session_id: str, query: str) -> list[dict]:
        schema = f"s_{session_id}"
        async with self.pool.acquire() as conn:
            await conn.execute(f'SET search_path TO "{schema}", public')
            rows = await conn.fetch(query)
            return [dict(r) for r in rows]

    async def execute_write(self, session_id: str, query: str) -> int:
        schema = f"s_{session_id}"
        async with self.pool.acquire() as conn:
            await conn.execute(f'SET search_path TO "{schema}", public')
            result = await conn.execute(query)
            # asyncpg returns e.g. "INSERT 0 5" or "DELETE 3"
            parts = result.split()
            if len(parts) >= 2 and parts[-1].isdigit():
                return int(parts[-1])
            return 0

    async def get_schema_info(self, session_id: str) -> list[dict]:
        schema = f"s_{session_id}"
        async with self.pool.acquire() as conn:
            tables = await conn.fetch(
                "SELECT tablename FROM pg_tables WHERE schemaname = $1", schema
            )
            result = []
            for row in tables:
                table = row["tablename"]
                columns = await conn.fetch(
                    """
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_schema = $1 AND table_name = $2
                    ORDER BY ordinal_position
                    """,
                    schema,
                    table,
                )
                count_row = await conn.fetchval(
                    f'SELECT COUNT(*) FROM "{schema}"."{table}"'
                )
                # Fetch sample rows to help LLM understand column content
                sample_rows = await conn.fetch(
                    f'SELECT * FROM "{schema}"."{table}" LIMIT 3'
                )
                sample_data = [dict(r) for r in sample_rows]
                result.append({
                    "name": table,
                    "columns": [
                        {
                            "name": c["column_name"],
                            "type": c["data_type"],
                            "nullable": c["is_nullable"] == "YES",
                        }
                        for c in columns
                    ],
                    "row_count": count_row,
                    "sample_rows": sample_data,
                })
            return result

    async def get_all_table_data(self, session_id: str) -> list[dict]:
        """Get schema info plus ALL rows for analytics computation."""
        schema = f"s_{session_id}"
        async with self.pool.acquire() as conn:
            tables = await conn.fetch(
                "SELECT tablename FROM pg_tables WHERE schemaname = $1", schema
            )
            result = []
            for row in tables:
                table = row["tablename"]
                columns = await conn.fetch(
                    """
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_schema = $1 AND table_name = $2
                    ORDER BY ordinal_position
                    """,
                    schema,
                    table,
                )
                count_row = await conn.fetchval(
                    f'SELECT COUNT(*) FROM "{schema}"."{table}"'
                )
                all_rows = await conn.fetch(
                    f'SELECT * FROM "{schema}"."{table}"'
                )
                result.append({
                    "name": table,
                    "columns": [
                        {
                            "name": c["column_name"],
                            "type": c["data_type"],
                            "nullable": c["is_nullable"] == "YES",
                        }
                        for c in columns
                    ],
                    "row_count": count_row,
                    "rows": [dict(r) for r in all_rows],
                })
            return result

    async def load_data(
        self, schema: str, table_name: str, columns: list[dict], rows: list[list]
    ) -> int:
        async with self.pool.acquire() as conn:
            # Build CREATE TABLE
            col_defs = []
            for col in columns:
                col_defs.append(f'"{col["name"]}" {col["pg_type"]}')
            create_sql = (
                f'CREATE TABLE IF NOT EXISTS "{schema}"."{table_name}" '
                f'({", ".join(col_defs)})'
            )
            await conn.execute(create_sql)

            # Bulk insert using copy
            col_names = [col["name"] for col in columns]
            await conn.copy_records_to_table(
                table_name,
                records=[tuple(r) for r in rows],
                columns=col_names,
                schema_name=schema,
            )
            return len(rows)
