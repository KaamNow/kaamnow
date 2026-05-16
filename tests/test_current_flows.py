import asyncio
import re

from fastapi import HTTPException, Response

from backend.config import Settings, _to_bool
from backend import seed as seed_module
from backend import engagements as engagement_service
from backend.routers import auth as auth_routes
from backend.routers import bookings as bookings_routes
from backend.routers import engagements as engagements_routes
from backend.routers import jobs as jobs_routes
from backend.routers import workers as workers_routes
from backend.schemas import BookingIn, JobIn, LoginIn, RatingIn, RegisterIn, WorkerProfileIn


class DummyCursor:
    def __init__(self, docs):
        self.docs = list(docs)

    def sort(self, field, direction):
        self.docs.sort(key=lambda doc: doc.get(field, ""), reverse=direction < 0)
        return self

    def limit(self, count):
        self.docs = self.docs[:count]
        return self

    async def to_list(self, count):
        return self.docs[:count]


class DummyUpdateResult:
    def __init__(self, matched):
        self.matched_count = matched


class DummyCollection:
    def __init__(self, docs=None):
        self.docs = list(docs or [])
        self.indexes = []

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if self._matches(doc, query):
                return self._project(doc, projection)
        return None

    async def insert_one(self, doc):
        self.docs.append(dict(doc))

    async def create_index(self, keys, **kwargs):
        self.indexes.append((keys, kwargs))

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if self._matches(doc, query):
                if "$set" in update:
                    doc.update(update["$set"])
                return DummyUpdateResult(matched=1)
        if upsert:
            new_doc = dict(query)
            if "$set" in update:
                new_doc.update(update["$set"])
            self.docs.append(new_doc)
        return DummyUpdateResult(matched=0)

    def find(self, query=None, projection=None):
        query = query or {}
        return DummyCursor([self._project(doc, projection) for doc in self.docs if self._matches(doc, query)])

    async def count_documents(self, query):
        return len([doc for doc in self.docs if self._matches(doc, query)])

    def aggregate(self, pipeline):
        docs = list(self.docs)
        match_stage = pipeline[0].get("$match", {}) if pipeline else {}
        docs = [doc for doc in docs if self._matches(doc, match_stage)]

        if len(pipeline) < 2 or "$group" not in pipeline[1]:
            return DummyCursor(docs)

        group = pipeline[1]["$group"]
        group_key = group["_id"].removeprefix("$")
        avg_field = group["avg"]["$avg"].removeprefix("$")
        groups = {}
        for doc in docs:
            key = self._get_value(doc, group_key)
            groups.setdefault(key, []).append(doc)

        result = []
        for key, grouped_docs in groups.items():
            values = [self._get_value(doc, avg_field) for doc in grouped_docs if self._get_value(doc, avg_field) is not None]
            if values:
                result.append({"_id": key, "avg": sum(values) / len(values), "count": len(values)})
        return DummyCursor(result)

    def _matches(self, doc, query):
        for key, expected in query.items():
            if key == "$or":
                if not any(self._matches(doc, condition) for condition in expected):
                    return False
                continue
            if key == "$expr":
                if not self._eval_expr(doc, expected):
                    return False
                continue
            value = self._get_value(doc, key)
            if not self._value_matches(value, expected):
                return False
        return True

    def _eval_expr(self, doc, expr):
        """Minimal $expr evaluator supporting $lt, $lte, $gt, $gte, $eq."""
        if not isinstance(expr, dict):
            return bool(expr)
        op, operands = next(iter(expr.items()))
        def resolve(v):
            if isinstance(v, str) and v.startswith("$"):
                return doc.get(v[1:], 0) or 0
            return v
        if op == "$lt":
            return resolve(operands[0]) < resolve(operands[1])
        if op == "$lte":
            return resolve(operands[0]) <= resolve(operands[1])
        if op == "$gt":
            return resolve(operands[0]) > resolve(operands[1])
        if op == "$gte":
            return resolve(operands[0]) >= resolve(operands[1])
        if op == "$eq":
            return resolve(operands[0]) == resolve(operands[1])
        return True

    def _get_value(self, doc, key):
        value = doc
        for part in key.split("."):
            if isinstance(value, dict):
                value = value.get(part)
            else:
                return None
        return value

    def _value_matches(self, value, expected):
        if isinstance(expected, dict):
            if "$in" in expected:
                if isinstance(value, list):
                    return any(item in expected["$in"] for item in value)
                return value in expected["$in"]
            if "$ne" in expected:
                return value != expected["$ne"]
            if "$regex" in expected:
                flags = re.IGNORECASE if expected.get("$options") == "i" else 0
                if isinstance(value, list):
                    return any(re.search(expected["$regex"], str(item), flags) for item in value)
                return re.search(expected["$regex"], str(value or ""), flags) is not None
        return value == expected

    def _project(self, doc, projection):
        if doc is None:
            return None
        projected = dict(doc)
        if not projection:
            return projected
        for key, enabled in projection.items():
            if enabled == 0:
                projected.pop(key, None)
        return projected


