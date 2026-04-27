import json
import logging
from typing import Any

import requests
from fastapi import APIRouter, HTTPException, Request

from ..config import settings
from ..db import db
from ..schemas import WhatsAppMessageIn
from ..utils import utc_now_iso

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])


def bot_reply(state: dict, message: str) -> tuple[str, dict]:
    msg = message.strip().lower()
    step = state.get("step", "start")

    if msg in ("reset", "restart", "menu"):
        return (
            "Namaste! Welcome to KaamNow.\n\n1️⃣ I need workers (kaam karwana hai)\n2️⃣ I am a worker (kaam chahiye)\n\nReply 1 or 2.",
            {"step": "intent"},
        )

    if step == "start":
        return (
            "Namaste! Welcome to KaamNow 🙏\n\n1️⃣ I need workers\n2️⃣ I am a worker looking for jobs\n\nReply 1 or 2.",
            {"step": "intent"},
        )

    if step == "intent":
        if msg == "1":
            return (
                "Great! What type of work?\n\n1. Farm work (खेत)\n2. Construction (निर्माण)\n3. Home services (सफाई/शिफ्टिंग)\n4. Other",
                {"step": "category"},
            )
        if msg == "2":
            return (
                "Welcome worker! Please register on KaamNow at /signup to start receiving job alerts. Reply 'menu' to restart.",
                {"step": "start"},
            )
        return ("Please reply 1 or 2.", state)

    if step == "category":
        cats = {
            "1": "Farm work",
            "2": "Construction",
            "3": "Home services",
            "4": "Other",
        }
        if msg in cats:
            return (
                f"Got it: {cats[msg]}.\n\nHow many workers do you need? (1-20)",
                {"step": "count", "category": cats[msg]},
            )
        return ("Please reply 1, 2, 3, or 4.", state)

    if step == "count":
        try:
            n = int(msg)
            if 1 <= n <= 20:
                return (
                    f"{n} workers noted.\n\nWhen do you need them?\n1. Today\n2. Tomorrow\n3. Day after",
                    {"step": "date", "count": n},
                )
        except ValueError:
            pass
        return ("Please send a number between 1 and 20.", state)

    if step == "date":
        labels = {"1": "Today", "2": "Tomorrow", "3": "Day after"}
        if msg in labels:
            return (
                "Which village or area? (Type village name)",
                {"step": "village", "when": labels[msg]},
            )
        return ("Reply 1, 2 or 3.", state)

    if step == "village":
        return (
            "✅ Found 3 workers near {v}.\n\nReply with numbers (e.g. '1,2') to book.".format(v=message.strip()),
            {"step": "select", "village": message.strip()},
        )

    if step == "select":
        return (
            f"🎉 Booking request sent! Workers will confirm within 15 minutes for your {state.get('category','job')} on {state.get('when','your selected day')} in {state.get('village','your village')}.\n\nReply 'menu' to start a new request.",
            {"step": "start"},
        )

    return ("Reply 'menu' to start over.", {"step": "start"})


def _format_gupshup_message(payload: Any) -> str:
    if isinstance(payload, dict):
        message = payload.get("message")
        if isinstance(message, dict):
            return (
                message.get("text")
                or message.get("payload")
                or message.get("caption")
                or message.get("body")
                or ""
            )
        if isinstance(message, str):
            return message

        direct_text = payload.get("text")
        if isinstance(direct_text, str):
            return direct_text

        direct_payload = payload.get("payload")
        if isinstance(direct_payload, str):
            return direct_payload
        if isinstance(direct_payload, dict):
            nested = direct_payload.get("message")
            if isinstance(nested, dict):
                return (
                    nested.get("text")
                    or nested.get("payload")
                    or nested.get("body")
                    or ""
                )

        direct_body = payload.get("body")
        if isinstance(direct_body, str):
            return direct_body

        return ""

    return str(payload)


