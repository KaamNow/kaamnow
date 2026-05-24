import asyncio
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..db import db
from ..schemas import MessageIn, MessageOut
from ..security import chat_write_limit
from ..utils import utc_now_iso
from ..whatsapp_notify import _send as _wa_send

router = APIRouter(prefix="/api/chat", tags=["chat"])


async def _engagement_for_chat(engagement_id: str, user: dict) -> tuple[dict, str]:
    doc = await db.work_requests.find_one({"id": engagement_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Request not found")

    uid = user["id"]
    by_uid = doc.get("requested_by_user_id")
    to_uid = doc.get("requested_to_user_id")

    if uid == by_uid and to_uid:
        return doc, to_uid
    if uid == to_uid and by_uid:
        return doc, by_uid

    raise HTTPException(status_code=403, detail="You cannot open this chat")


@router.get("/{engagement_id}/messages", response_model=list[MessageOut])
async def messages(engagement_id: str, user: dict = Depends(get_current_user)):
    await _engagement_for_chat(engagement_id, user)
    now = utc_now_iso()
    await db.messages.update_many(
        {"work_request_id": engagement_id, "receiver_id": user["id"], "read": False},
        {"$set": {"read": True, "read_at": now}},
    )
    rows = (
        await db.messages.find({"work_request_id": engagement_id}, {"_id": 0})
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
    if engagement.get("status") not in ("accepted", "completed"):
        raise HTTPException(
            status_code=403, detail="Chat is only available after the request is accepted"
        )
    if not (body.text or body.image_url or body.voice_url):
        raise HTTPException(status_code=400, detail="Send a message, image, or voice note")
    now = utc_now_iso()
    message = {
        "id": str(uuid.uuid4()),
        "work_request_id": engagement_id,
        "sender_id": user["id"],
        "receiver_id": receiver_id,
        "text": body.text,
        "image_url": body.image_url,
        "voice_url": body.voice_url,
        "read": False,
        "read_at": None,
        "created_at": now,
    }
    is_first_message = await db.messages.count_documents({"work_request_id": engagement_id}) == 0
    await db.messages.insert_one(message)
    preview = body.text or ("Photo" if body.image_url else "Voice message")
    title = f"Message from {user.get('name', 'KaamNow user')}"

    # In-app notification — only create if no existing unread message notif for this chat
    has_unread = await db.notifications.find_one(
        {
            "user_id": receiver_id,
            "type": "new_message",
            "work_request_id": engagement["id"],
            "read": False,
        }
    )
    if not has_unread:
        await db.notifications.insert_one(
            {
                "id": str(uuid.uuid4()),
                "user_id": receiver_id,
                "title": title,
                "body": preview[:200],
                "type": "new_message",
                "work_request_id": engagement["id"],
                "read": False,
                "created_at": now,
            }
        )

    # First message → push + WhatsApp; subsequent → push only
    asyncio.create_task(
        _push_and_wa(receiver_id, title, preview[:200], engagement["id"], whatsapp=is_first_message)
    )

    message.pop("_id", None)
    return message


async def _push_and_wa(user_id: str, title: str, body: str, ref_id: str, whatsapp: bool = False):
    try:
        recipient = await db.users.find_one(
            {"id": user_id}, {"_id": 0, "push_token": 1, "phone_primary": 1}
        )
    except Exception:
        return
    push_token = (recipient or {}).get("push_token")
    if push_token and push_token.startswith("ExponentPushToken"):
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                await client.post(
                    "https://exp.host/--/api/v2/push/send",
                    json={
                        "to": push_token,
                        "title": title,
                        "body": body,
                        "data": {"ref_id": ref_id},
                    },
                    headers={"Accept": "application/json", "Content-Type": "application/json"},
                )
        except Exception:
            pass
    if whatsapp:
        phone = (recipient or {}).get("phone_primary")
        if phone:
            try:
                await asyncio.to_thread(_wa_send, phone, f"*{title}*\n{body}\n\n_KaamNow_")
            except Exception:
                pass


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
        {"work_request_id": engagement_id, "receiver_id": user["id"], "read": False},
        {"$set": {"read": True, "read_at": utc_now_iso()}},
    )
    return {"ok": True}