class DummyDb:
    def __init__(self):
        self.users = DummyCollection()
        self.workers = DummyCollection()
        self.jobs = DummyCollection()
        self.bookings = DummyCollection()
        self.engagements = DummyCollection()
        self.notifications = DummyCollection()


def run(coro):
    return asyncio.run(coro)


def patch_db(monkeypatch, db):
    monkeypatch.setattr(auth_routes, "db", db)
    monkeypatch.setattr(workers_routes, "db", db)
    monkeypatch.setattr(jobs_routes, "db", db)
    monkeypatch.setattr(bookings_routes, "db", db)
    monkeypatch.setattr(engagements_routes, "db", db)
    monkeypatch.setattr(engagement_service, "db", db)


def test_feature_flags_default_off_and_bool_parser():
    local_settings = Settings(mongo_url="", db_name="", jwt_secret="")

    assert local_settings.feature_engagement_flow is False
    assert local_settings.feature_otp_auth is False
    assert local_settings.feature_whatsapp_notifications is False
    assert _to_bool("yes") is True
    assert _to_bool("0") is False
    assert _to_bool(None, True) is True


def test_register_and_login_current_email_password_flow(monkeypatch):
    db = DummyDb()
    monkeypatch.setattr(auth_routes, "db", db)

    registered = run(
        auth_routes.register(
            RegisterIn(
                email="Worker@Example.com",
                password="secret123",
                name="Ramesh Kumar",
                role="worker",
                village="Pratapgarh",
                phone="919876543210",
            ),
            Response(),
        )
    )

    assert registered["user"]["email"] == "worker@example.com"
    assert registered["user"]["role"] == "worker"
    assert registered["user"]["phone"] == "919876543210"
    assert registered["user"]["phone_verified"] is False
    assert registered["user"]["address"]["village"] == "Pratapgarh"
    assert registered["user"]["preferred_language"] == "en"
    assert registered["token"]
    assert db.users.docs[0]["password_hash"] != "secret123"

    logged_in = run(auth_routes.login(LoginIn(email="worker@example.com", password="secret123"), Response()))

    assert logged_in["user"]["id"] == registered["user"]["id"]
    assert logged_in["token"]


def test_duplicate_register_rejected_current_behavior(monkeypatch):
    db = DummyDb()
    monkeypatch.setattr(auth_routes, "db", db)
    body = RegisterIn(email="customer@example.com", password="secret123", name="Customer", role="customer")

    run(auth_routes.register(body, Response()))

    try:
        run(auth_routes.register(body, Response()))
    except HTTPException as exc:
        assert exc.status_code == 400
        assert exc.detail == "Email already registered"
    else:
        raise AssertionError("Duplicate registration should fail")


def test_register_accepts_new_user_profile_fields(monkeypatch):
    db = DummyDb()
    monkeypatch.setattr(auth_routes, "db", db)

    registered = run(
        auth_routes.register(
            RegisterIn(
                email="customer@example.com",
                password="secret123",
                name="Customer",
                role="customer",
                phone="919876543211",
                address={
                    "village": "Rampur",
                    "post": "Rampur Post",
                    "block": "Sadar",
                    "district": "Pratapgarh",
                    "state": "UP",
                    "pincode": "230001",
                },
                photo_url="https://example.com/photo.jpg",
                preferred_language="hi",
            ),
            Response(),
        )
    )

    assert registered["user"]["village"] == "Rampur"
    assert registered["user"]["address"]["pincode"] == "230001"
    assert registered["user"]["photo_url"] == "https://example.com/photo.jpg"
    assert registered["user"]["preferred_language"] == "hi"
    assert db.users.docs[0]["phone_verified"] is False


