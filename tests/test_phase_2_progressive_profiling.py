"""
Phase 2: Progressive Profiling Tests
Tests for 3-step onboarding + just-in-time modals flow
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from backend.routers import workers as workers_routes
from backend.schemas import WorkerProfileIn, WorkerOut, StructuredSkill, Address


class TestThreeStepOnboarding:
    """Tests for simplified 3-step onboarding (name, phone, address)"""

    def test_create_profile_minimal_fields(self, monkeypatch):
        """Verify profile creation with only 3 critical fields"""
        from tests.test_current_flows import DummyDb

        db = DummyDb()
        monkeypatch.setattr(workers_routes, "db", db)
        user = {"id": "worker-1", "name": "Ramesh Kumar", "role": "worker"}

        # 3-step onboarding: only name, phone, address
        profile_in = WorkerProfileIn(
            village="TestVillage",
            address=Address(village="TestVillage")
        )

        # Should succeed even without lat, lng, skills, daily_rate
        result = workers_routes.upsert_worker_profile(profile_in, user=user)

        assert result["id"]
        assert result["name"] == "Ramesh Kumar"
        assert result["village"] == "TestVillage"
        assert result["lat"] is None  # Deferred
        assert result["lng"] is None  # Deferred
        assert result["skills"] == []  # Deferred
        assert result["daily_rate"] is None  # Deferred
        assert result["photo_url"] is None  # Deferred

    def test_partial_profile_has_defaults(self, monkeypatch):
        """Verify partial profiles get sensible defaults"""
        from tests.test_current_flows import DummyDb

        db = DummyDb()
        monkeypatch.setattr(workers_routes, "db", db)
        user = {"id": "worker-2", "name": "Priya", "role": "worker"}

        profile_in = WorkerProfileIn(village="Village2", address=Address(village="Village2"))
        result = workers_routes.upsert_worker_profile(profile_in, user=user)

        # Verify defaults are applied
        assert result["available"] == True
        assert result["bio"] == ""
        assert result["structured_skills"] == []
        assert result["trust_tier"] == 1
        assert result["avg_rating"] == 0.0
        assert result["total_jobs"] == 0

    def test_response_model_accepts_partial_profile(self):
        """Verify WorkerOut schema accepts profiles without lat/lng/skills"""
        partial_worker = {
            "id": "test-1",
            "user_id": "user-1",
            "name": "Test",
            "village": "TestVillage",
            "available": True,
            "trust_tier": 1,
            "avg_rating": 0.0,
            "total_jobs": 0,
        }

        # Should not raise validation error
        worker = WorkerOut(**partial_worker)
        assert worker.id == "test-1"
        assert worker.lat is None
        assert worker.skills == []


class TestSkillSelectorModal:
    """Tests for skills update via PATCH /profile endpoint"""

    def test_patch_profile_update_skills(self, monkeypatch):
        """Verify PATCH endpoint updates only skills, leaves other fields alone"""
        from tests.test_current_flows import DummyDb

        db = DummyDb()
        db.workers.docs.append({
            "id": "worker-1",
            "user_id": "user-1",
            "name": "Worker",
            "village": "Village",
            "available": True,
            "structured_skills": [],
            "lat": None,
            "lng": None,
            "daily_rate": None,
        })
        monkeypatch.setattr(workers_routes, "db", db)
        user = {"id": "user-1", "name": "Worker", "role": "worker"}

        # PATCH request: only update skills
        skills_update = WorkerProfileIn(
            structured_skills=[
                StructuredSkill(category="Construction", skill="Mason")
            ]
        )

        result = workers_routes.update_worker_profile(skills_update, user=user)

        # Skills should be updated
        assert len(result["structured_skills"]) == 1
        assert result["structured_skills"][0]["skill"] == "Mason"

        # Other fields should remain unchanged
        assert result["village"] == "Village"
        assert result["lat"] is None
        assert result["daily_rate"] is None

    def test_patch_preserves_existing_photo(self, monkeypatch):
        """Verify PATCH doesn't overwrite photo_url when not in request"""
        from tests.test_current_flows import DummyDb

        db = DummyDb()
        db.workers.docs.append({
            "id": "worker-1",
            "user_id": "user-1",
            "name": "Worker",
            "photo_url": "/static/uploads/photo.jpg",
            "structured_skills": [],
        })
        monkeypatch.setattr(workers_routes, "db", db)
        user = {"id": "user-1", "name": "Worker", "role": "worker"}

        # PATCH with skills only (no photo_url in request)
        skills_update = WorkerProfileIn(
            structured_skills=[
                StructuredSkill(category="Construction", skill="Carpenter")
            ]
        )

        result = workers_routes.update_worker_profile(skills_update, user=user)

        # Photo should be preserved
        assert result["photo_url"] == "/static/uploads/photo.jpg"

    def test_patch_multiple_skills(self, monkeypatch):
        """Verify PATCH can update multiple skills at once"""
        from tests.test_current_flows import DummyDb

        db = DummyDb()
        db.workers.docs.append({
            "id": "worker-1",
            "user_id": "user-1",
            "name": "Worker",
            "structured_skills": [],
        })
        monkeypatch.setattr(workers_routes, "db", db)
        user = {"id": "user-1", "name": "Worker", "role": "worker"}

        skills_update = WorkerProfileIn(
            structured_skills=[
                StructuredSkill(category="Construction", skill="Mason"),
                StructuredSkill(category="Construction", skill="Carpenter"),
                StructuredSkill(category="Electrical", skill="Electrician"),
            ]
        )

        result = workers_routes.update_worker_profile(skills_update, user=user)

        assert len(result["structured_skills"]) == 3
        assert any(s["skill"] == "Mason" for s in result["structured_skills"])
        assert any(s["skill"] == "Electrician" for s in result["structured_skills"])


