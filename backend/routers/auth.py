import logging
import os
import random
import secrets
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Header, HTTPException, Request, Response, UploadFile
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..auth import (
    create_temp_token,
    create_token,
    get_current_user,
    hash_password,
    set_auth_cookie,
    verify_temp_token,
)
from ..config import settings
from ..db import db
from ..otp_service import get_otp_service
from ..schemas import (
    AuthResponse,
    SendOTPRequest,
    SendOTPResponse,
    SignupCompleteRequest,
    UserOut,
    VerifyOTPRequest,
    VerifyOTPResponse,
)
from ..utils import utc_now_iso

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

USER_OUT_FIELDS = [
    "id",
    "phone_primary",
    "phone_verified",
    "name",
    "gender",
    "pincode",
    "village",
    "address",
    "photo_url",
    "preferred_language",
    "avatar_color",
    "created_at",
    "is_active",
    "push_token",
    "saved_users",
    "saved_jobs",
    "referral_code",
    "referred_by",
    "referral_count",
    "wallet_balance",
    "saved_addresses",
    "emergency_contact",
    "tc_accepted_at",
    "tc_version",
    "selfie_verified",
    "has_service_profile",
    "bio",
    "role",
    "email",
]


def _user_out(user_doc: dict) -> dict:
    out = {k: user_doc.get(k) for k in USER_OUT_FIELDS}
    out["has_service_profile"] = bool(user_doc.get("has_service_profile"))
    out["saved_users"] = out.get("saved_users") or []
    out["saved_jobs"] = out.get("saved_jobs") or []
    out["referral_count"] = out.get("referral_count") or 0
    out["wallet_balance"] = out.get("wallet_balance") or 0
    out["saved_addresses"] = out.get("saved_addresses") or []
    out["tc_version"] = out.get("tc_version") or "1.0"
    out["selfie_verified"] = bool(out.get("selfie_verified"))
    return out


async def _generate_referral_code() -> str:
    for _ in range(8):
        code = secrets.token_urlsafe(6).replace("-", "").replace("_", "").upper()[:8]
        if len(code) < 8:
            code = f"{code}{secrets.token_hex(4).upper()}"[:8]
        if not await db.users.find_one({"referral_code": code}, {"_id": 1}):
            return code
    return uuid.uuid4().hex[:8].upper()


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return _user_out(user)


@router.post("/push-token")
async def save_push_token(body: dict, user: dict = Depends(get_current_user)):
    """Save Expo push token for this device. Called on app startup after login."""
    token = body.get("token", "").strip()
    if not token or not token.startswith("ExponentPushToken["):
        raise HTTPException(status_code=400, detail="Invalid Expo push token")
    await db.users.update_one({"id": user["id"]}, {"$set": {"push_token": token}})
    return {"ok": True}