def test_worker_profile_upsert_and_flat_skill_filter_current_behavior(monkeypatch):
    db = DummyDb()
    monkeypatch.setattr(workers_routes, "db", db)
    user = {"id": "user-worker-1", "name": "Sunita Devi", "role": "worker", "village": "Wardha"}

    created = run(
        workers_routes.upsert_worker_profile(
            WorkerProfileIn(
                skills=["farm work", "harvesting"],
                daily_rate=320,
                bio="Cotton picking and harvesting",
                village="Wardha",
                district="Wardha",
                state="Maharashtra",
                lat=20.7453,
                lng=78.6022,
                available=True,
            ),
            user=user,
        )
    )

    assert created["user_id"] == "user-worker-1"
    assert created["skills"] == ["farm work", "harvesting"]
    assert created["structured_skills"] == [
        {"category": "Legacy", "skill": "farm work"},
        {"category": "Legacy", "skill": "harvesting"},
    ]
    assert created["address"]["village"] == "Wardha"
    assert created["address"]["district"] == "Wardha"
    assert created["availability_status"] == "available"
    assert created["last_active_at"]
    assert created["trust_tier"] == 1
    assert created["avg_rating"] == 0.0

    workers = run(workers_routes.list_workers(skill="farm work", available_only=True))

    assert [worker["id"] for worker in workers] == [created["id"]]

    updated = run(
        workers_routes.upsert_worker_profile(
            WorkerProfileIn(
                skills=["mason", "plastering"],
                structured_skills=[
                    {"category": "Construction Work", "skill": "mason"},
                    {"category": "Construction Work", "skill": "plastering"},
                ],
                daily_rate=520,
                bio="Mason",
                village="Old village",
                district="Old district",
                state="Old state",
                address={
                    "village": "Pratapgarh",
                    "post": "Pratapgarh",
                    "block": "Sadar",
                    "district": "Pratapgarh",
                    "state": "UP",
                    "pincode": "230001",
                },
                lat=25.892,
                lng=81.944,
                available=False,
            ),
            user=user,
        )
    )

    assert updated["village"] == "Pratapgarh"
    assert updated["district"] == "Pratapgarh"
    assert updated["state"] == "UP"
    assert updated["address"]["pincode"] == "230001"
    assert updated["structured_skills"][0]["category"] == "Construction Work"
    assert updated["availability_status"] == "not_available"

    db.workers.docs.append(
        {
            "id": "other-worker",
            "user_id": "other-user",
            "name": "Unavailable Mason",
            "skills": ["mason"],
            "daily_rate": 500,
            "bio": "",
            "village": "Wardha",
            "district": "Wardha",
            "state": "Maharashtra",
            "lat": 20.7,
            "lng": 78.6,
            "available": False,
            "trust_tier": 3,
            "avg_rating": 4.9,
            "total_jobs": 12,
            "photo_url": None,
        }
    )


def test_create_and_list_jobs_current_basic_schema(monkeypatch):
    db = DummyDb()
    monkeypatch.setattr(jobs_routes, "db", db)
    user = {"id": "customer-1", "name": "Mahesh Patel", "role": "customer"}

    created = run(
        jobs_routes.create_job(
            JobIn(
                title="Need 4 workers for cotton harvesting",
                category="farm",
                description="Two days of cotton harvesting",
                workers_needed=4,
                daily_rate=350,
                job_date="2026-05-02",
                village="Wardha",
                lat=20.7453,
                lng=78.6022,
            ),
            user=user,
        )
    )

    assert created["customer_id"] == "customer-1"
    assert created["status"] == "open"
    assert created["required_skills"] == [{"category": "farm", "skill": "farm"}]
    assert created["address"]["village"] == "Wardha"
    assert created["urgency"] == "normal"
    assert created["filled_count"] == 0
    assert created["accepted_worker_ids"] == []

    farm_jobs = run(jobs_routes.list_jobs(category="farm", status="open"))

    assert len(farm_jobs) == 1
    assert farm_jobs[0]["title"] == "Need 4 workers for cotton harvesting"

    urgent = run(
        jobs_routes.create_job(
            JobIn(
                title="Need mason today",
                category="construction",
                description="Urgent wall repair",
                workers_needed=1,
                daily_rate=600,
                job_date="2026-05-02",
                village="Old village",
                address={
                    "village": "Pratapgarh",
                    "post": "Pratapgarh",
                    "block": "Sadar",
                    "district": "Pratapgarh",
                    "state": "UP",
                    "pincode": "230001",
                },
                lat=25.892,
                lng=81.944,
                required_skills=[{"category": "Construction Work", "skill": "mason"}],
                urgency="urgent",
            ),
            user=user,
        )
    )

    assert urgent["village"] == "Pratapgarh"
    assert urgent["required_skills"] == [{"category": "Construction Work", "skill": "mason"}]
    assert urgent["address"]["pincode"] == "230001"
    assert urgent["urgency"] == "urgent"


