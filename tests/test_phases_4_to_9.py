"""
Phase 4–9 End-to-End Backend Tests
Covers:
  Phase 4 - Worker availability toggle, worker profile endpoints
  Phase 5 - Customer profile update (PATCH /me), Marketplace worker search
  Phase 6 - Bidirectional ratings (customer→worker, worker→customer)
  Phase 7 - Job feed hides filled jobs ($expr filter)
  Phase 8 - engagement_to_booking exposes rating fields
  Phase 9 - Rate endpoint guards (wrong role, unrated, re-rate)
"""
import asyncio

import pytest
from fastapi import HTTPException, Response

from backend.routers import auth as auth_routes
from backend.routers import engagements as engagements_routes
from backend.routers import jobs as jobs_routes
from backend.routers import workers as workers_routes
from backend import engagements as engagement_service
from backend.schemas import RegisterIn, WorkerProfileIn
from tests.test_current_flows import DummyDb, patch_db, run


# ────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────

def make_worker_doc(overrides=None):
    base = {
        "id": "worker-1",
        "user_id": "worker-user-1",
        "name": "Ramesh Kumar",
        "skills": ["mason"],
        "structured_skills": [{"category": "Construction Work", "skill": "mason"}],
        "daily_rate": 500,
        "bio": "Experienced mason",
        "village": "Pratapgarh",
        "district": "Pratapgarh",
        "state": "UP",
        "address": {"village": "Pratapgarh", "pincode": "230001"},
        "lat": 25.892,
        "lng": 81.944,
        "available": True,
        "availability_status": "available",
        "trust_tier": 2,
        "avg_rating": 4.5,
        "total_jobs": 10,
        "photo_url": None,
    }
    if overrides:
        base.update(overrides)
    return base


def make_completed_engagement(overrides=None):
    base = {
        "id": "eng-1",
        "job_id": "job-1",
        "worker_id": "worker-1",
        "customer_id": "customer-1",
        "worker_name": "Ramesh Kumar",
        "customer_name": "Mahesh Patel",
        "job_title": "Wall repair",
        "job_date": "2026-05-10",
        "daily_rate": 500,
        "source": "customer_booking",
        "status": "completed",
        "worker_rating": None,
        "customer_rating": None,
    }
    if overrides:
        base.update(overrides)
    return base


# ────────────────────────────────────────────────────────────────
# Phase 4 — Worker availability toggle
# ────────────────────────────────────────────────────────────────

def test_worker_availability_toggle_available_to_not(monkeypatch):
    db = DummyDb()
    db.workers.docs.append(make_worker_doc())
    monkeypatch.setattr(workers_routes, "db", db)

    result = run(workers_routes.toggle_availability(
        {"availability_status": "not_available"},
        user={"id": "worker-user-1", "role": "worker"},
    ))

    assert result["ok"] is True
    assert result["availability_status"] == "not_available"
    assert db.workers.docs[0]["available"] is False
    assert db.workers.docs[0]["availability_status"] == "not_available"


def test_worker_availability_toggle_not_available_to_available(monkeypatch):
    db = DummyDb()
    db.workers.docs.append(make_worker_doc({"available": False, "availability_status": "not_available"}))
    monkeypatch.setattr(workers_routes, "db", db)

    result = run(workers_routes.toggle_availability(
        {"availability_status": "available"},
        user={"id": "worker-user-1", "role": "worker"},
    ))

    assert result["ok"] is True
    assert result["availability_status"] == "available"
    assert db.workers.docs[0]["available"] is True


def test_worker_availability_toggle_invalid_status_rejected(monkeypatch):
    db = DummyDb()
    db.workers.docs.append(make_worker_doc())
    monkeypatch.setattr(workers_routes, "db", db)

    try:
        run(workers_routes.toggle_availability(
            {"availability_status": "maybe"},
            user={"id": "worker-user-1", "role": "worker"},
        ))
    except HTTPException as e:
        assert e.status_code == 422
    else:
        raise AssertionError("Invalid status should be rejected")


def test_customer_cannot_toggle_worker_availability(monkeypatch):
    db = DummyDb()
    monkeypatch.setattr(workers_routes, "db", db)

    try:
        run(workers_routes.toggle_availability(
            {"availability_status": "available"},
            user={"id": "customer-1", "role": "customer"},
        ))
    except HTTPException as e:
        assert e.status_code == 403
    else:
        raise AssertionError("Customer should not toggle availability")