@router.patch("/me", response_model=UserOut)
async def update_me(body: dict, user: dict = Depends(get_current_user)):
    update_data = {}
    if "name" in body:
        update_data["name"] = body["name"]
    if "village" in body:
        update_data["village"] = body["village"]
    if "gender" in body:
        update_data["gender"] = body["gender"]
    if "saved_users" in body and isinstance(body["saved_users"], list):
        update_data["saved_users"] = body["saved_users"]
    if body.get("save_user_id"):
        update_data["saved_users"] = list({*(user.get("saved_users") or []), body["save_user_id"]})
    if body.get("remove_user_id"):
        update_data["saved_users"] = [
            uid for uid in (user.get("saved_users") or []) if uid != body["remove_user_id"]
        ]
    unset_data = {}
    if "phone_primary" in body:
        if body["phone_primary"]:
            update_data["phone_primary"] = body["phone_primary"]
        else:
            unset_data["phone_primary"] = ""

    address = dict(user.get("address") or {})
    address_changed = False
    if "address" in body and isinstance(body["address"], dict):
        for k, v in body["address"].items():
            address[k] = v
        address_changed = True
    if "pincode" in body:
        update_data["pincode"] = body["pincode"]
        address["pincode"] = body["pincode"]
        address_changed = True
    if "village" in body:
        address["village"] = body["village"]
        address_changed = True
    if address_changed:
        update_data["address"] = address

    if "photo_url" in body:
        if body["photo_url"]:
            update_data["photo_url"] = body["photo_url"]
        else:
            from ..cloudinary_service import delete_image

            delete_image(user.get("photo_url"))
            update_data["photo_url"] = None

    if "bio" in body:
        update_data["bio"] = str(body["bio"]).strip()[:300] if body["bio"] else ""

    if "emergency_contact" in body:
        ec = body["emergency_contact"]
        if ec and isinstance(ec, dict):
            raw_phone = str(ec.get("phone") or "").strip()
            digits = raw_phone.replace("+91", "").replace(" ", "").replace("-", "")
            normalized = f"+91{digits}" if len(digits) == 10 else raw_phone
            update_data["emergency_contact"] = {
                "name": str(ec.get("name") or "").strip(),
                "phone": normalized,
            }
        else:
            update_data["emergency_contact"] = None

    if not update_data and not unset_data:
        return _user_out(user)

    mongo_op = {}
    if update_data:
        mongo_op["$set"] = update_data
    if unset_data:
        mongo_op["$unset"] = unset_data
    await db.users.update_one({"id": user["id"]}, mongo_op)

    # Mirror name/village/gender to service profile if user has one
    sp_update = {
        k: v
        for k, v in body.items()
        if k in {"name", "village", "gender", "photo_url"} and k in update_data
    }
    if sp_update:
        sp_update["display_name"] = sp_update.pop("name", None) or update_data.get("name")
        sp_update = {k: v for k, v in sp_update.items() if v is not None}
        if sp_update:
            await db.service_profiles.update_one({"user_id": user["id"]}, {"$set": sp_update})

    updated_user = await db.users.find_one({"id": user["id"]})
    return _user_out(updated_user)


@router.post("/me/save-user/{target_user_id}", response_model=UserOut)
async def toggle_saved_user(target_user_id: str, user: dict = Depends(get_current_user)):
    saved = list(user.get("saved_users") or [])
    if target_user_id in saved:
        saved = [uid for uid in saved if uid != target_user_id]
    else:
        saved.append(target_user_id)
    await db.users.update_one({"id": user["id"]}, {"$set": {"saved_users": saved}})
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return _user_out(updated_user)


@router.get("/me/saved-users")
async def get_saved_users(user: dict = Depends(get_current_user)):
    saved_ids = user.get("saved_users") or []
    if not saved_ids:
        return []
    return await db.service_profiles.find({"user_id": {"$in": saved_ids}}, {"_id": 0}).to_list(100)


@router.post("/me/save-job/{job_id}", response_model=UserOut)
async def toggle_saved_job(job_id: str, user: dict = Depends(get_current_user)):
    saved = list(user.get("saved_jobs") or [])
    if job_id in saved:
        saved = [jid for jid in saved if jid != job_id]
    else:
        saved.append(job_id)
    await db.users.update_one({"id": user["id"]}, {"$set": {"saved_jobs": saved}})
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return _user_out(updated_user)


@router.get("/me/addresses")
async def list_addresses(user: dict = Depends(get_current_user)):
    return user.get("saved_addresses") or []


@router.post("/me/addresses", response_model=UserOut)
async def add_address(body: dict, user: dict = Depends(get_current_user)):
    address_doc = {
        "id": str(uuid.uuid4()),
        "label": (body.get("label") or "Home")[:40],
        "address": body.get("address") or {},
        "lat": body.get("lat"),
        "lng": body.get("lng"),
        "is_default": bool(body.get("is_default", False)),
    }
    saved_addresses = list(user.get("saved_addresses") or [])
    if address_doc["is_default"]:
        saved_addresses = [{**item, "is_default": False} for item in saved_addresses]
    saved_addresses.append(address_doc)
    await db.users.update_one({"id": user["id"]}, {"$set": {"saved_addresses": saved_addresses}})
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return _user_out(updated_user)


