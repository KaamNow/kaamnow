"""
Phase 1 Tests: Phone-First OTP Signup
Tests the complete flow: send-otp → verify-otp → signup-complete
"""

import pytest
from fastapi.testclient import TestClient
from backend.app import app
from backend.db import db

client = TestClient(app)

TEST_PHONE = "+918765432109"
TEST_OTP = "123456"


@pytest.mark.asyncio
async def test_send_otp_success():
    """Test: /send-otp returns otp_token"""
    response = client.post("/api/auth/send-otp", json={"phone": TEST_PHONE})
    assert response.status_code == 200
    data = response.json()
    assert "otp_token" in data
    assert data["expires_in"] == 900
    assert "OTP sent successfully" in data["message"]


@pytest.mark.asyncio
async def test_send_otp_invalid_phone():
    """Test: Invalid phone format rejected"""
    response = client.post("/api/auth/send-otp", json={"phone": "8765432109"})  # missing +91
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_verify_otp_success():
    """Test: /verify-otp returns new otp_token for signup"""
    # Send OTP first
    send_resp = client.post("/api/auth/send-otp", json={"phone": TEST_PHONE})
    assert send_resp.status_code == 200

    # Verify OTP (mock OTP is "123456")
    verify_resp = client.post("/api/auth/verify-otp", json={
        "phone": TEST_PHONE,
        "otp": TEST_OTP
    })
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert "otp_token" in data
    assert data["created_user"] == False  # new user


@pytest.mark.asyncio
async def test_verify_otp_wrong_code():
    """Test: Wrong OTP rejected"""
    client.post("/api/auth/send-otp", json={"phone": TEST_PHONE})

    verify_resp = client.post("/api/auth/verify-otp", json={
        "phone": TEST_PHONE,
        "otp": "999999"  # wrong
    })
    assert verify_resp.status_code == 401
    assert "Invalid OTP" in verify_resp.json()["detail"]


@pytest.mark.asyncio
async def test_signup_complete_creates_user():
    """Test: /signup-complete creates user + returns access token"""
    # Send OTP → Verify OTP → Complete signup
    send_resp = client.post("/api/auth/send-otp", json={"phone": TEST_PHONE})
    assert send_resp.status_code == 200

    verify_resp = client.post("/api/auth/verify-otp", json={
        "phone": TEST_PHONE,
        "otp": TEST_OTP
    })
    assert verify_resp.status_code == 200
    otp_token = verify_resp.json()["otp_token"]

    # Complete signup
    complete_resp = client.post(
        "/api/auth/signup-complete",
        json={"name": "Raj Kumar", "role": "worker"},
        headers={"Authorization": f"Bearer {otp_token}"}
    )
    assert complete_resp.status_code == 200
    data = complete_resp.json()

    user = data["user"]
    assert user["phone_primary"] == TEST_PHONE
    assert user["phone_verified"] == True
    assert user["name"] == "Raj Kumar"
    assert user["role"] == "worker"
    assert "access_token" in data
    assert data["access_token"] is not None


@pytest.mark.asyncio
async def test_signup_complete_missing_auth():
    """Test: signup-complete requires Authorization header"""
    response = client.post(
        "/api/auth/signup-complete",
        json={"name": "Test", "role": "worker"}
    )
    assert response.status_code == 401
    assert "Authorization required" in response.json()["detail"]


@pytest.mark.asyncio
async def test_signup_complete_invalid_name():
    """Test: Name validation"""
    send_resp = client.post("/api/auth/send-otp", json={"phone": TEST_PHONE})
    verify_resp = client.post("/api/auth/verify-otp", json={
        "phone": TEST_PHONE,
        "otp": TEST_OTP
    })
    otp_token = verify_resp.json()["otp_token"]

    # Try with name too short
    response = client.post(
        "/api/auth/signup-complete",
        json={"name": "A", "role": "worker"},
        headers={"Authorization": f"Bearer {otp_token}"}
    )
    assert response.status_code == 400
    assert "2-100 characters" in response.json()["detail"]


@pytest.mark.asyncio
async def test_duplicate_signup():
    """Test: Can't signup same phone twice"""
    # First signup
    send_resp = client.post("/api/auth/send-otp", json={"phone": TEST_PHONE})
    verify_resp = client.post("/api/auth/verify-otp", json={
        "phone": TEST_PHONE,
        "otp": TEST_OTP
    })
    otp_token = verify_resp.json()["otp_token"]

    client.post(
        "/api/auth/signup-complete",
        json={"name": "First User", "role": "worker"},
        headers={"Authorization": f"Bearer {otp_token}"}
    )

    # Try signup again with same phone
    send_resp2 = client.post("/api/auth/send-otp", json={"phone": TEST_PHONE})
    verify_resp2 = client.post("/api/auth/verify-otp", json={
        "phone": TEST_PHONE,
        "otp": TEST_OTP
    })
    otp_token2 = verify_resp2.json()["otp_token"]

    complete_resp2 = client.post(
        "/api/auth/signup-complete",
        json={"name": "Second User", "role": "customer"},
        headers={"Authorization": f"Bearer {otp_token2}"}
    )
    assert complete_resp2.status_code == 409
    assert "already registered" in complete_resp2.json()["detail"]
