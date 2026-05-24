import uuid

from fastapi import HTTPException

from .db import db
from .utils import utc_now_iso


async def _notify(
    user_id: str, title: str, body: str, kind: str = "notification", ref_id: str = None
):
    if not user_id:
        return
    await db.notifications.insert_one(
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": title,
            "body": body,
            "kind": kind,
            "ref_id": ref_id,
            "read": False,
            "created_at": utc_now_iso(),
        }
    )


async def cancel_engagement(*args, **kwargs):
    raise HTTPException(status_code=410, detail="This legacy WhatsApp path is disabled")


async def create_engagement_request(*args, **kwargs):
    raise HTTPException(status_code=410, detail="This legacy WhatsApp path is disabled")
