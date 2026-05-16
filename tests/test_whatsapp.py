import asyncio
import json

import pytest

from backend.routers import whatsapp
from backend.schemas import WhatsAppMessageIn


class DummyRequest:
    def __init__(self, body):
        self._body = body

    async def json(self):
        return self._body


class DummyCollection:
    def __init__(self):
        self.storage = {}

    async def find_one(self, query):
        return self.storage.get(query.get("session_id"))

    async def update_one(self, query, update, upsert=False):
        self.storage[query["session_id"]] = {
            "session_id": query["session_id"],
            "state": update["$set"]["state"],
        }


class DummyUsers:
    async def find_one(self, *args, **kwargs):
        return None

    async def update_one(self, *args, **kwargs):
        return None


class DummyResponse:
    def __init__(self, payload, status_code=200, text=None, fail=False):
        self._payload = payload
        self.status_code = status_code
        self.text = text if text is not None else json.dumps(payload)
        self.fail = fail

    def raise_for_status(self):
        if self.fail or self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self._payload


@pytest.mark.parametrize(
    "body, expected_text",
    [
        ({"src": "919876543210", "message": {"text": "1"}}, "1"),
        ({"source": "919876543210", "message": {"type": "text", "text": "2"}}, "2"),
        ({"sender": {"phone": "919876543210"}, "payload": {"message": {"text": "menu"}}}, "menu"),
        ({"source": "919876543210", "message": {"type": "text", "payload": "menu"}}, "menu"),
        ({"source": "919876543210", "text": "hello"}, "hello"),
        (
            {
                "type": "message",
                "payload": {
                    "source": "919876543210",
                    "type": "quick_reply",
                    "payload": {"postbackText": "CUSTOMER", "text": "Mujhe worker chahiye"},
                },
            },
            "CUSTOMER",
        ),
        (
            {
                "type": "message",
                "payload": {
                    "source": "919876543210",
                    "type": "button_reply",
                    "payload": {"id": "CHANGE_PINCODE", "title": "Change Pincode"},
                },
            },
            "CHANGE_PINCODE",
        ),
    ],
)
def test_extract_gupshup_incoming(body, expected_text):
    source, text = whatsapp._extract_gupshup_incoming(body)
    assert source == "919876543210"
    assert text == expected_text


def test_send_gupshup_text_uses_form_encoding(monkeypatch):
    captured = {}

    def fake_post(url, data=None, headers=None, timeout=None):
        captured["url"] = url
        captured["data"] = data
        captured["headers"] = headers
        return DummyResponse({"status": "ok"})

    monkeypatch.setattr(whatsapp.requests, "post", fake_post)
    monkeypatch.setattr(whatsapp.settings, "gupshup_api_url", "https://api.gupshup.io/wa/api/v1/msg")
    monkeypatch.setattr(whatsapp.settings, "gupshup_api_key", "fake-key")
    monkeypatch.setattr(whatsapp.settings, "gupshup_source", "917834811114")

    response = whatsapp._send_gupshup_text("919876543210", "Hello from KaamNow")

    assert response == {"status": "ok"}
    assert captured["url"] == "https://api.gupshup.io/wa/api/v1/msg"
    assert captured["headers"]["Content-Type"] == "application/x-www-form-urlencoded"
    assert captured["headers"]["apikey"] == "fake-key"
    assert captured["data"]["channel"] == "whatsapp"
    assert captured["data"]["source"] == "917834811114"
    assert captured["data"]["destination"] == "919876543210"
    assert captured["data"]["message"] == json.dumps({"type": "text", "text": "Hello from KaamNow"})


def test_send_gupshup_buttons_uses_quick_reply_payload(monkeypatch):
    captured = {}

    def fake_post(url, data=None, headers=None, timeout=None):
        captured["url"] = url
        captured["data"] = data
        captured["headers"] = headers
        return DummyResponse({"status": "submitted", "messageId": "msg-1"})

    monkeypatch.setattr(whatsapp.requests, "post", fake_post)
    monkeypatch.setattr(whatsapp.settings, "gupshup_api_url", "https://api.gupshup.io/wa/api/v1/msg")
    monkeypatch.setattr(whatsapp.settings, "gupshup_api_key", "fake-key")
    monkeypatch.setattr(whatsapp.settings, "gupshup_source", "917834811114")

    response = whatsapp._send_gupshup_buttons(
        "9876543210",
        "Choose one",
        [{"id": "CHANGE_PINCODE", "title": "Change Pincode"}, {"id": "HELP", "title": "Help"}],
    )

    message = json.loads(captured["data"]["message"])
    assert response["kind"] == "reply_buttons"
    assert response["fallback"] is False
    assert message["type"] == "quick_reply"
    assert message["content"]["text"] == "Choose one"
    assert message["options"][0]["postbackText"] == "CHANGE_PINCODE"
    assert captured["data"]["destination"] == "919876543210"