def test_phase_one_indexes_are_declared(monkeypatch):
    db = DummyDb()
    monkeypatch.setattr(seed_module, "db", db)

    run(seed_module.ensure_indexes())

    assert ("phone", {"unique": True, "sparse": True}) in db.users.indexes
    assert ("address.pincode", {}) in db.workers.indexes
    assert ("structured_skills.skill", {}) in db.workers.indexes
    assert ("status", {}) in db.jobs.indexes
    assert ("address.pincode", {}) in db.jobs.indexes
    assert ("required_skills.skill", {}) in db.jobs.indexes
    assert (
        [("job_id", 1), ("worker_id", 1)],
        {
            "unique": True,
            "partialFilterExpression": {"status": {"$in": ["requested", "accepted"]}},
        },
    ) in db.engagements.indexes


def test_job_feed_ranks_skill_and_pincode_matches(monkeypatch):
    db = DummyDb()
    db.workers.docs.append(
        {
            "id": "worker-1",
            "user_id": "worker-user-1",
            "name": "Ramesh Kumar",
            "skills": ["mason"],
            "structured_skills": [{"category": "Construction Work", "skill": "mason"}],
            "daily_rate": 500,
            "bio": "",
            "village": "Pratapgarh",
            "district": "Pratapgarh",
            "state": "UP",
            "address": {"village": "Pratapgarh", "pincode": "230001"},
            "lat": 25.892,
            "lng": 81.944,
            "available": True,
            "trust_tier": 2,
            "avg_rating": 4.5,
            "total_jobs": 10,
            "photo_url": None,
        }
    )
    db.jobs.docs.extend(
        [
            {
                "id": "job-other",
                "customer_id": "customer-1",
                "customer_name": "Mahesh Patel",
                "title": "Any helper",
                "category": "helper",
                "description": "Loading work",
                "workers_needed": 1,
                "filled_count": 0,
                "daily_rate": 300,
                "job_date": "2026-05-05",
                "village": "Jodhpur",
                "address": {"village": "Jodhpur", "pincode": "342001"},
                "required_skills": [{"category": "General Labour", "skill": "helper"}],
                "urgency": "normal",
                "lat": 26.2389,
                "lng": 73.0242,
                "status": "open",
                "created_at": "2026-04-29T04:00:00+00:00",
            },
            {
                "id": "job-same-pin",
                "customer_id": "customer-1",
                "customer_name": "Mahesh Patel",
                "title": "Farm helper",
                "category": "farm",
                "description": "Harvest work",
                "workers_needed": 1,
                "filled_count": 0,
                "daily_rate": 350,
                "job_date": "2026-05-05",
                "village": "Pratapgarh",
                "address": {"village": "Pratapgarh", "pincode": "230001"},
                "required_skills": [{"category": "Agriculture", "skill": "harvesting"}],
                "urgency": "normal",
                "lat": 25.892,
                "lng": 81.944,
                "status": "open",
                "created_at": "2026-04-29T03:00:00+00:00",
            },
            {
                "id": "job-skill-other-pin",
                "customer_id": "customer-1",
                "customer_name": "Mahesh Patel",
                "title": "Mason in Wardha",
                "category": "construction",
                "description": "Wall work",
                "workers_needed": 1,
                "filled_count": 0,
                "daily_rate": 550,
                "job_date": "2026-05-05",
                "village": "Wardha",
                "address": {"village": "Wardha", "pincode": "442001"},
                "required_skills": [{"category": "Construction Work", "skill": "mason"}],
                "urgency": "normal",
                "lat": 20.7453,
                "lng": 78.6022,
                "status": "open",
                "created_at": "2026-04-29T02:00:00+00:00",
            },
            {
                "id": "job-best",
                "customer_id": "customer-1",
                "customer_name": "Mahesh Patel",
                "title": "Urgent mason nearby",
                "category": "construction",
                "description": "Wall repair",
                "workers_needed": 1,
                "filled_count": 0,
                "daily_rate": 600,
                "job_date": "2026-05-05",
                "village": "Pratapgarh",
                "address": {"village": "Pratapgarh", "pincode": "230001"},
                "required_skills": [{"category": "Construction Work", "skill": "mason"}],
                "urgency": "urgent",
                "lat": 25.892,
                "lng": 81.944,
                "status": "open",
                "created_at": "2026-04-29T01:00:00+00:00",
            },
        ]
    )
    patch_db(monkeypatch, db)

    feed = run(
        jobs_routes.job_feed(
            pincode=None,
            skills=None,
            user={
                "id": "worker-user-1",
                "name": "Ramesh Kumar",
                "role": "worker",
                "address": {"pincode": "230001"},
            },
        )
    )

    assert [job["id"] for job in feed] == [
        "job-best",
        "job-skill-other-pin",
        "job-same-pin",
        "job-other",
    ]
    assert feed[0]["matched_skills"] == ["mason"]
    assert feed[0]["same_pincode"] is True
    assert feed[0]["wage"] == {"amount": 600, "unit": "day", "label": "₹600/day"}
    assert feed[0]["wage_amount"] == 600


