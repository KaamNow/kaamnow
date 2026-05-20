import uuid

from fastapi import APIRouter, Depends

from ..auth import get_current_user
from ..db import db
from ..utils import utc_now_iso

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


async def create_notification(
    user_id: str, title: str, body: str, kind: str, ref_id: str = None
) -> None:
    """Insert a notification for a user. Non-raising — never blocks core flows."""
    try:
        await db.notifications.insert_one(
            {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "title": title,
                "body": body,
                "kind": kind,  # "booking_request" | "booking_accepted" | "booking_rejected" | "interest_withdrawn"
                "ref_id": ref_id,  # engagement_id or job_id
                "read": False,
                "created_at": utc_now_iso(),
            }
        )
    except Exception:
        pass


@router.get("")
@router.get("/mine")
async def my_notifications(user: dict = Depends(get_current_user)):
    notes = (
        await db.notifications.find({"user_id": user["id"]}, {"_id": 0})
        .sort("created_at", -1)
        .limit(50)
        .to_list(50)
    )
    return {"items": notes, "total": len(notes)}


@router.get("/mine/unread-count")
async def unread_count(user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"count": count}


@router.post("/{notification_id}/read")
async def mark_read(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]}, {"$set": {"read": True}}
    )
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["id"], "read": False}, {"$set": {"read": True}}
    )
    return {"ok": True}
