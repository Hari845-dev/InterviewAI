from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config.settings import get_settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    global _client, _db
    settings = get_settings()
    _client = AsyncIOMotorClient(
        settings.mongodb_uri,
        maxPoolSize=50,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=20000,
    )
    _db = _client[settings.database_name]


def _initialize_db_if_needed() -> AsyncIOMotorDatabase:
    global _client, _db
    if _db is not None:
        return _db

    settings = get_settings()
    _client = AsyncIOMotorClient(
        settings.mongodb_uri,
        maxPoolSize=50,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=20000,
    )
    _db = _client[settings.database_name]
    return _db


async def close_db() -> None:
    global _client, _db
    if _client:
        _client.close()
    _client = None
    _db = None


def get_db() -> AsyncIOMotorDatabase:
    return _initialize_db_if_needed()


async def ping_db() -> bool:
    try:
        db = get_db()
        await db.command("ping")
        return True
    except Exception:
        return False
