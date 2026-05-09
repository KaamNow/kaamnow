import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..auth import create_token, get_current_user, hash_password, set_auth_cookie, verify_password
from ..db import db
from ..schemas import AuthResponse, LoginIn, RegisterIn, UserOut
from ..utils import utc_now_iso
import random
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

USER_OUT_FIELDS = [
    "id",
    "email",
    "name",
    "role",
    "village",
    "phone",
    "phone_verified",
    "address",
    "photo_url",
    "preferred_language",
]


def _address_from_register(body: RegisterIn) -> Optional[dict]:
    if body.address:
        return body.address.model_dump()
    if body.village:
        return {
            "village": body.village,
            "post": None,
            "block": None,
            "district": None,
            "state": None,
            "pincode": None,
        }
    return None


def _user_out(user_doc: dict) -> dict:
    return {k: user_doc.get(k) for k in USER_OUT_FIELDS}


@router.post("/register", response_model=AuthResponse)
@limiter.limit("3/minute")
async def register(request: Request, body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    address = _address_from_register(body)
    user_doc = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": body.role,
        "village": body.village or (address or {}).get("village"),
        "phone_verified": False,
        "address": address,
        "photo_url": body.photo_url,
        "preferred_language": body.preferred_language or "en",
        "created_at": utc_now_iso(),
    }
    if body.phone:
        user_doc["phone"] = body.phone
    await db.users.insert_one(user_doc)
    token = create_token(user_id, email)
    set_auth_cookie(response, token)

    return {"user": _user_out(user_doc), "token": token}


@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["id"], email)
    set_auth_cookie(response, token)
    return {"user": _user_out(user), "token": token}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return _user_out(user)


@router.patch("/me", response_model=UserOut)
async def update_me(body: dict, user: dict = Depends(get_current_user)):
    update_data = {}
    if "name" in body:
        update_data["name"] = body["name"]
    if "village" in body:
        update_data["village"] = body["village"]
    unset_data = {}
    if "phone" in body:
        if body["phone"]:
            update_data["phone"] = body["phone"]
        else:
            unset_data["phone"] = ""

    if "pincode" in body:
        address = user.get("address") or {}
        address["pincode"] = body["pincode"]
        address["village"] = body.get("village") or address.get("village") or user.get("village")
        update_data["address"] = address

    if not update_data and not unset_data:
        return _user_out(user)

    mongo_op = {}
    if update_data:
        mongo_op["$set"] = update_data
    if unset_data:
        mongo_op["$unset"] = unset_data
    await db.users.update_one({"id": user["id"]}, mongo_op)
    updated_user = await db.users.find_one({"id": user["id"]})
    
    # Also update workers collection if user is a worker
    if user["role"] == "worker":
        worker_update = {}
        if "name" in body: worker_update["name"] = body["name"]
        if "village" in body: worker_update["village"] = body["village"]
        if worker_update:
            await db.workers.update_one({"user_id": user["id"]}, {"$set": worker_update})

    return _user_out(updated_user)


@router.post("/send-otp")
@limiter.limit("5/minute")
async def send_otp(request: Request, body: dict):
    phone = body.get("phone")
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")
        
    # In a real app, integrate MSG91 or Twilio here.
    # For local testing, we just generate a mock OTP '123456'.
    mock_otp = "123456"
    
    # Store OTP temporarily in DB (or Redis)
    await db.otps.update_one(
        {"phone": phone},
        {"$set": {"phone": phone, "otp": mock_otp, "expires_at": utc_now_iso()}}, # In real app, set real expiry
        upsert=True
    )
    
    logger.info(f"Mock OTP for {phone} is {mock_otp}")
    
    return {"ok": True, "message": "OTP sent successfully (mocked to 123456)"}


@router.post("/verify-otp")
@limiter.limit("5/minute")
async def verify_otp(request: Request, body: dict, user: dict = Depends(get_current_user)):
    phone = body.get("phone")
    otp = body.get("otp")
    
    if not phone or not otp:
        raise HTTPException(status_code=400, detail="Phone and OTP are required")
        
    otp_record = await db.otps.find_one({"phone": phone, "otp": otp})
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    # Mark user as verified
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"phone": phone, "phone_verified": True}}
    )
    
    # Clean up OTP
    await db.otps.delete_one({"phone": phone})
    
    return {"ok": True}