@router.patch("/me/addresses/{address_id}", response_model=UserOut)
async def update_address(address_id: str, body: dict, user: dict = Depends(get_current_user)):
    saved_addresses = list(user.get("saved_addresses") or [])
    found = False
    updated_addresses = []
    for item in saved_addresses:
        if item.get("id") == address_id:
            found = True
            next_item = {
                **item,
                **{
                    k: v
                    for k, v in body.items()
                    if k in {"label", "address", "lat", "lng", "is_default"}
                },
            }
            updated_addresses.append(next_item)
        else:
            updated_addresses.append(item)
    if not found:
        raise HTTPException(status_code=404, detail="Address not found")
    if any(item.get("id") == address_id and item.get("is_default") for item in updated_addresses):
        updated_addresses = [
            {**item, "is_default": item.get("id") == address_id} for item in updated_addresses
        ]
    await db.users.update_one({"id": user["id"]}, {"$set": {"saved_addresses": updated_addresses}})
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return _user_out(updated_user)


@router.delete("/me/addresses/{address_id}", response_model=UserOut)
async def delete_address(address_id: str, user: dict = Depends(get_current_user)):
    saved_addresses = [
        item for item in (user.get("saved_addresses") or []) if item.get("id") != address_id
    ]
    await db.users.update_one({"id": user["id"]}, {"$set": {"saved_addresses": saved_addresses}})
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return _user_out(updated_user)


@router.put("/me/emergency-contact", response_model=UserOut)
async def set_emergency_contact(body: dict, user: dict = Depends(get_current_user)):
    name = (body.get("name") or "").strip()[:100]
    raw_phone = (body.get("phone") or "").strip()
    digits = raw_phone.replace("+91", "").replace(" ", "").replace("-", "")
    phone = f"+91{digits}" if len(digits) == 10 else raw_phone
    if len(name) < 2 or len(digits) != 10:
        raise HTTPException(status_code=400, detail="Enter a valid name and 10-digit phone number")
    contact = {"name": name, "phone": phone}
    await db.users.update_one({"id": user["id"]}, {"$set": {"emergency_contact": contact}})
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return _user_out(updated_user)


@router.delete("/me/emergency-contact", response_model=UserOut)
async def delete_emergency_contact(user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$unset": {"emergency_contact": ""}})
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return _user_out(updated_user)


@router.post("/accept-terms", response_model=UserOut)
async def accept_terms(body: dict, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "tc_accepted_at": utc_now_iso(),
                "tc_version": body.get("version") or "1.0",
            }
        },
    )
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return _user_out(updated_user)