def test_worker_search_ranks_pincode_and_skill_matches(monkeypatch):
    db = DummyDb()
    db.workers.docs.extend(
        [
            {
                "id": "worker-other",
                "user_id": "worker-user-other",
                "name": "Other Helper",
                "skills": ["helper"],
                "structured_skills": [{"category": "General Labour", "skill": "helper"}],
                "daily_rate": 300,
                "bio": "",
                "village": "Jodhpur",
                "district": "Jodhpur",
                "state": "Rajasthan",
                "address": {"village": "Jodhpur", "pincode": "342001"},
                "lat": 26.2389,
                "lng": 73.0242,
                "available": True,
                "trust_tier": 1,
                "avg_rating": 3.5,
                "total_jobs": 2,
                "photo_url": None,
            },
            {
                "id": "worker-same-pin",
                "user_id": "worker-user-same-pin",
                "name": "Nearby Painter",
                "skills": ["painting"],
                "structured_skills": [{"category": "Skilled Trades", "skill": "painting"}],
                "daily_rate": 450,
                "bio": "",
                "village": "Pratapgarh",
                "district": "Pratapgarh",
                "state": "UP",
                "address": {"village": "Pratapgarh", "pincode": "230001"},
                "lat": 25.892,
                "lng": 81.944,
                "available": True,
                "trust_tier": 2,
                "avg_rating": 4.0,
                "total_jobs": 8,
                "photo_url": None,
            },
            {
                "id": "worker-skill-other-pin",
                "user_id": "worker-user-skill-other-pin",
                "name": "Wardha Mason",
                "skills": ["mason"],
                "structured_skills": [{"category": "Construction Work", "skill": "mason"}],
                "daily_rate": 520,
                "bio": "",
                "village": "Wardha",
                "district": "Wardha",
                "state": "Maharashtra",
                "address": {"village": "Wardha", "pincode": "442001"},
                "lat": 20.7453,
                "lng": 78.6022,
                "available": True,
                "trust_tier": 3,
                "avg_rating": 4.8,
                "total_jobs": 20,
                "photo_url": None,
            },
            {
                "id": "worker-best",
                "user_id": "worker-user-best",
                "name": "Nearby Mason",
                "skills": ["mason"],
                "structured_skills": [{"category": "Construction Work", "skill": "mason"}],
                "daily_rate": 500,
                "bio": "",
                "village": "Pratapgarh",
                "district": "Pratapgarh",
                "state": "UP",
                "address": {"village": "Pratapgarh", "pincode": "230001"},
                "lat": 25.892,
                "lng": 81.944,
                "available": True,
                "trust_tier": 2,
                "avg_rating": 4.5,
                "total_jobs": 10,
                "photo_url": None,
            },
            {
                "id": "worker-unavailable",
                "user_id": "worker-user-unavailable",
                "name": "Unavailable Mason",
                "skills": ["mason"],
                "structured_skills": [{"category": "Construction Work", "skill": "mason"}],
                "daily_rate": 500,
                "bio": "",
                "village": "Pratapgarh",
                "district": "Pratapgarh",
                "state": "UP",
                "address": {"village": "Pratapgarh", "pincode": "230001"},
                "lat": 25.892,
                "lng": 81.944,
                "available": False,
                "trust_tier": 3,
                "avg_rating": 5.0,
                "total_jobs": 30,
                "photo_url": None,
            },
        ]
    )
    patch_db(monkeypatch, db)

    workers = run(
        workers_routes.search_workers(
            pincode="230001",
            skills="mason",
            available_only=True,
            user={"id": "customer-1", "name": "Mahesh Patel", "role": "customer"},
        )
    )

    assert [worker["id"] for worker in workers] == [
        "worker-best",
        "worker-skill-other-pin",
        "worker-same-pin",
        "worker-other",
    ]
    assert workers[0]["matched_skills"] == ["mason"]
    assert workers[0]["same_pincode"] is True
    assert workers[0]["wage"]["amount"] == 500
    assert all(worker["id"] != "worker-unavailable" for worker in workers)


