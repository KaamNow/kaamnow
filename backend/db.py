import certifi
from motor.motor_asyncio import AsyncIOMotorClient

from .config import settings

client = AsyncIOMotorClient(settings.mongo_url, tlsCAFile=certifi.where())
db = client[settings.db_name]

messages = db["messages"]
reports = db["reports"]
payments = db["payments"]
wallet_transactions = db["wallet_transactions"]
worker_waitlist = db["worker_waitlist"]
faqs = db["faqs"]
legal_docs = db["legal_docs"]


def close_client() -> None:
    client.close()