@router.post("/verify-selfie", response_model=UserOut)
async def verify_selfie(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload an image file")
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Image file is empty")
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be 5MB or smaller")
    await db.users.update_one({"id": user["id"]}, {"$set": {"selfie_verified": True}})
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return _user_out(updated_user)


# ============ PHONE EXISTENCE CHECK ============


@router.get("/check-phone")
@limiter.limit("10/minute")
async def check_phone(request: Request, phone: str):
    """Check if phone is registered. Returns exists, role, is_active, and expired status."""
    from datetime import datetime, timezone

    # Normalize: match last 10 digits — handles +91XXXXXXXXXX vs XXXXXXXXXX stored formats
    phone_digits = "".join(c for c in phone if c.isdigit())
    phone_10 = phone_digits[-10:] if len(phone_digits) >= 10 else phone_digits
    user = await db.users.find_one(
        {"phone_primary": {"$regex": phone_10, "$options": "i"}},
        {
            "_id": 0,
            "role": 1,
            "id": 1,
            "has_service_profile": 1,
            "is_active": 1,
            "deleted_at": 1,
            "permanently_deleted": 1,
        },
    )
    if not user:
        return {"exists": False, "is_active": None, "expired": False}

    is_active = user.get("is_active", True)
    permanently_deleted = user.get("permanently_deleted", False)

    expired = permanently_deleted
    if not is_active and not expired and user.get("deleted_at"):
        try:
            deleted_at = datetime.fromisoformat(user["deleted_at"].replace("Z", "+00:00"))
            expired = (datetime.now(timezone.utc) - deleted_at).days >= 30
        except Exception:
            pass

    return {
        "exists": True,
        "is_active": is_active,
        "expired": expired,
        "has_service_profile": bool(user.get("has_service_profile")),
    }


# ============ PHONE-FIRST OTP SIGNUP ============


@router.post("/send-otp", response_model=SendOTPResponse)
@limiter.limit("5/minute")
async def send_otp(request: Request, body: SendOTPRequest):
    """
    Step 1: Send OTP to phone number

    Multi-channel delivery with intelligent fallback:
      1. WhatsApp (MSG91) - fastest, instant delivery
      2. SMS (Exotel) - fallback, 30-60s DLT delay
      3. Voice OTP (IVR) - final fallback, multi-language TTS

    Currently all channels are mocked with dummy OTP "123456" for testing.
    Real OTP providers configured via environment variables:
      - MSG91_API_KEY, MSG91_SENDER_ID (WhatsApp)
      - EXOTEL_API_KEY, EXOTEL_SENDER_ID (SMS)
      - VOICE_OTP_API_KEY, TTS_API_KEY (Voice)
    """
    phone = body.phone

    # Check phone-based rate limit (max 3 requests per 5 min)
    from datetime import datetime, timedelta

    five_min_ago = datetime.utcnow() - timedelta(minutes=5)
    recent_otps = await db.otps.count_documents(
        {"phone": phone, "created_at": {"$gt": five_min_ago.isoformat()}}
    )
    if recent_otps >= 3:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Try again in 5 minutes")

    # Generate 6-digit OTP (dummy for now, real OTP generation can be swapped)
    otp_code = f"{random.randint(0, 999999):06d}"

    # Generate temporary token (valid 15 min)
    otp_token = create_temp_token(phone, expires_in=900)

    # Get OTP service and send via multi-channel fallback
    otp_service = get_otp_service()
    delivery_result = await otp_service.send_otp(
        phone=phone, otp_code=otp_code, user_language="en"  # Can be set from user preferences later
    )

    # Store OTP in database
    if delivery_result.get("success"):
        # Extract channel that succeeded (convert enum to string)
        channels_attempted = delivery_result.get("channels_attempted", [])
        sent_via = (
            str(channels_attempted[0]).replace("OTPChannel.", "")
            if channels_attempted
            else "unknown"
        )
    else:
        sent_via = "failed"

    await db.otps.update_one(
        {"phone": phone},
        {
            "$set": {
                "phone": phone,
                "otp": otp_code,
                "otp_token": otp_token,
                "token_expires_at": utc_now_iso(),
                "verification_attempts": 0,
                "sent_via": sent_via,  # whatsapp, sms, or voice
                "channels_attempted": [
                    str(ch).replace("OTPChannel.", "")
                    for ch in delivery_result.get("channels_attempted", [])
                ],
                "created_at": utc_now_iso(),
            }
        },
        upsert=True,
    )

    if not delivery_result.get("success"):
        logger.error(f"OTP delivery failed for {phone}: {delivery_result.get('error')}")
        raise HTTPException(status_code=500, detail="Failed to send OTP. Please try again.")

    logger.info(f"OTP sent to {phone} via {sent_via}: {otp_code}")

    return {
        "otp_token": otp_token,
        "expires_in": 900,
        "message": "OTP sent successfully",
        "otp_code": otp_code if settings.show_otp_in_response else None,
        "requires_optin": settings.gupshup_sandbox_mode,
    }


@router.post("/verify-otp", response_model=VerifyOTPResponse)
@limiter.limit("10/minute")
async def verify_otp(request: Request, body: VerifyOTPRequest):
    """Step 2: Verify OTP and get token for signup completion"""
    phone = body.phone
    otp_code = body.otp

    # Retrieve OTP record
    otp_record = await db.otps.find_one({"phone": phone})
    if not otp_record:
        raise HTTPException(status_code=401, detail="Invalid OTP")

    # Check if too many failed attempts
    if otp_record.get("verification_attempts", 0) >= 5:
        await db.otps.delete_one({"phone": phone})
        raise HTTPException(status_code=429, detail="Too many failed attempts. Request new OTP")

    # Verify OTP
    if otp_record["otp"] != otp_code:
        await db.otps.update_one({"phone": phone}, {"$inc": {"verification_attempts": 1}})
        raise HTTPException(status_code=401, detail="Invalid OTP")

    # OTP correct! Check if user exists
    existing_user = await db.users.find_one({"phone_primary": phone})
    created_user = existing_user is not None

    # Create new OTP token valid for 24 hours (for signup-complete flow)
    new_otp_token = create_temp_token(phone, expires_in=86400)

    # Store new token in otps record (overwrite old OTP)
    await db.otps.update_one(
        {"phone": phone},
        {
            "$set": {
                "otp_token": new_otp_token,
                "token_expires_at": utc_now_iso(),
                "verified_at": utc_now_iso(),
                "otp": None,
            }
        },
    )

    logger.info(f"OTP verified for {phone}. User exists: {created_user}")

    return {"otp_token": new_otp_token, "created_user": created_user}


@router.post("/signup-complete", response_model=AuthResponse)
@limiter.limit("5/minute")
async def signup_complete(
    request: Request,
    body: SignupCompleteRequest,
    authorization: Optional[str] = Header(None),
    referred_by: Optional[str] = None,
):
    """Step 3: Complete signup with name, create unified user account."""

    # Validate Authorization header
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")

    token = authorization.replace("Bearer ", "")
    phone = verify_temp_token(token)  # Raises HTTPException if invalid/expired

    # Validate request body
    if not 2 <= len(body.name) <= 100:
        raise HTTPException(status_code=400, detail="Name must be 2-100 characters")
    if body.password and len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be 8+ characters")

    # Check if user already exists (should not happen, but edge case)
    existing = await db.users.find_one({"phone_primary": phone})
    if existing:
        raise HTTPException(
            status_code=409, detail="This phone is already registered. Login instead"
        )

    # Create user document
    user_id = str(uuid.uuid4())
    referrer = None
    if referred_by:
        referrer = await db.users.find_one(
            {"$or": [{"referral_code": referred_by}, {"id": referred_by}]}, {"_id": 0}
        )
    user_doc = {
        "id": user_id,
        "phone_primary": phone,
        "phone_verified": True,
        "name": body.name,
        "gender": body.gender,
        "password_hash": hash_password(body.password) if body.password else None,
        "pincode": None,
        "village": None,
        "address": None,
        "photo_url": None,
        "preferred_language": body.preferred_language or "hi",
        "avatar_color": _generate_avatar_color(body.name),
        "created_at": utc_now_iso(),
        "is_active": True,
        "has_service_profile": False,
        "saved_users": [],
        "referral_code": await _generate_referral_code(),
        "referred_by": referrer.get("id") if referrer else None,
        "referral_count": 0,
        "wallet_balance": 0,
        "saved_addresses": [],
        "emergency_contact": None,
        "tc_accepted_at": None,
        "tc_version": "1.0",
        "selfie_verified": False,
    }

    # Insert into users collection
    await db.users.insert_one(user_doc)
    if referrer:
        await db.users.update_one({"id": referrer["id"]}, {"$inc": {"referral_count": 1}})

    # Create access token
    access_token = create_token(user_id, phone)

    # Clean up OTP record
    await db.otps.delete_one({"phone": phone})

    logger.info(f"User created: {user_id} (unified) via phone signup")

    return {"user": _user_out(user_doc), "access_token": access_token, "refresh_token": None}


@router.delete("/me")
async def deactivate_account(user: dict = Depends(get_current_user)):
    """Soft-delete: deactivates account. Reactivate by logging in within 30 days."""
    now = utc_now_iso()
    await db.users.update_one({"id": user["id"]}, {"$set": {"is_active": False, "deleted_at": now}})
    await db.service_profiles.update_one(
        {"user_id": user["id"]}, {"$set": {"availability": False, "is_active": False}}
    )
    await db.deactivation_log.insert_one(
        {
            "user_id": user["id"],
            "phone": user.get("phone_primary"),
            "deactivated_at": now,
            "reactivated_at": None,
        }
    )
    return {
        "ok": True,
        "message": "Account deactivated. You can reactivate within 30 days by logging in.",
    }


@router.post("/me/photo")
async def upload_user_photo(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload profile photo — stored on Cloudinary CDN."""
    from ..cloudinary_service import delete_image, upload_image

    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Image file is empty")
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be 5MB or smaller")
    public_id = f"user_{user['id']}"

    # Delete old photo from Cloudinary if it exists
    old_url = user.get("photo_url")
    if old_url:
        delete_image(old_url)

    photo_url = upload_image(file_bytes, public_id)
    await db.users.update_one({"id": user["id"]}, {"$set": {"photo_url": photo_url}})
    await db.service_profiles.update_one(
        {"user_id": user["id"]}, {"$set": {"photo_url": photo_url}}
    )
    return {"ok": True, "photo_url": photo_url}


@router.post("/login-complete", response_model=AuthResponse)
@limiter.limit("5/minute")
async def login_complete(request: Request, authorization: Optional[str] = Header(None)):
    """Complete phone-based login for existing users (after OTP verification)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")

    token = authorization.replace("Bearer ", "")
    phone = verify_temp_token(token)

    phone_digits = "".join(c for c in phone if c.isdigit())
    phone_10 = phone_digits[-10:] if len(phone_digits) >= 10 else phone_digits
    user = await db.users.find_one({"phone_primary": {"$regex": phone_10}})
    if not user:
        raise HTTPException(
            status_code=404, detail="No account found for this number. Please sign up."
        )

    # Handle deactivated accounts
    if not user.get("is_active", True):
        from datetime import datetime, timedelta, timezone

        deleted_at_str = user.get("deleted_at")
        now = datetime.now(timezone.utc)

        # Check if 30-day window has expired
        if deleted_at_str:
            try:
                deleted_at = datetime.fromisoformat(deleted_at_str.replace("Z", "+00:00"))
                days_since = (now - deleted_at).days
                if days_since >= 30:
                    # Permanently anonymize and free the phone number
                    await db.users.update_one(
                        {"id": user["id"]},
                        {
                            "$set": {
                                "phone_primary": f"DELETED_{user['id'][:8]}",
                                "name": "Deleted User",
                                "is_active": False,
                                "permanently_deleted": True,
                                "permanently_deleted_at": utc_now_iso(),
                            }
                        },
                    )
                    await db.deactivation_log.update_one(
                        {"user_id": user["id"], "reactivated_at": None},
                        {"$set": {"permanently_deleted_at": utc_now_iso()}},
                    )
                    raise HTTPException(
                        status_code=410,
                        detail="This account was permanently deleted after 30 days. Please create a new account.",
                    )
            except HTTPException:
                raise
            except Exception:
                pass  # If date parse fails, allow reactivation

        # Within 30 days — reactivate
        now_str = utc_now_iso()
        await db.users.update_one(
            {"id": user["id"]}, {"$set": {"is_active": True, "deleted_at": None}}
        )
        await db.service_profiles.update_one(
            {"user_id": user["id"]}, {"$set": {"availability": True, "is_active": True}}
        )
        await db.deactivation_log.update_one(
            {"user_id": user["id"], "reactivated_at": None},
            {"$set": {"reactivated_at": now_str}},
        )
        logger.info(f"Account reactivated: {phone}")
        user = await db.users.find_one({"phone_primary": phone})

    access_token = create_token(user["id"], phone)
    logger.info(f"Phone login complete for {phone}")

    return {
        "user": _user_out(user),
        "access_token": access_token,
        "refresh_token": None,
        "reactivated": not user.get("is_active", True),
    }


def _generate_avatar_color(name: str) -> str:
    """Generate a consistent avatar color from name initials"""
    colors = [
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#FFA07A",
        "#98D8C8",
        "#F7DC6F",
        "#BB8FCE",
        "#85C1E2",
        "#F8B88B",
        "#B4E7FF",
    ]
    # Simple hash of first char of name
    if name:
        return colors[ord(name[0].lower()) % len(colors)]
    return colors[0]