def test_booking_lifecycle_current_customer_to_worker_flow(monkeypatch):
    db = DummyDb()
    db.users.docs.extend([
        {"id": "customer-1", "name": "Mahesh Patel", "role": "customer", "phone_primary": "+919000000001"},
        {"id": "worker-user-1", "name": "Ramesh Kumar", "role": "worker", "phone_primary": "+919000000002"},
    ])
    db.jobs.docs.append(
        {
            "id": "job-1",
            "customer_id": "customer-1",
            "customer_name": "Mahesh Patel",
            "title": "Boundary wall",
            "category": "construction",
            "description": "Build a wall",
            "workers_needed": 1,
            "daily_rate": 500,
            "job_date": "2026-05-03",
            "village": "Pratapgarh",
            "lat": 25.892,
            "lng": 81.944,
            "status": "open",
            "created_at": "2026-04-29T00:00:00+00:00",
        }
    )
    db.workers.docs.append(
        {
            "id": "worker-1",
            "user_id": "worker-user-1",
            "name": "Ramesh Kumar",
            "skills": ["mason"],
            "daily_rate": 500,
            "bio": "",
            "village": "Pratapgarh",
            "district": "Pratapgarh",
            "state": "UP",
            "lat": 25.892,
            "lng": 81.944,
            "available": True,
            "trust_tier": 2,
            "avg_rating": 4.5,
            "total_jobs": 10,
            "photo_url": None,
        }
    )
    patch_db(monkeypatch, db)

    booking = run(
        bookings_routes.create_booking(
            BookingIn(job_id="job-1", worker_id="worker-1"),
            user={"id": "customer-1", "name": "Mahesh Patel", "role": "customer"},
        )
    )

    assert booking["status"] == "pending"
    assert booking["engagement_status"] == "requested"
    assert booking["customer_id"] == "customer-1"
    assert booking["worker_id"] == "worker-1"
    assert db.bookings.docs == []
    assert db.engagements.docs[0]["source"] == "customer_booking"
    assert db.engagements.docs[0]["status"] == "requested"
    assert db.notifications.docs[0]["user_id"] == "worker-user-1"
    assert db.notifications.docs[0]["kind"] == "booking_request"

    try:
        run(
            bookings_routes.accept_booking(
                booking["id"],
                user={"id": "customer-1", "name": "Mahesh Patel", "role": "customer"},
            )
        )
    except HTTPException as exc:
        assert exc.status_code == 403
    else:
        raise AssertionError("Customer cannot accept their own direct booking request")

    accepted = run(
        bookings_routes.accept_booking(
            booking["id"],
            user={"id": "worker-user-1", "name": "Ramesh Kumar", "role": "worker"},
        )
    )

    assert accepted == {"ok": True}
    assert db.engagements.docs[0]["status"] == "accepted"
    assert db.jobs.docs[0]["filled_count"] == 1
    assert db.jobs.docs[0]["accepted_worker_ids"] == ["worker-1"]

    completed = run(
        bookings_routes.complete_booking(
            booking["id"],
            user={"id": "worker-user-1", "name": "Ramesh Kumar", "role": "worker"},
        )
    )

    assert completed == {"ok": True}
    assert db.engagements.docs[0]["status"] == "completed"


def test_worker_interest_creates_requested_engagement(monkeypatch):
    db = DummyDb()
    db.jobs.docs.append(
        {
            "id": "job-1",
            "customer_id": "customer-1",
            "customer_name": "Mahesh Patel",
            "title": "Cotton harvesting",
            "category": "farm",
            "description": "Harvest cotton",
            "workers_needed": 2,
            "daily_rate": 350,
            "job_date": "2026-05-03",
            "village": "Wardha",
            "lat": 20.7453,
            "lng": 78.6022,
            "status": "open",
            "created_at": "2026-04-29T00:00:00+00:00",
            "accepted_worker_ids": [],
            "filled_count": 0,
        }
    )
    db.workers.docs.append(
        {
            "id": "worker-1",
            "user_id": "worker-user-1",
            "name": "Sunita Devi",
            "skills": ["farm work"],
            "daily_rate": 320,
            "bio": "",
            "village": "Wardha",
            "district": "Wardha",
            "state": "Maharashtra",
            "lat": 20.7453,
            "lng": 78.6022,
            "available": True,
            "trust_tier": 2,
            "avg_rating": 4.5,
            "total_jobs": 10,
            "photo_url": None,
        }
    )
    patch_db(monkeypatch, db)

    engagement = run(
        jobs_routes.express_interest(
            "job-1",
            user={"id": "worker-user-1", "name": "Sunita Devi", "role": "worker"},
        )
    )

    assert engagement["source"] == "worker_interest"
    assert engagement["status"] == "requested"
    assert engagement["worker_id"] == "worker-1"
    assert engagement["customer_id"] == "customer-1"

    accepted = run(
        engagement_service.accept_engagement(
            engagement["id"],
            user={"id": "customer-1", "name": "Mahesh Patel", "role": "customer"},
        )
    )

    assert accepted == {"ok": True}
    assert db.engagements.docs[0]["status"] == "accepted"


