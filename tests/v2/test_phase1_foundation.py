import pytest
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.routers import auth as auth_router
from backend.routers import jobs as jobs_router
from backend.routers import service_profiles as sp_router
from backend.schemas import JobIn, SignupCompleteRequest


class FakeCollection:
    def __init__(self, find_one_result=None):
        self.find_one_result = find_one_result
        self.inserted = []
        self.updated = []

    async def find_one(self, *args, **kwargs):
        return self.find_one_result

    async def insert_one(self, doc):
        self.inserted.append(doc)

    async def update_one(self, query, update, **kwargs):
        self.updated.append((query, update, kwargs))


class FakeDb:
    def __init__(self):
        self.jobs = FakeCollection()
        self.users = FakeCollection()
        self.service_profiles = FakeCollection()


def test_signup_no_role():
    payload = SignupCompleteRequest(name="Amit Kumar", gender="male")
    assert "role" not in SignupCompleteRequest.model_fields
    assert payload.name == "Amit Kumar"
    assert payload.gender == "male"


def test_user_out_has_service_profile_true():
    """User with a service profile should get has_service_profile=True."""
    out = auth_router._user_out({
        "id": "u1",
        "name": "Amit",
        "has_service_profile": True,
        "phone_verified": True,
    })
    assert out["has_service_profile"] is True
    assert "is_worker" not in out
    assert "role" not in out
    assert "has_worker_profile" not in out


def test_user_out_has_service_profile_false():
    """User without service profile gets has_service_profile=False."""
    out = auth_router._user_out({
        "id": "u2",
        "name": "Faiza",
    })
    assert out["has_service_profile"] is False


@pytest.mark.asyncio
async def test_anyone_can_post_job(monkeypatch):
    """Any logged-in user can post a job — no role check required."""
    fake_db = FakeDb()
    monkeypatch.setattr(jobs_router, "db", fake_db)

    async def no_alerts(job):
        return None

    monkeypatch.setattr(jobs_router, "_alert_matching_workers", no_alerts)

    body = JobIn(
        title="Pump repair",
        category="repair",
        description="Need help repairing pump",
        daily_rate=600,
        job_date="2099-01-01",
        village="Rampur",
        lat=25.6,
        lng=85.1,
    )
    user = {"id": "u1", "name": "Amit"}  # no role, no is_worker

    result = await jobs_router.create_job(body, user)

    assert result["posted_by_user_id"] == "u1"
    assert result["status"] == "open"
    assert fake_db.jobs.inserted[0]["posted_by_user_id"] == "u1"
    assert "customer_id" not in fake_db.jobs.inserted[0]


@pytest.mark.asyncio
async def test_create_service_profile(monkeypatch):
    """Any user can create a service profile — sets has_service_profile on user doc."""
    fake_db = FakeDb()
    monkeypatch.setattr(sp_router, "db", fake_db)

    user = {"id": "u1", "name": "Amit", "pincode": "800001"}
    body = {"skills": ["plumbing"], "daily_rate": 700, "pincode": "800001", "bio": "Experienced plumber"}

    result = await sp_router.create_profile(body, user)

    assert result["user_id"] == "u1"
    assert result["availability"] is True
    assert fake_db.users.updated[0][1]["$set"]["has_service_profile"] is True
    assert "worker_id" not in result
    assert "is_worker" not in result


@pytest.mark.asyncio
async def test_tc_acceptance_stored(monkeypatch):
    fake_db = FakeDb()
    fake_db.users.find_one_result = {
        "id": "u1",
        "name": "Amit",
        "has_service_profile": False,
        "tc_version": "1.0",
    }
    monkeypatch.setattr(auth_router, "db", fake_db)

    result = await auth_router.accept_terms({"version": "1.0"}, {"id": "u1"})

    update = fake_db.users.updated[0][1]["$set"]
    assert update["tc_version"] == "1.0"
    assert update["tc_accepted_at"]
    assert "has_service_profile" in result
    assert "role" not in result