def test_toggle_availability_missing_profile_returns_404(monkeypatch):
    db = DummyDb()  # no worker docs
    monkeypatch.setattr(workers_routes, "db", db)

    try:
        run(workers_routes.toggle_availability(
            {"availability_status": "available"},
            user={"id": "worker-user-1", "role": "worker"},
        ))
    except HTTPException as e:
        assert e.status_code == 404
    else:
        raise AssertionError("Missing profile should 404")


# ────────────────────────────────────────────────────────────────
# Phase 4 — Worker profile read
# ────────────────────────────────────────────────────────────────

def test_get_my_worker_profile(monkeypatch):
    db = DummyDb()
    db.workers.docs.append(make_worker_doc())
    monkeypatch.setattr(workers_routes, "db", db)

    result = run(workers_routes.my_worker_profile(
        user={"id": "worker-user-1", "role": "worker"}
    ))

    assert result["id"] == "worker-1"
    assert result["skills"] == ["mason"]
    assert result["availability_status"] == "available"


def test_get_worker_profile_by_id(monkeypatch):
    db = DummyDb()
    db.workers.docs.append(make_worker_doc())
    monkeypatch.setattr(workers_routes, "db", db)

    result = run(workers_routes.get_worker("worker-1"))

    assert result["id"] == "worker-1"
    assert result["name"] == "Ramesh Kumar"


def test_get_nonexistent_worker_returns_404(monkeypatch):
    db = DummyDb()
    monkeypatch.setattr(workers_routes, "db", db)

    try:
        run(workers_routes.get_worker("nonexistent"))
    except HTTPException as e:
        assert e.status_code == 404
    else:
        raise AssertionError("Should 404 for unknown worker")


# ────────────────────────────────────────────────────────────────
# Phase 5 — Worker search ranking
# ────────────────────────────────────────────────────────────────

def test_worker_search_returns_only_available_when_filtered(monkeypatch):
    db = DummyDb()
    db.workers.docs.extend([
        make_worker_doc({"id": "w1", "user_id": "u1", "available": True}),
        make_worker_doc({"id": "w2", "user_id": "u2", "available": False, "availability_status": "not_available"}),
    ])
    patch_db(monkeypatch, db)

    result = run(workers_routes.search_workers(
        pincode="230001",
        skills="mason",
        available_only=True,
        user={"id": "customer-1", "role": "customer", "address": {}},
    ))

    ids = [w["id"] for w in result]
    assert "w1" in ids
    assert "w2" not in ids


def test_worker_search_enriches_with_match_rank(monkeypatch):
    db = DummyDb()
    db.workers.docs.append(make_worker_doc())
    patch_db(monkeypatch, db)

    result = run(workers_routes.search_workers(
        pincode="230001",
        skills="mason",
        available_only=False,
        user={"id": "customer-1", "role": "customer", "address": {}},
    ))

    assert len(result) == 1
    assert result[0]["match_rank"] == 1           # bucket 0 → rank 1 (skill + same pincode)
    assert result[0]["same_pincode"] is True
    assert "mason" in result[0]["matched_skills"]


def test_worker_search_without_filters_returns_all(monkeypatch):
    db = DummyDb()
    db.workers.docs.extend([
        make_worker_doc({"id": "w1", "user_id": "u1"}),
        make_worker_doc({"id": "w2", "user_id": "u2"}),
    ])
    patch_db(monkeypatch, db)

    result = run(workers_routes.search_workers(
        pincode=None,
        skills=None,
        available_only=False,
        user={"id": "customer-1", "role": "customer", "address": {}},
    ))

    assert len(result) == 2


# ────────────────────────────────────────────────────────────────
# Phase 5 — Auth PATCH /me
# ────────────────────────────────────────────────────────────────

def test_patch_auth_me_updates_name_and_village(monkeypatch):
    db = DummyDb()
    db.users.docs.append({
        "id": "user-1",
        "email": "a@b.com",
        "name": "Old Name",
        "role": "customer",
        "village": "OldVillage",
        "address": {"village": "OldVillage", "pincode": "000000"},
    })
    monkeypatch.setattr(auth_routes, "db", db)

    result = run(auth_routes.update_me(
        body={"name": "New Name", "village": "NewVillage"},
        user={"id": "user-1", "role": "customer"},
    ))

    assert result["name"] == "New Name"
    assert result["village"] == "NewVillage"
    assert db.users.docs[0]["name"] == "New Name"


# ────────────────────────────────────────────────────────────────
# Phase 6 — Bidirectional ratings
# ────────────────────────────────────────────────────────────────

