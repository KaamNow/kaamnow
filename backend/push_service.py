"""
Expo Push Notification Service — free tier, no API key required.
Sends to ExponentPushToken[...] tokens via Expo's push gateway.
"""

import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def is_expo_token(token: str) -> bool:
    return isinstance(token, str) and token.startswith("ExponentPushToken[")


async def send_push(
    token: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> bool:
    """
    Send a single Expo push notification. Returns True on success.
    Never raises — notifications must never block core flows.
    """
    if not token or not is_expo_token(token):
        return False

    payload = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "data": data or {},
        "priority": "high",
        "_contentAvailable": True,
    }

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.post(
                EXPO_PUSH_URL,
                json=payload,
                headers={"Accept": "application/json", "Content-Type": "application/json"},
            )
        result = resp.json() if resp.content else {}
        ticket = (result.get("data") or [{}])[0] if isinstance(result.get("data"), list) else result.get("data", {})
        if ticket.get("status") == "error":
            logger.warning(f"[Push] Token error for {token[:30]}: {ticket.get('message')}")
            return False
        logger.info(f"[Push] Sent to {token[:30]}… status={resp.status_code}")
        return True
    except Exception as exc:
        logger.error(f"[Push] Failed: {exc}")
        return False
