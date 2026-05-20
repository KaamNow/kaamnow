import uuid

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user, is_worker
from ..db import db
from ..engagements import _notify
from ..schemas import MessageIn, MessageOut
from ..security import chat_write_limit
from ..utils import utc_now_iso

router = APIRouter(prefix="/api/chat", tags=["chat"])


async def _engagement_for_chat(engagement_id: str, user: dict) -> tuple[dict, str]:
    engagement = await db.engagements.find_one({"id": engagement_id}, {"_id": 0})
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")
    if engagement.get("customer_id") == user["id"]:
        worker = await db.workers.find_one({"id": engagement["worker_id"]}, {"_id": 0})
        if not worker or not worker.get("user_id"):
            raise HTTPException(status_code=404, detail="Worker not found")
        return engagement, worker["user_id"]
    if is_worker(user):
        worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
        if worker and worker.get("id") == engagement.get("worker_id"):
            return engagement, engagement["customer_id"]
    raise HTTPException(status_code=403, detail="You cannot open this chat")


@router.get("/{engagement_id}/messages", response_model=list[MessageOut])
async def messages(engagement_id: str, user: dict = Depends(get_current_user)):
    await _engagement_for_chat(engagement_id, user)
    now = utc_now_iso()
    await db.messages.update_many(
        {"engagement_id": engagement_id, "receiver_id": user["id"], "read": False},
        {"$set": {"read": True, "read_at": now}},
    )
    rows = (
        await db.messages.find({"engagement_id": engagement_id}, {"_id": 0})
        .sort("created_at", -1)
        .limit(50)
        .to_list(50)
    )
    return list(reversed(rows))


@router.post("/{engagement_id}/send", response_model=MessageOut)
async def send_message(
    engagement_id: str,
    body: MessageIn,
    user: dict = Depends(get_current_user),
    _: None = Depends(chat_write_limit),
):
    engagement, receiver_id = await _engagement_for_chat(engagement_id, user)
    if not (body.text or body.image_url or body.voice_url):
        raise HTTPException(status_code=400, detail="Send a message, image, or voice note")
    now = utc_now_iso()
    message = {
        "id": str(uuid.uuid4()),
        "engagement_id": engagement_id,
        "sender_id": user["id"],
        "receiver_id": receiver_id,
        "text": body.text,
        "image_url": body.image_url,
        "voice_url": body.voice_url,
        "read": False,
        "read_at": None,
        "created_at": now,
    }
    await db.messages.insert_one(message)
    preview = body.text or ("Photo" if body.image_url else "Voice message")
    await _notify(
        receiver_id,
        f"Message from {user.get('name', 'KaamNow user')}",
        preview[:200],
        "new_message",
        engagement["id"],
    )
    message.pop("_id", None)
    return message


@router.get("/unread-count")
async def unread_count(user: dict = Depends(get_current_user)):
    count = await db.messages.count_documents({"receiver_id": user["id"], "read": False})
    return {"count": count}


@router.post("/{engagement_id}/read-all")
async def read_all(
    engagement_id: str,
    user: dict = Depends(get_current_user),
    _: None = Depends(chat_write_limit),
):
    await _engagement_for_chat(engagement_id, user)
    await db.messages.update_many(
        {"engagement_id": engagement_id, "receiver_id": user["id"], "read": False},
        {"$set": {"read": True, "read_at": utc_now_iso()}},
    )
    return {"ok": True}