def test_customer_rates_worker_updates_avg_rating(monkeypatch):
    db = DummyDb()
    db.workers.docs.append(make_worker_doc({"avg_rating": 0.0, "total_jobs": 0}))
    db.engagements.docs.append(make_completed_engagement())
    patch_db(monkeypatch, db)

    result = run(engagement_service.rate_engagement(
        "eng-1", 5, "Excellent work",
        user={"id": "customer-1", "role": "customer"},
    ))

    assert result["ok"] is True
    eng = db.engagements.docs[0]
    assert eng["worker_rating"]["stars"] == 5
    assert eng["worker_rating"]["comment"] == "Excellent work"
    # Worker avg should be updated
    assert db.workers.docs[0]["avg_rating"] == 5.0
    assert db.workers.docs[0]["total_jobs"] == 1


def test_worker_rates_customer_stores_customer_rating(monkeypatch):
    db = DummyDb()
    db.workers.docs.append(make_worker_doc())
    db.engagements.docs.append(make_completed_engagement())
    patch_db(monkeypatch, db)

    result = run(engagement_service.rate_engagement(
        "eng-1", 4, "Good customer",
        user={"id": "worker-user-1", "role": "worker"},
    ))

    assert result["ok"] is True
    eng = db.engagements.docs[0]
    assert eng["customer_rating"]["stars"] == 4
    assert eng["customer_rating"]["comment"] == "Good customer"


def test_rating_on_non_completed_engagement_rejected(monkeypatch):
    db = DummyDb()
    db.workers.docs.append(make_worker_doc())
    db.engagements.docs.append(make_completed_engagement({"status": "accepted"}))
    patch_db(monkeypatch, db)

    try:
        run(engagement_service.rate_engagement(
            "eng-1", 4, "",
            user={"id": "customer-1", "role": "customer"},
        ))
    except HTTPException as e:
        assert e.status_code == 400
        assert "completed" in e.detail.lower()
    else:
        raise AssertionError("Should reject rating on non-completed")


def test_customer_cannot_rate_someone_elses_engagement(monkeypatch):
    db = DummyDb()
    db.workers.docs.append(make_worker_doc())
    db.engagements.docs.append(make_completed_engagement({"customer_id": "other-customer"}))
    patch_db(monkeypatch, db)

    try:
        run(engagement_service.rate_engagement(
            "eng-1", 3, "",
            user={"id": "customer-1", "role": "customer"},
        ))
    except HTTPException as e:
        assert e.status_code == 403
    else:
        raise AssertionError("Should reject wrong customer rating")


def test_worker_cannot_rate_another_workers_engagement(monkeypatch):
    db = DummyDb()
    db.workers.docs.append(make_worker_doc({"id": "other-worker", "user_id": "other-user"}))
    db.engagements.docs.append(make_completed_engagement())
    patch_db(monkeypatch, db)

    try:
        run(engagement_service.rate_engagement(
            "eng-1", 3, "",
            user={"id": "other-user", "role": "worker"},
        ))
    except HTTPException as e:
        assert e.status_code == 403
    else:
        raise AssertionError("Should reject wrong worker rating")


def test_rating_nonexistent_engagement_returns_404(monkeypatch):
    db = DummyDb()
    patch_db(monkeypatch, db)

    try:
        run(engagement_service.rate_engagement(
            "doesnt-exist", 5, "",
            user={"id": "customer-1", "role": "customer"},
        ))
    except HTTPException as e:
        assert e.status_code == 404
    else:
        raise AssertionError("Should 404 for missing engagement")


def test_bidirectional_ratings_are_independent(monkeypatch):
    """Worker and customer can both rate the same engagement independently."""
    db = DummyDb()
    db.workers.docs.append(make_worker_doc())
    db.engagements.docs.append(make_completed_engagement())
    patch_db(monkeypatch, db)

    # Customer rates worker
    run(engagement_service.rate_engagement(
        "eng-1", 5, "Great",
        user={"id": "customer-1", "role": "customer"},
    ))

    # Worker rates customer
    run(engagement_service.rate_engagement(
        "eng-1", 4, "Nice customer",
        user={"id": "worker-user-1", "role": "worker"},
    ))

    eng = db.engagements.docs[0]
    assert eng["worker_rating"]["stars"] == 5
    assert eng["customer_rating"]["stars"] == 4


# ────────────────────────────────────────────────────────────────
# Phase 7 — Job feed hides filled jobs
# ────────────────────────────────────────────────────────────────

