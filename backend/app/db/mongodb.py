"""MongoDB async client and session collection management."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings


class MongoDB:
    def __init__(self) -> None:
        self._client: AsyncIOMotorClient | None = None
        self._db: AsyncIOMotorDatabase | None = None

    async def connect(self) -> None:
        self._client = AsyncIOMotorClient(
            host=settings.mongo_host,
            port=settings.mongo_port,
        )
        self._db = self._client[settings.mongo_db]
        # Verify connection
        await self._client.admin.command("ping")

    async def close(self) -> None:
        if self._client:
            self._client.close()
            self._client = None
            self._db = None

    @property
    def db(self) -> AsyncIOMotorDatabase:
        if self._db is None:
            raise RuntimeError("MongoDB not connected")
        return self._db

    def _base_collection(self, name: str) -> str:
        return f"base_{name}"

    def _session_collection(self, session_id: str, name: str) -> str:
        return f"sess_{session_id}_{name}"

    async def create_session_collections(self, session_id: str) -> None:
        # Find all base_ prefixed collections and clone them
        all_collections = await self.db.list_collection_names()
        base_collections = [c for c in all_collections if c.startswith("base_")]

        for base_col in base_collections:
            name = base_col[len("base_"):]  # strip "base_" prefix
            target = self._session_collection(session_id, name)
            # Copy docs from base to session collection
            cursor = self.db[base_col].find({}, {"_id": 0})
            docs = await cursor.to_list(length=None)
            if docs:
                await self.db[target].insert_many(docs)

    async def drop_session_collections(self, session_id: str) -> None:
        prefix = f"sess_{session_id}_"
        all_collections = await self.db.list_collection_names()
        for col in all_collections:
            if col.startswith(prefix):
                await self.db[col].drop()

    async def execute_query(self, session_id: str, collection: str, pipeline: list) -> list[dict]:
        col_name = self._session_collection(session_id, collection)
        cursor = self.db[col_name].aggregate(pipeline)
        return await cursor.to_list(length=1000)

    async def execute_find(self, session_id: str, collection: str, filter_doc: dict) -> list[dict]:
        col_name = self._session_collection(session_id, collection)
        cursor = self.db[col_name].find(filter_doc)
        docs = await cursor.to_list(length=1000)
        # Convert ObjectId to string for JSON serialization
        for doc in docs:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
        return docs

    async def execute_insert(self, session_id: str, collection: str, docs: list[dict]) -> int:
        col_name = self._session_collection(session_id, collection)
        result = await self.db[col_name].insert_many(docs)
        return len(result.inserted_ids)

    async def execute_delete(self, session_id: str, collection: str, filter_doc: dict) -> int:
        col_name = self._session_collection(session_id, collection)
        result = await self.db[col_name].delete_many(filter_doc)
        return result.deleted_count

    async def get_schema_info(self, session_id: str) -> list[dict]:
        prefix = f"sess_{session_id}_"
        all_collections = await self.db.list_collection_names()
        session_collections = [c for c in all_collections if c.startswith(prefix)]

        result = []
        for col_name in session_collections:
            name = col_name[len(prefix):]
            count = await self.db[col_name].count_documents({})
            # Sample a doc to infer schema
            sample = await self.db[col_name].find_one()
            columns = []
            if sample:
                for key, value in sample.items():
                    if key == "_id":
                        continue
                    columns.append({
                        "name": key,
                        "type": type(value).__name__,
                        "nullable": True,
                    })
            result.append({
                "name": name,
                "columns": columns,
                "row_count": count,
            })
        return result

    async def load_data(self, collection_name: str, docs: list[dict]) -> int:
        if not docs:
            return 0
        await self.db[collection_name].insert_many(docs)
        return len(docs)