def _extract_gupshup_incoming(body: dict) -> tuple[str, str]:
    src = body.get("src") or body.get("source") or body.get("from")
    sender = body.get("sender")
    if not src and isinstance(sender, dict):
        src = sender.get("phone") or sender.get("id")
    elif not src and sender:
        src = sender
    text = _format_gupshup_message(body)

    if not text and isinstance(body.get("message"), dict):
        text = (
            body["message"].get("text")
            or body["message"].get("payload")
            or body["message"].get("caption")
            or body["message"].get("body")
            or ""
        )

    if not text and isinstance(body.get("payload"), dict):
        payload = body["payload"]
        if isinstance(payload.get("message"), dict):
            text = (
                payload["message"].get("text")
                or payload["message"].get("payload")
                or payload["message"].get("body")
                or ""
            )

    if not src or not text:
        raise ValueError("Invalid Gupshup payload")
    return str(src), text


def _send_gupshup_text(destination: str, text: str) -> dict:
    if not settings.gupshup_api_url or not settings.gupshup_api_key or not settings.gupshup_source:
        raise RuntimeError("Gupshup settings are not configured")

    payload = {
        "channel": settings.gupshup_channel,
        "source": settings.gupshup_source,
        "destination": destination,
        "message": json.dumps({"type": "text", "text": text}),
    }

    if getattr(settings, "gupshup_app_id", None):
        payload["src.name"] = settings.gupshup_app_id

    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": settings.gupshup_api_key,
    }

    resp = requests.post(settings.gupshup_api_url, data=payload, headers=headers, timeout=10)
    resp.raise_for_status()

    try:
        return resp.json()
    except ValueError:
        return {"text": resp.text}


async def _save_bot_state(session_id: str, new_state: dict) -> None:
    await db.bot_sessions.update_one(
        {"session_id": session_id},
        {"$set": {"session_id": session_id, "state": new_state, "updated_at": utc_now_iso()}},
        upsert=True,
    )


def _create_session_id(source: str) -> str:
    id_value = source.strip()
    if id_value.startswith("+"):
        id_value = id_value[1:]
    return f"whatsapp-{id_value}"


@router.post("/message")
async def whatsapp_message(body: WhatsAppMessageIn):
    state_doc = await db.bot_sessions.find_one({"session_id": body.session_id})
    state = state_doc["state"] if state_doc else {"step": "start"}
    reply, new_state = bot_reply(state, body.message)
    await db.bot_sessions.update_one(
        {"session_id": body.session_id},
        {"$set": {"session_id": body.session_id, "state": new_state, "updated_at": utc_now_iso()}},
        upsert=True,
    )
    return {"reply": reply, "state": new_state}


@router.get("/gupshup")
async def gupshup_verify(
    mode: str | None = None,
    challenge: str | None = None,
    verify_token: str | None = None,
    hub_mode: str | None = None,
    hub_challenge: str | None = None,
    hub_verify_token: str | None = None,
):
    if not settings.gupshup_verify_token:
        raise HTTPException(status_code=404, detail="WhatsApp verification not configured")
    token = verify_token or hub_verify_token
    response_challenge = challenge or hub_challenge
    if token != settings.gupshup_verify_token:
        raise HTTPException(status_code=403, detail="Invalid verify token")
    return {"challenge": response_challenge}


@router.post("/gupshup")
async def gupshup_webhook(request: Request):
    if not settings.gupshup_api_url:
        raise HTTPException(status_code=503, detail="WhatsApp provider not configured")

    body = await request.json()
    try:
        source_phone, message_text = _extract_gupshup_incoming(body)
    except ValueError:
        raise HTTPException(status_code=400, detail="Unable to parse incoming WhatsApp payload")

    session_id = _create_session_id(source_phone)
    state_doc = await db.bot_sessions.find_one({"session_id": session_id})
    state = state_doc["state"] if state_doc else {"step": "start"}
    reply, new_state = bot_reply(state, message_text)
    await _save_bot_state(session_id, new_state)

    try:
        response = _send_gupshup_text(source_phone, reply)
        logger.info("Sent WhatsApp reply to %s", source_phone)
    except Exception as exc:
        logger.error("WhatsApp send failed: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to send WhatsApp reply")

    return {"status": "ok", "reply": reply, "provider_response": response}