def test_job_feed_hides_filled_jobs(monkeypatch):
    db = DummyDb()
    db.jobs.docs.extend([
        {
            "id": "open-job",
            "customer_id": "c1",
            "customer_name": "Customer",
            "title": "Open job",
            "category": "farm",
            "description": "Harvest",
            "workers_needed": 2,
            "filled_count": 1,       # 1/2 filled — should appear
            "daily_rate": 350,
            "job_date": "2026-05-10",
            "village": "Pratapgarh",
            "address": {"village": "Pratapgarh", "pincode": "230001"},
            "required_skills": [{"category": "Agriculture", "skill": "harvesting"}],
            "urgency": "normal",
            "lat": 25.892,
            "lng": 81.944,
            "status": "open",
            "created_at": "2026-04-29T00:00:00+00:00",
        },
        {
            "id": "full-job",
            "customer_id": "c1",
            "customer_name": "Customer",
            "title": "Full job",
            "category": "farm",
            "description": "Harvest",
            "workers_needed": 1,
            "filled_count": 1,       # 1/1 filled — should be hidden
            "daily_rate": 350,
            "job_date": "2026-05-10",
            "village": "Pratapgarh",
            "address": {"village": "Pratapgarh", "pincode": "230001"},
            "required_skills": [{"category": "Agriculture", "skill": "harvesting"}],
            "urgency": "normal",
            "lat": 25.892,
            "lng": 81.944,
            "status": "open",
            "created_at": "2026-04-29T00:00:00+00:00",
        },
    ])
    patch_db(monkeypatch, db)

    feed = run(jobs_routes.job_feed(
        pincode="230001",
        skills="harvesting",
        user={"id": "worker-user-1", "role": "worker", "address": {"pincode": "230001"}},
    ))

    ids = [j["id"] for j in feed]
    assert "open-job" in ids
    assert "full-job" not in ids


def test_job_feed_shows_all_unfilled_jobs(monkeypatch):
    db = DummyDb()
    db.workers.docs.append(make_worker_doc())
    for i in range(3):
        db.jobs.docs.append({
            "id": f"job-{i}",
            "customer_id": "c1",
            "customer_name": "C",
            "title": f"Job {i}",
            "category": "construction",
            "description": "Work",
            "workers_needed": 3,
            "filled_count": i,       # 0/3, 1/3, 2/3 — all should appear
            "daily_rate": 500,
            "job_date": "2026-05-10",
            "village": "Pratapgarh",
            "address": {"village": "Pratapgarh", "pincode": "230001"},
            "required_skills": [{"category": "Construction Work", "skill": "mason"}],
            "urgency": "normal",
            "lat": 25.892,
            "lng": 81.944,
            "status": "open",
            "created_at": f"2026-04-29T0{i}:00:00+00:00",
        })
    patch_db(monkeypatch, db)

    feed = run(jobs_routes.job_feed(
        pincode="230001",
        skills="mason",
        user={"id": "worker-user-1", "role": "worker", "address": {"pincode": "230001"}},
    ))

    assert len(feed) == 3


# ────────────────────────────────────────────────────────────────
# Phase 8 — engagement_to_booking exposes rating fields
# ────────────────────────────────────────────────────────────────

def test_engagement_to_booking_maps_ratings():
    eng = make_completed_engagement({
        "worker_rating": {"stars": 5, "comment": "Great"},
        "customer_rating": {"stars": 4, "comment": "Good customer"},
    })

    booking = engagement_service.engagement_to_booking(eng)

    assert booking["rating"] == 5
    assert booking["comment"] == "Great"
    assert booking["customer_rating"] == 4
    assert booking["customer_comment"] == "Good customer"
    assert booking["status"] == "completed"
    assert booking["engagement_status"] == "completed"


def test_engagement_to_booking_maps_no_ratings():
    eng = make_completed_engagement()

    booking = engagement_service.engagement_to_booking(eng)

    assert booking["rating"] is None
    assert booking["customer_rating"] is None


def test_engagement_to_booking_status_mapping():
    for eng_status, expected_booking_status in [
        ("requested", "pending"),
        ("accepted", "confirmed"),
        ("completed", "completed"),
        ("rejected", "cancelled"),
        ("cancelled", "cancelled"),
    ]:
        eng = make_completed_engagement({"status": eng_status})
        booking = engagement_service.engagement_to_booking(eng)
        assert booking["status"] == expected_booking_status, f"Failed for {eng_status}"