def test_duplicate_active_engagement_is_blocked(monkeypatch):
    db = DummyDb()
    db.jobs.docs.append(
        {
            "id": "job-1",
            "customer_id": "customer-1",
            "customer_name": "Mahesh Patel",
            "title": "Boundary wall",
            "category": "construction",
            "description": "Build wall",
            "workers_needed": 1,
            "daily_rate": 500,
            "job_date": "2026-05-03",
            "village": "Pratapgarh",
            "lat": 25.892,
            "lng": 81.944,
            "status": "open",
            "created_at": "2026-04-29T00:00:00+00:00",
        }
    )
    db.workers.docs.append(
        {
            "id": "worker-1",
            "user_id": "worker-user-1",
            "name": "Ramesh Kumar",
            "skills": ["mason"],
            "daily_rate": 500,
            "bio": "",
            "village": "Pratapgarh",
            "district": "Pratapgarh",
            "state": "UP",
            "lat": 25.892,
            "lng": 81.944,
            "available": True,
            "trust_tier": 2,
            "avg_rating": 4.5,
            "total_jobs": 10,
            "photo_url": None,
        }
    )
    patch_db(monkeypatch, db)
    customer = {"id": "customer-1", "name": "Mahesh Patel", "role": "customer"}

    run(bookings_routes.create_booking(BookingIn(job_id="job-1", worker_id="worker-1"), user=customer))

    try:
        run(bookings_routes.create_booking(BookingIn(job_id="job-1", worker_id="worker-1"), user=customer))
    except HTTPException as exc:
        assert exc.status_code == 400
        assert exc.detail == "Request already exists for this job and worker"
    else:
        raise AssertionError("Duplicate active engagement should fail")


def test_job_capacity_and_worker_date_conflict_are_blocked(monkeypatch):
    db = DummyDb()
    db.jobs.docs.extend(
        [
            {
                "id": "job-1",
                "customer_id": "customer-1",
                "customer_name": "Mahesh Patel",
                "title": "Boundary wall",
                "category": "construction",
                "description": "Build wall",
                "workers_needed": 1,
                "daily_rate": 500,
                "job_date": "2026-05-03",
                "village": "Pratapgarh",
                "lat": 25.892,
                "lng": 81.944,
                "status": "open",
                "created_at": "2026-04-29T00:00:00+00:00",
                "accepted_worker_ids": ["worker-1"],
                "filled_count": 1,
            },
            {
                "id": "job-2",
                "customer_id": "customer-1",
                "customer_name": "Mahesh Patel",
                "title": "Plastering",
                "category": "construction",
                "description": "Plaster wall",
                "workers_needed": 2,
                "daily_rate": 500,
                "job_date": "2026-05-03",
                "village": "Pratapgarh",
                "lat": 25.892,
                "lng": 81.944,
                "status": "open",
                "created_at": "2026-04-29T00:00:00+00:00",
            },
        ]
    )
    db.workers.docs.extend(
        [
            {
                "id": "worker-1",
                "user_id": "worker-user-1",
                "name": "Ramesh Kumar",
                "skills": ["mason"],
                "daily_rate": 500,
                "bio": "",
                "village": "Pratapgarh",
                "district": "Pratapgarh",
                "state": "UP",
                "lat": 25.892,
                "lng": 81.944,
                "available": True,
                "trust_tier": 2,
                "avg_rating": 4.5,
                "total_jobs": 10,
                "photo_url": None,
            },
            {
                "id": "worker-2",
                "user_id": "worker-user-2",
                "name": "Mohan Lal",
                "skills": ["mason"],
                "daily_rate": 500,
                "bio": "",
                "village": "Pratapgarh",
                "district": "Pratapgarh",
                "state": "UP",
                "lat": 25.892,
                "lng": 81.944,
                "available": True,
                "trust_tier": 2,
                "avg_rating": 4.5,
                "total_jobs": 10,
                "photo_url": None,
            },
        ]
    )
    db.engagements.docs.append(
        {
            "id": "engagement-1",
            "job_id": "job-1",
            "worker_id": "worker-1",
            "customer_id": "customer-1",
            "source": "customer_booking",
            "status": "accepted",
            "job_date": "2026-05-03",
            "created_at": "2026-04-29T00:00:00+00:00",
        }
    )
    patch_db(monkeypatch, db)
    customer = {"id": "customer-1", "name": "Mahesh Patel", "role": "customer"}

    try:
        run(bookings_routes.create_booking(BookingIn(job_id="job-1", worker_id="worker-2"), user=customer))
    except HTTPException as exc:
        assert exc.status_code == 400
        assert exc.detail == "Job is already filled"
    else:
        raise AssertionError("Filled job should fail")

    try:
        run(bookings_routes.create_booking(BookingIn(job_id="job-2", worker_id="worker-1"), user=customer))
    except HTTPException as exc:
        assert exc.status_code == 400
        assert exc.detail == "Worker already booked for this date"
    else:
        raise AssertionError("Worker date conflict should fail")