def test_send_gupshup_buttons_fallback_logs_clean_text(monkeypatch):
    posts = []

    def fake_post(url, data=None, headers=None, timeout=None):
        posts.append(data)
        if len(posts) == 1:
            return DummyResponse({"status": "error"}, status_code=400, fail=True)
        return DummyResponse({"status": "sent"})

    monkeypatch.setattr(whatsapp.requests, "post", fake_post)
    monkeypatch.setattr(whatsapp.settings, "gupshup_api_url", "https://api.gupshup.io/wa/api/v1/msg")
    monkeypatch.setattr(whatsapp.settings, "gupshup_api_key", "fake-key")
    monkeypatch.setattr(whatsapp.settings, "gupshup_source", "917834811114")

    response = whatsapp._send_gupshup_buttons(
        "919876543210",
        "Choose one",
        [{"id": "MORE", "title": "More"}, {"id": "HELP", "title": "Help"}],
    )

    fallback_message = json.loads(posts[1]["message"])
    assert response["fallback"] is True
    assert fallback_message["type"] == "text"
    assert fallback_message["text"] == "Choose one\n\nReply: MORE, HELP"


def test_gupshup_webhook_route(monkeypatch):
    dummy_collection = DummyCollection()
    monkeypatch.setattr(whatsapp.db, "bot_sessions", dummy_collection)
    monkeypatch.setattr(whatsapp.db, "users", DummyUsers())
    monkeypatch.setattr(whatsapp, "_send_gupshup_text", lambda destination, text: {"status": "sent", "destination": destination, "text": text})
    monkeypatch.setattr(whatsapp, "_send_gupshup_buttons", lambda destination, text, buttons: {"status": "sent", "destination": destination, "text": text, "buttons": buttons})
    monkeypatch.setattr(whatsapp.settings, "gupshup_api_url", "https://api.gupshup.io/wa/api/v1/msg")

    request = DummyRequest({"src": "919876543210", "message": {"text": "1"}})
    response = asyncio.run(whatsapp.gupshup_webhook(request))

    assert response["status"] == "ok"
    assert "reply" in response
    assert response["provider_response"]["status"] == "sent"
    assert response["provider_response"]["destination"] == "919876543210"


def test_whatsapp_message_route_updates_state(monkeypatch):
    dummy_collection = DummyCollection()
    monkeypatch.setattr(whatsapp.db, "bot_sessions", dummy_collection)

    body = WhatsAppMessageIn(session_id="test-session", message="hi")
    response = asyncio.run(whatsapp.whatsapp_message(body))

    assert response["state"]["step"] == "wa_ob_role"
    assert "reply" in response
    assert response["reply"].lower().startswith("namaste")
    assert "CUSTOMER" in response["reply"]
    assert [button["id"] for button in response["buttons"]] == ["CUSTOMER", "WORKER", "HELP"]


def test_change_pincode_button_sets_wait_state(monkeypatch):
    dummy_collection = DummyCollection()
    dummy_collection.storage["test-session"] = {
        "session_id": "test-session",
        "state": {"step": "customer_worker_list", "role": "customer", "user_id": "u1"},
    }
    monkeypatch.setattr(whatsapp.db, "bot_sessions", dummy_collection)

    body = WhatsAppMessageIn(session_id="test-session", message="CHANGE_PINCODE")
    response = asyncio.run(whatsapp.whatsapp_message(body))

    assert response["state"]["step"] == "awaiting_pincode"
    assert response["reply"] == "Kaunsa pincode dekhna hai? 6-digit pincode bhejein."


def test_gupshup_unregistered_hi_attempts_buttons(monkeypatch):
    dummy_collection = DummyCollection()
    sent = {}
    monkeypatch.setattr(whatsapp.db, "bot_sessions", dummy_collection)
    monkeypatch.setattr(whatsapp.db, "users", DummyUsers())
    monkeypatch.setattr(whatsapp.settings, "gupshup_api_url", "https://api.gupshup.io/wa/api/v1/msg")

    def fake_buttons(destination, text, buttons):
        sent["destination"] = destination
        sent["text"] = text
        sent["buttons"] = buttons
        return {"kind": "reply_buttons", "fallback": False}

    monkeypatch.setattr(whatsapp, "_send_gupshup_buttons", fake_buttons)

    request = DummyRequest({"src": "919876543210", "message": {"text": "hi"}})
    response = asyncio.run(whatsapp.gupshup_webhook(request))

    assert response["status"] == "ok"
    assert sent["destination"] == "919876543210"
    assert [button["id"] for button in sent["buttons"]] == ["CUSTOMER", "WORKER", "HELP"]