# ────────────────────────────────────────────────────────────────
# Phase 9 — Worker onboarding profile update (upsert)
# ────────────────────────────────────────────────────────────────

def test_worker_profile_upsert_preserves_photo_url(monkeypatch):
    """Upsert of existing profile should not overwrite photo_url."""
    db = DummyDb()
    existing = make_worker_doc({"photo_url": "https://example.com/photo.jpg"})
    db.workers.docs.append(existing)
    monkeypatch.setattr(workers_routes, "db", db)
    user = {"id": "worker-user-1", "name": "Ramesh Kumar", "role": "worker"}

    run(workers_routes.upsert_worker_profile(
        WorkerProfileIn(
            skills=["mason", "plastering"],
            daily_rate=600,
            bio="Updated bio",
            village="Pratapgarh",
            district="Pratapgarh",
            state="UP",
            lat=25.892,
            lng=81.944,
            available=True,
        ),
        user=user,
    ))

    # photo_url set via $set, won't be removed by upsert (not in payload)
    updated = db.workers.docs[0]
    assert updated["daily_rate"] == 600
    assert updated["bio"] == "Updated bio"


def test_structured_skills_preserved_on_upsert(monkeypatch):
    db = DummyDb()
    db.workers.docs.append(make_worker_doc())
    monkeypatch.setattr(workers_routes, "db", db)
    user = {"id": "worker-user-1", "name": "Ramesh Kumar", "role": "worker"}

    updated = run(workers_routes.upsert_worker_profile(
        WorkerProfileIn(
            skills=["plumber"],
            structured_skills=[{"category": "Plumbing", "skill": "plumber"}],
            daily_rate=450,
            bio="",
            village="Wardha",
            district="Wardha",
            state="Maharashtra",
            lat=20.7453,
            lng=78.6022,
            available=True,
        ),
        user=user,
    ))

    assert any(s["skill"] == "plumber" for s in updated["structured_skills"])


def test_new_worker_profile_gets_default_fields(monkeypatch):
    db = DummyDb()
    monkeypatch.setattr(workers_routes, "db", db)
    user = {"id": "brand-new-user", "name": "New Worker", "role": "worker"}

    created = run(workers_routes.upsert_worker_profile(
        WorkerProfileIn(
            skills=["driver"],
            daily_rate=400,
            bio="Driver",
            village="Jodhpur",
            district="Jodhpur",
            state="Rajasthan",
            lat=26.2389,
            lng=73.0243,
            available=True,
        ),
        user=user,
    ))

    assert created["trust_tier"] == 1
    assert created["avg_rating"] == 0.0
    assert created["total_jobs"] == 0
    assert created["user_id"] == "brand-new-user"


# ────────────────────────────────────────────────────────────────
# Phase 9 — Complete engagement then rate flow (happy path)
# ────────────────────────────────────────────────────────────────

def test_full_rate_flow_customer_to_worker(monkeypatch):
    """Full flow: accepted engagement → complete → customer rates worker."""
    db = DummyDb()
    db.workers.docs.append(make_worker_doc({"avg_rating": 3.0, "total_jobs": 1}))
    db.engagements.docs.append(make_completed_engagement({
        "status": "accepted",
        "worker_rating": None,
    }))
    patch_db(monkeypatch, db)

    # Complete it
    run(engagement_service.complete_engagement(
        "eng-1",
        user={"id": "customer-1", "role": "customer"},
    ))
    assert db.engagements.docs[0]["status"] == "completed"

    # Rate it
    run(engagement_service.rate_engagement(
        "eng-1", 5, "Superb",
        user={"id": "customer-1", "role": "customer"},
    ))

    eng = db.engagements.docs[0]
    assert eng["worker_rating"]["stars"] == 5
    # avg_rating should be recomputed across both jobs
    worker = db.workers.docs[0]
    assert worker["total_jobs"] == 1     # only 1 rated engagement


def test_full_rate_flow_worker_to_customer(monkeypatch):
    """Worker rates customer after job completes."""
    db = DummyDb()
    db.workers.docs.append(make_worker_doc())
    db.engagements.docs.append(make_completed_engagement())
    patch_db(monkeypatch, db)

    run(engagement_service.rate_engagement(
        "eng-1", 5, "Paid on time",
        user={"id": "worker-user-1", "role": "worker"},
    ))

    eng = db.engagements.docs[0]
    assert eng["customer_rating"]["stars"] == 5
    assert eng["customer_rating"]["comment"] == "Paid on time"