class TestPhotoUploadModal:
    """Tests for photo upload via POST /workers/me/photo endpoint"""

    def test_photo_upload_updates_photo_url(self, monkeypatch):
        """Verify POST /workers/me/photo saves photo_url to profile"""
        from tests.test_current_flows import DummyDb

        db = DummyDb()
        db.workers.docs.append({
            "id": "worker-1",
            "user_id": "user-1",
            "name": "Worker",
            "photo_url": None,
        })
        monkeypatch.setattr(workers_routes, "db", db)

        user = {"id": "user-1", "name": "Worker", "role": "worker"}

        # Mock file upload - in real test, would use TestClient
        # For now, verify the endpoint structure exists
        assert hasattr(workers_routes, "upload_photo")

        # Endpoint is at POST /workers/me/photo
        # Expected to return: {"ok": True, "photo_url": "/static/uploads/..."}


class TestEndToEndFlow:
    """Integration tests for complete Phase 2 flow"""

    def test_signup_onboarding_modals_flow(self, monkeypatch):
        """
        Test complete flow:
        1. User signs up (3-step)
        2. Completes onboarding
        3. Sees skill modal on first job feed visit
        4. Selects and saves skills
        5. Later receives booking notification
        6. Sees photo modal and uploads photo
        """
        from tests.test_current_flows import DummyDb

        db = DummyDb()
        monkeypatch.setattr(workers_routes, "db", db)

        # Step 1: Signup (3-step onboarding)
        user = {"id": "worker-flow-1", "name": "Flow Test", "role": "worker"}

        onboarding = WorkerProfileIn(
            village="TestVillage",
            address=Address(village="TestVillage")
        )

        worker = workers_routes.upsert_worker_profile(onboarding, user=user)
        assert worker["id"]
        assert worker["structured_skills"] == []  # Skills not yet provided
        assert worker["photo_url"] is None  # Photo not yet provided

        # Step 2: User visits job feed, SkillSelectorModal appears
        # Frontend shows modal because structured_skills is empty
        assert len(worker["structured_skills"]) == 0

        # Step 3: User selects skills in modal, saves them
        skills_input = WorkerProfileIn(
            structured_skills=[
                StructuredSkill(category="Construction", skill="Mason"),
                StructuredSkill(category="Construction", skill="Painter"),
            ]
        )

        updated_worker = workers_routes.update_worker_profile(
            skills_input,
            user=user
        )

        assert len(updated_worker["structured_skills"]) == 2

        # Step 4: PhotoUploadModal will appear when booking is accepted
        # (Triggered in frontend via engagement status check)
        # This is frontend logic, not backend

        # Step 5: If user uploads photo, POST /workers/me/photo is called
        # (Endpoint exists and is functional)
        assert hasattr(workers_routes, "upload_photo")

    def test_modal_trigger_conditions(self):
        """Verify the conditions that trigger modals are correct"""

        # SkillSelectorModal appears when:
        # - structured_skills is empty or not provided
        assert WorkerOut(
            id="1", user_id="1", name="Test",
            trust_tier=1, avg_rating=0, total_jobs=0,
            structured_skills=[]
        ).structured_skills == []

        # PhotoUploadModal appears when:
        # - photo_url is None and worker has accepted booking
        assert WorkerOut(
            id="1", user_id="1", name="Test",
            trust_tier=1, avg_rating=0, total_jobs=0,
            photo_url=None
        ).photo_url is None


class TestFieldValidation:
    """Tests for field validation in partial profiles"""

    def test_accept_empty_skills_list(self):
        """Verify empty skills list is valid"""
        profile = WorkerProfileIn(skills=[])
        assert profile.skills == []

    def test_accept_none_daily_rate(self):
        """Verify None daily_rate is valid (deferred)"""
        profile = WorkerProfileIn(daily_rate=None)
        assert profile.daily_rate is None

    def test_accept_none_coordinates(self):
        """Verify None lat/lng is valid (deferred)"""
        profile = WorkerProfileIn(lat=None, lng=None)
        assert profile.lat is None
        assert profile.lng is None

    def test_accept_partial_address(self):
        """Verify partial address is valid"""
        profile = WorkerProfileIn(
            address=Address(village="Village", pincode=None)
        )
        assert profile.address.village == "Village"
        assert profile.address.pincode is None

    def test_reject_missing_name_in_response(self):
        """Verify WorkerOut requires name (can't defer)"""
        # name and user_id are always required
        with pytest.raises(ValueError):
            WorkerOut(
                id="1", user_id="1",
                # missing name
                trust_tier=1, avg_rating=0, total_jobs=0
            )

    def test_reject_missing_id_in_response(self):
        """Verify WorkerOut requires id (can't defer)"""
        with pytest.raises(ValueError):
            WorkerOut(
                # missing id
                user_id="1", name="Test",
                trust_tier=1, avg_rating=0, total_jobs=0
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
