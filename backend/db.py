from __future__ import annotations

import os
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase


class MongoDB:
    def __init__(self) -> None:
        self._client: Optional[AsyncIOMotorClient] = None
        self._db: Optional[AsyncIOMotorDatabase] = None

    @property
    def db(self) -> AsyncIOMotorDatabase:
        if self._db is None:
            raise RuntimeError("MongoDB not initialized. Did you call connect()?")
        return self._db

    async def connect(self) -> None:
        uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        dbname = os.getenv("MONGODB_DB", "ukrics")
        self._client = AsyncIOMotorClient(uri)
        self._db = self._client[dbname]
        # Create indexes
        await self._db["users"].create_index("email", unique=True)
        await self._db["scans"].create_index([("user_id", 1), ("created_at", -1)])

    async def disconnect(self) -> None:
        if self._client:
            self._client.close()
        self._client = None
        self._db = None

    async def ping(self) -> bool:
        if not self._client:
            return False
        try:
            await self._client.admin.command("ping")
            return True
        except Exception:
            return False


mongodb = MongoDB()
