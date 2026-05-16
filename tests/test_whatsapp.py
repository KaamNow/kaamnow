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
    def __init__(self, user=None):
        self.user = user

    async def find_one(self, *args, **kwargs):
        return self.user

    async def update_one(self, *args, **kwargs):
        return None


class DummyWorkers:
    def __init__(self, worker=None):
        self.worker = worker or {"id": "w1", "user_id": "u1", "name": "Faiza", "address": {"pincode": "841215"}}

    async def find_one(self, *args, **kwargs):
        return self.worker


class DummyJobs:
    def __init__(self, job=None):
        self.job = job or {
            "id": "j1",
            "title": "Driver needed",
            "category": "transport",
            "daily_rate": 650,
            "workers_needed": 2,
            "job_date": "2026-05-20",
            "village": "Patna",
            "address": {"pincode": "841215", "district": "Patna"},
            "description": "Drive tractor",
        }

    async def find_one(self, *args, **kwargs):
        return self.job


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
        (
            {
                "type": "message",
                "payload": {
                    "source": "919876543210",
                    "type": "list_reply",
                    "payload": {"postbackText": "JOB:j1", "title": "Driver needed"},
                },
            },
            "JOB:j1",
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


def test_send_gupshup_list_uses_list_payload(monkeypatch):
    captured = {}

    def fake_post(url, data=None, headers=None, timeout=None):
        captured["data"] = data
        captured["headers"] = headers
        return DummyResponse({"status": "submitted", "messageId": "list-1"}, status_code=202)

    monkeypatch.setattr(whatsapp.requests, "post", fake_post)
    monkeypatch.setattr(whatsapp.settings, "gupshup_api_url", "https://api.gupshup.io/wa/api/v1/msg")
    monkeypatch.setattr(whatsapp.settings, "gupshup_api_key", "fake-key")
    monkeypatch.setattr(whatsapp.settings, "gupshup_source", "917834811114")

    response = whatsapp._send_gupshup_list(
        "9876543210",
        "Jobs mil rahe hain.",
        "Jobs dekhein",
        [{"title": "Nearby Jobs", "rows": [{"id": "JOB:j1", "title": "Driver needed", "description": "₹650/day · Patna"}]}],
        fallback_text="1. Driver needed",
    )

    message = json.loads(captured["data"]["message"])
    assert response["kind"] == "list"
    assert response["fallback"] is False
    assert message["type"] == "list"
    assert message["globalButtons"][0]["title"] == "Jobs dekhein"
    assert message["items"][0]["options"][0]["postbackText"] == "JOB:j1"
    assert captured["data"]["destination"] == "919876543210"


def test_send_gupshup_list_fallback_sends_numbered_text(monkeypatch):
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

    response = whatsapp._send_gupshup_list(
        "919876543210",
        "Jobs mil rahe hain.",
        "Jobs dekhein",
        [{"title": "Nearby Jobs", "rows": [{"id": "JOB:j1", "title": "Driver needed", "description": "₹650/day · Patna"}]}],
        fallback_text="1. Driver needed",
    )

    fallback_message = json.loads(posts[1]["message"])
    assert response["fallback"] is True
    assert fallback_message["type"] == "text"
    assert fallback_message["text"] == "1. Driver needed"


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


@pytest.mark.parametrize("text", ["Hii", "Namaste"])
def test_greeting_aliases_route_like_hi(monkeypatch, text):
    async def fake_identify(source_phone, state):
        user = {"id": "u1", "role": "worker", "name": "Faiza"}
        worker = {"id": "w1", "user_id": "u1", "name": "Faiza", "address": {"pincode": "841215"}}
        return user, worker, {**state, "role": "worker", "user_id": "u1", "worker_id": "w1"}

    async def fake_worker_hi(source_phone, state, user, worker):
        return "HI_OK", {**state, "step": "job_list"}

    monkeypatch.setattr(whatsapp, "_identify_user", fake_identify)
    monkeypatch.setattr(whatsapp, "_registered_worker_hi", fake_worker_hi)

    reply, state = asyncio.run(whatsapp._handle_message("919876543210", text, {"step": "worker_menu"}))

    assert reply == "HI_OK"
    assert state["step"] == "job_list"


def test_no_result_worker_response_attempts_reply_buttons(monkeypatch):
    dummy_collection = DummyCollection()
    sent = {}
    monkeypatch.setattr(whatsapp.db, "bot_sessions", dummy_collection)
    monkeypatch.setattr(whatsapp.db, "workers", DummyWorkers())
    monkeypatch.setattr(whatsapp.settings, "gupshup_api_url", "https://api.gupshup.io/wa/api/v1/msg")

    async def fake_lookup(source_phone):
        return {"id": "u1", "role": "worker", "name": "Faiza", "address": {"pincode": "841215"}}

    async def fake_jobs(worker, pincode):
        return []

    def fake_buttons(destination, text, buttons):
        sent["text"] = text
        sent["buttons"] = buttons
        return {"kind": "reply_buttons", "fallback": False}

    monkeypatch.setattr(whatsapp, "_lookup_user_by_phone", fake_lookup)
    monkeypatch.setattr(whatsapp, "_fetch_jobs_for_worker_pincode", fake_jobs)
    monkeypatch.setattr(whatsapp, "_send_gupshup_buttons", fake_buttons)

    request = DummyRequest({"src": "919876543210", "message": {"text": "reset"}})
    asyncio.run(whatsapp.gupshup_webhook(request))

    assert "abhi koi nearby kaam nahi mila" in sent["text"]
    assert "Reply: PINCODE" not in sent["text"]
    assert [button["id"] for button in sent["buttons"]] == ["CHANGE_PINCODE", "STATUS", "HELP"]


def test_no_result_customer_response_attempts_reply_buttons(monkeypatch):
    dummy_collection = DummyCollection()
    sent = {}
    monkeypatch.setattr(whatsapp.db, "bot_sessions", dummy_collection)
    monkeypatch.setattr(whatsapp.settings, "gupshup_api_url", "https://api.gupshup.io/wa/api/v1/msg")

    async def fake_lookup(source_phone):
        return {"id": "u1", "role": "customer", "name": "Amir", "address": {"pincode": "801505"}}

    async def fake_workers(pincode, limit=5, offset=0):
        return []

    def fake_buttons(destination, text, buttons):
        sent["text"] = text
        sent["buttons"] = buttons
        return {"kind": "reply_buttons", "fallback": False}

    monkeypatch.setattr(whatsapp, "_lookup_user_by_phone", fake_lookup)
    monkeypatch.setattr(whatsapp, "_fetch_workers_for_customer_pincode", fake_workers)
    monkeypatch.setattr(whatsapp, "_send_gupshup_buttons", fake_buttons)

    request = DummyRequest({"src": "919876543210", "message": {"text": "hi"}})
    asyncio.run(whatsapp.gupshup_webhook(request))

    assert "abhi koi worker nahi mila" in sent["text"]
    assert "Reply: PINCODE" not in sent["text"]
    assert [button["id"] for button in sent["buttons"]] == ["CHANGE_PINCODE", "MORE", "HELP"]


def test_customer_worker_list_attempts_list_send(monkeypatch):
    dummy_collection = DummyCollection()
    sent = {}
    workers = [
        {"id": f"w{i}", "name": f"Worker {i}", "skills": ["mason"], "daily_rate": 500 + i, "village": "Patna", "address": {"pincode": "801505"}}
        for i in range(1, 5)
    ]
    monkeypatch.setattr(whatsapp.db, "bot_sessions", dummy_collection)
    monkeypatch.setattr(whatsapp.settings, "gupshup_api_url", "https://api.gupshup.io/wa/api/v1/msg")

    async def fake_lookup(source_phone):
        return {"id": "u1", "role": "customer", "name": "Amir", "address": {"pincode": "801505"}}

    async def fake_workers(pincode, limit=5, offset=0):
        return workers

    def fake_list(destination, body_text, button_text, sections, fallback_text=""):
        sent["body_text"] = body_text
        sent["button_text"] = button_text
        sent["sections"] = sections
        sent["fallback_text"] = fallback_text
        return {"kind": "list", "fallback": False}

    monkeypatch.setattr(whatsapp, "_lookup_user_by_phone", fake_lookup)
    monkeypatch.setattr(whatsapp, "_fetch_workers_for_customer_pincode", fake_workers)
    monkeypatch.setattr(whatsapp, "_send_gupshup_list", fake_list)
    monkeypatch.setattr(whatsapp, "_send_gupshup_buttons", lambda *args, **kwargs: {"kind": "reply_buttons"})

    request = DummyRequest({"src": "919876543210", "message": {"text": "hi"}})
    asyncio.run(whatsapp.gupshup_webhook(request))

    assert sent["button_text"] == "Workers dekhein"
    assert sent["sections"][0]["title"] == "Nearby Workers"
    assert sent["sections"][0]["rows"][0]["id"] == "WORKER:w1"
    assert "1. Worker 1" in sent["fallback_text"]


def test_worker_job_list_attempts_list_send(monkeypatch):
    dummy_collection = DummyCollection()
    sent = {}
    jobs = [
        {"id": f"j{i}", "title": f"Driver needed {i}", "daily_rate": 650 + i, "workers_needed": 2, "village": "Patna", "address": {"pincode": "841215"}}
        for i in range(1, 5)
    ]
    monkeypatch.setattr(whatsapp.db, "bot_sessions", dummy_collection)
    monkeypatch.setattr(whatsapp.db, "workers", DummyWorkers())
    monkeypatch.setattr(whatsapp.settings, "gupshup_api_url", "https://api.gupshup.io/wa/api/v1/msg")

    async def fake_lookup(source_phone):
        return {"id": "u1", "role": "worker", "name": "Faiza", "address": {"pincode": "841215"}}

    async def fake_jobs(worker, pincode):
        return jobs

    def fake_list(destination, body_text, button_text, sections, fallback_text=""):
        sent["body_text"] = body_text
        sent["button_text"] = button_text
        sent["sections"] = sections
        sent["fallback_text"] = fallback_text
        return {"kind": "list", "fallback": False}

    monkeypatch.setattr(whatsapp, "_lookup_user_by_phone", fake_lookup)
    monkeypatch.setattr(whatsapp, "_fetch_jobs_for_worker_pincode", fake_jobs)
    monkeypatch.setattr(whatsapp, "_send_gupshup_list", fake_list)
    monkeypatch.setattr(whatsapp, "_send_gupshup_buttons", lambda *args, **kwargs: {"kind": "reply_buttons"})

    request = DummyRequest({"src": "919876543210", "message": {"text": "hi"}})
    asyncio.run(whatsapp.gupshup_webhook(request))

    assert sent["button_text"] == "Jobs dekhein"
    assert sent["sections"][0]["title"] == "Nearby Jobs"
    assert sent["sections"][0]["rows"][0]["id"] == "JOB:j1"
    assert "Driver needed 1" in sent["fallback_text"]


def test_typed_my_applications_maps_to_status(monkeypatch):
    async def fake_identify(source_phone, state):
        user = {"id": "u1", "role": "worker", "name": "Faiza"}
        worker = {"id": "w1", "user_id": "u1", "name": "Faiza", "address": {"pincode": "841215"}}
        return user, worker, {**state, "role": "worker", "user_id": "u1", "worker_id": "w1"}

    async def fake_status(source_phone, state):
        return "STATUS_OK", state

    monkeypatch.setattr(whatsapp, "_identify_user", fake_identify)
    monkeypatch.setattr(whatsapp, "_cmd_status", fake_status)

    reply, _ = asyncio.run(whatsapp._handle_message("919876543210", "My Applications", {"step": "worker_menu"}))

    assert reply == "STATUS_OK"


def test_typed_find_jobs_maps_to_jobs(monkeypatch):
    async def fake_identify(source_phone, state):
        user = {"id": "u1", "role": "worker", "name": "Faiza"}
        worker = {"id": "w1", "user_id": "u1", "name": "Faiza", "address": {"pincode": "841215"}}
        return user, worker, {**state, "role": "worker", "user_id": "u1", "worker_id": "w1"}

    async def fake_jobs(source_phone, state, category=None, offset=0, pincode_filter=None):
        return "JOBS_OK", state

    monkeypatch.setattr(whatsapp, "_identify_user", fake_identify)
    monkeypatch.setattr(whatsapp, "_cmd_jobs", fake_jobs)

    reply, _ = asyncio.run(whatsapp._handle_message("919876543210", "Find Jobs", {"step": "worker_menu"}))

    assert reply == "JOBS_OK"


def test_typed_change_pincode_prompts_for_pincode(monkeypatch):
    dummy_collection = DummyCollection()
    dummy_collection.storage["test-session"] = {
        "session_id": "test-session",
        "state": {"step": "job_list", "role": "worker", "user_id": "u1", "worker_id": "w1"},
    }
    monkeypatch.setattr(whatsapp.db, "bot_sessions", dummy_collection)

    body = WhatsAppMessageIn(session_id="test-session", message="Change Pincode")
    response = asyncio.run(whatsapp.whatsapp_message(body))

    assert response["state"]["step"] == "awaiting_pincode"
    assert response["reply"] == "Kaunsa pincode dekhna hai? 6-digit pincode bhejein."


def test_inbound_job_id_shows_job_detail(monkeypatch):
    async def fake_identify(source_phone, state):
        user = {"id": "u1", "role": "worker", "name": "Faiza"}
        worker = {"id": "w1", "user_id": "u1", "name": "Faiza", "address": {"pincode": "841215"}}
        return user, worker, {**state, "role": "worker", "user_id": "u1", "worker_id": "w1"}

    monkeypatch.setattr(whatsapp, "_identify_user", fake_identify)
    monkeypatch.setattr(whatsapp.db, "jobs", DummyJobs())

    reply, state = asyncio.run(whatsapp._handle_message("919876543210", "JOB:j1", {"step": "job_list"}))

    assert "Driver needed" in reply
    assert state["viewed_job"]["id"] == "j1"
    assert [button["id"] for button in state["_reply_buttons"]] == ["APPLY:j1", "MORE", "CHANGE_PINCODE"]


def test_inbound_worker_id_shows_worker_detail(monkeypatch):
    worker = {
        "id": "w1",
        "name": "Ramesh",
        "skills": ["mason"],
        "daily_rate": 500,
        "village": "Patna",
        "avg_rating": 4.2,
        "total_jobs": 12,
    }
    monkeypatch.setattr(whatsapp.db, "workers", DummyWorkers(worker))

    reply, state = asyncio.run(whatsapp._handle_message("919876543210", "WORKER:w1", {"step": "customer_worker_list", "role": "customer"}))

    assert "Ramesh" in reply
    assert "mason" in reply
    assert state["selected_worker_id"] == "w1"
    assert [button["id"] for button in state["_reply_buttons"]] == ["REQUEST:w1", "MORE", "CHANGE_PINCODE"]


def test_inbound_apply_id_uses_existing_apply(monkeypatch):
    monkeypatch.setattr(whatsapp.db, "jobs", DummyJobs())

    async def fake_apply(source_phone, state):
        assert state["viewed_job"]["id"] == "j1"
        return "APPLY_OK", state

    monkeypatch.setattr(whatsapp, "_cmd_apply", fake_apply)

    reply, _ = asyncio.run(whatsapp._handle_message("919876543210", "APPLY:j1", {"step": "job_detail", "role": "worker"}))

    assert reply == "APPLY_OK"


def test_numbered_job_selection_still_works(monkeypatch):
    async def fake_identify(source_phone, state):
        user = {"id": "u1", "role": "worker", "name": "Faiza"}
        worker = {"id": "w1", "user_id": "u1", "name": "Faiza", "address": {"pincode": "841215"}}
        return user, worker, {**state, "role": "worker", "user_id": "u1", "worker_id": "w1"}

    monkeypatch.setattr(whatsapp, "_identify_user", fake_identify)
    state = {
        "step": "job_list",
        "role": "worker",
        "job_list": [DummyJobs().job],
    }

    reply, new_state = asyncio.run(whatsapp._handle_message("919876543210", "1", state))

    assert "Driver needed" in reply
    assert new_state["viewed_job"]["id"] == "j1"
