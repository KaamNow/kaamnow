from motor.motor_asyncio import AsyncIOMotorClient

from .config import settings

client = AsyncIOMotorClient(
    settings.mongo_url,
    tlsAllowInvalidCertificates=True,
    serverSelectionTimeoutMS=10000,
)
db = client[settings.db_name]


def close_client() -> None:
    client.close()
