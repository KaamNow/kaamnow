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


@pytest.mark.parametrize(
    "body, expected_text",
    [
        ({"src": "919876543210", "message": {"text": "1"}}, "1"),
        ({"source": "919876543210", "message": {"type": "text", "text": "2"}}, "2"),
        ({"sender": {"phone": "919876543210"}, "payload": {"message": {"text": "menu"}}}, "menu"),
        ({"source": "919876543210", "message": {"type": "text", "payload": "menu"}}, "menu"),
        ({"source": "919876543210", "text": "hello"}, "hello"),
    ],
)
def test_extract_gupshup_incoming(body, expected_text):
    source, text = whatsapp._extract_gupshup_incoming(body)
    assert source == "919876543210"
    assert text == expected_text


def test_send_gupshup_text_uses_form_encoding(monkeypatch):
    captured = {}

    class DummyResponse:
        def __init__(self, payload):
            self._payload = payload

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

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


def test_gupshup_webhook_route(monkeypatch):
    dummy_collection = DummyCollection()
    monkeypatch.setattr(whatsapp.db, "bot_sessions", dummy_collection)
    monkeypatch.setattr(whatsapp, "_send_gupshup_text", lambda destination, text: {"status": "sent", "destination": destination, "text": text})
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

    assert response["state"]["step"] == "intent"
    assert "reply" in response
    assert response["reply"].lower().startswith("namaste")
