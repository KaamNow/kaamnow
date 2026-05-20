import pytest
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.routers import auth as auth_router
from backend.routers import jobs as jobs_router
from backend.routers import workers as workers_router
from backend.schemas import BecomeWorkerIn, JobIn, SignupCompleteRequest


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
        self.workers = FakeCollection()
        self.users = FakeCollection()


def test_signup_no_role():
    payload = SignupCompleteRequest(name="Amit Kumar", gender="male")

    assert "role" not in SignupCompleteRequest.model_fields
    assert payload.name == "Amit Kumar"
    assert payload.gender == "male"


def test_dual_role_user():
    out = auth_router._user_out(
        {
            "id": "u1",
            "name": "Amit",
            "role": "user",
            "is_worker": True,
            "is_customer": True,
            "phone_verified": True,
        }
    )

    assert out["role"] == "worker"   # is_worker=True → role must be "worker" for WhatsApp bot compat
    assert out["is_worker"] is True
    assert out["is_customer"] is True
    assert out["has_worker_profile"] is True


@pytest.mark.asyncio
async def test_anyone_can_post_job(monkeypatch):
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
    user = {"id": "u1", "name": "Amit", "role": "user", "is_worker": True, "is_customer": True}

    result = await jobs_router.create_job(body, user)

    assert result["customer_id"] == "u1"
    assert result["status"] == "open"
    assert fake_db.jobs.inserted[0]["customer_id"] == "u1"


@pytest.mark.asyncio
async def test_become_worker(monkeypatch):
    fake_db = FakeDb()
    fake_db.users.find_one_result = {
        "id": "u1",
        "name": "Amit",
        "role": "user",
        "is_worker": True,
        "is_customer": True,
    }
    monkeypatch.setattr(workers_router, "db", fake_db)

    body = BecomeWorkerIn(skills=["plumbing"], daily_rate=700, pincode="800001", gender="male")
    user = {"id": "u1", "name": "Amit", "role": "user", "is_customer": True}

    result = await workers_router.become_worker(body, user)

    assert result["worker"]["user_id"] == "u1"
    assert result["worker"]["availability_status"] == "available"
    assert fake_db.users.updated[0][1]["$set"]["is_worker"] is True
    assert fake_db.users.updated[0][1]["$set"]["has_worker_profile"] is True


@pytest.mark.asyncio
async def test_tc_acceptance_stored(monkeypatch):
    fake_db = FakeDb()
    fake_db.users.find_one_result = {
        "id": "u1",
        "name": "Amit",
        "role": "user",
        "is_worker": False,
        "is_customer": True,
        "tc_version": "1.0",
    }
    monkeypatch.setattr(auth_router, "db", fake_db)

    result = await auth_router.accept_terms({"version": "1.0"}, {"id": "u1"})

    update = fake_db.users.updated[0][1]["$set"]
    assert update["tc_version"] == "1.0"
    assert update["tc_accepted_at"]
    assert result["role"] == "customer"   # is_worker=False → role must be "customer"