def test_active_request_limit_is_blocked(monkeypatch):
    db = DummyDb()
    db.jobs.docs.append(
        {
            "id": "job-new",
            "customer_id": "customer-1",
            "customer_name": "Mahesh Patel",
            "title": "New job",
            "category": "farm",
            "description": "Farm work",
            "workers_needed": 10,
            "daily_rate": 350,
            "job_date": "2026-05-09",
            "village": "Wardha",
            "lat": 20.7453,
            "lng": 78.6022,
            "status": "open",
            "created_at": "2026-04-29T00:00:00+00:00",
        }
    )
    db.workers.docs.append(
        {
            "id": "worker-1",
            "user_id": "worker-user-1",
            "name": "Sunita Devi",
            "skills": ["farm work"],
            "daily_rate": 320,
            "bio": "",
            "village": "Wardha",
            "district": "Wardha",
            "state": "Maharashtra",
            "lat": 20.7453,
            "lng": 78.6022,
            "available": True,
            "trust_tier": 2,
            "avg_rating": 4.5,
            "total_jobs": 10,
            "photo_url": None,
        }
    )
    for i in range(engagement_service.MAX_ACTIVE_REQUESTS_PER_WORKER):
        db.engagements.docs.append(
            {
                "id": f"engagement-{i}",
                "job_id": f"job-{i}",
                "worker_id": "worker-1",
                "customer_id": "customer-1",
                "source": "customer_booking",
                "status": "requested",
                "created_at": "2026-04-29T00:00:00+00:00",
            }
        )
    patch_db(monkeypatch, db)

    try:
        run(
            bookings_routes.create_booking(
                BookingIn(job_id="job-new", worker_id="worker-1"),
                user={"id": "customer-1", "name": "Mahesh Patel", "role": "customer"},
            )
        )
    except HTTPException as exc:
        assert exc.status_code == 400
        assert exc.detail == "Worker has too many active requests"
    else:
        raise AssertionError("Worker active request limit should fail")


def test_customer_rating_updates_booking_and_worker_aggregate_current_behavior(monkeypatch):
    db = DummyDb()
    db.workers.docs.append(
        {
            "id": "worker-1",
            "user_id": "worker-user-1",
            "name": "Ramesh Kumar",
            "skills": ["mason"],
            "daily_rate": 500,
            "bio": "",
            "village": "Pratapgarh",
            "district": "Pratapgarh",
            "state": "UP",
            "lat": 25.892,
            "lng": 81.944,
            "available": True,
            "trust_tier": 2,
            "avg_rating": 0.0,
            "total_jobs": 0,
            "photo_url": None,
        }
    )
    db.bookings.docs.extend(
        [
            {
                "id": "booking-1",
                "job_id": "job-1",
                "worker_id": "worker-1",
                "customer_id": "customer-1",
                "worker_name": "Ramesh Kumar",
                "customer_name": "Mahesh Patel",
                "job_title": "Boundary wall",
                "job_date": "2026-05-03",
                "daily_rate": 500,
                "status": "completed",
                "rating": None,
                "comment": None,
                "created_at": "2026-04-29T00:00:00+00:00",
            },
            {
                "id": "booking-2",
                "job_id": "job-2",
                "worker_id": "worker-1",
                "customer_id": "customer-2",
                "worker_name": "Ramesh Kumar",
                "customer_name": "Other Customer",
                "job_title": "Plastering",
                "job_date": "2026-05-04",
                "daily_rate": 500,
                "status": "completed",
                "rating": 3,
                "comment": "",
                "created_at": "2026-04-28T00:00:00+00:00",
            },
        ]
    )
    monkeypatch.setattr(bookings_routes, "db", db)

    response = run(
        bookings_routes.rate_booking(
            RatingIn(booking_id="booking-1", rating=5, comment="Good work"),
            user={"id": "customer-1", "name": "Mahesh Patel", "role": "customer"},
        )
    )

    assert response == {"ok": True}
    assert db.bookings.docs[0]["rating"] == 5
    assert db.bookings.docs[0]["comment"] == "Good work"
    assert db.workers.docs[0]["avg_rating"] == 4.0
    assert db.workers.docs[0]["total_jobs"] == 2
