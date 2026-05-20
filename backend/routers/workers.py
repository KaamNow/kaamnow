import os
import shutil
import uuid
from datetime import datetime, timedelta, timezone
from math import asin, cos, radians, sin, sqrt
from typing import List, Optional, Union

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from ..auth import get_current_user, get_optional_user, is_worker
from ..cloudinary_service import upload_cert_image, upload_portfolio_image
from ..cloudinary_service import upload_video as upload_worker_video
from ..db import db
from ..qr_service import generate_profile_qr
from ..schemas import BecomeWorkerIn, WorkerOut, WorkerProfileIn

router = APIRouter(prefix="/api/workers", tags=["workers"])


def _legacy_address(profile: dict) -> dict:
    address = profile.get("address") or {}
    return {
        "village": address.get("village") or profile.get("village"),
        "post": address.get("post"),
        "block": address.get("block"),
        "district": address.get("district") or profile.get("district"),
        "state": address.get("state") or profile.get("state"),
        "pincode": address.get("pincode"),
    }


def _legacy_structured_skills(profile: dict) -> list[dict]:
    structured = profile.get("structured_skills") or []
    if structured:
        return structured
    return [{"category": "Legacy", "skill": skill} for skill in profile.get("skills", [])]


def _split_skills(skills: Optional[str]) -> list[str]:
    if not skills:
        return []
    return [skill.strip().lower() for skill in skills.split(",") if skill.strip()]


def _skill_names(items: Optional[Union[list[dict], list[str]]]) -> set[str]:
    names = set()
    for item in items or []:
        if isinstance(item, dict):
            skill = item.get("skill")
            category = item.get("category")
            if skill:
                names.add(str(skill).strip().lower())
            # Include category for matching (e.g. "Painting" → "painting" matches filter "painting")
            if category and category.lower() not in ("legacy", "general", ""):
                names.add(str(category).strip().lower())
        else:
            if item:
                names.add(str(item).strip().lower())
    return names


def _skill_soft_match(worker_skills: set[str], filter_skills: list[str]) -> bool:
    """Soft match: exact OR common 5-char prefix (painter ↔ painting, electrician ↔ electrical)."""
    for fs in filter_skills:
        for ws in worker_skills:
            if fs == ws:
                return True
            min_len = min(len(fs), len(ws))
            if min_len >= 5 and fs[:5] == ws[:5]:
                return True
    return False


def _worker_skill_names(worker: dict) -> set[str]:
    return _skill_names(worker.get("structured_skills")) | _skill_names(worker.get("skills"))


def _worker_pincode(worker: dict) -> Optional[str]:
    return (worker.get("address") or {}).get("pincode")


def _worker_wage(worker: dict) -> dict:
    amount = worker.get("daily_rate")
    return {
        "amount": amount,
        "unit": "day",
        "label": f"₹{amount}/day" if amount is not None else "",
    }


def _has_complete_worker_profile(profile: dict) -> bool:
    skills = _worker_skill_names(profile)
    pincode = _worker_pincode(profile)
    return bool(skills and pincode and profile.get("daily_rate"))


def _apply_profile_completion(profile: dict) -> None:
    if _has_complete_worker_profile(profile):
        profile["availability_status"] = profile.get("availability_status") or (
            "available" if profile.get("available", True) else "not_available"
        )
        profile["available"] = profile["availability_status"] == "available"
    else:
        profile["availability_status"] = "incomplete"
        profile["available"] = False


def _hireable_worker_query() -> dict:
    return {
        "$or": [
            {"availability_status": "available"},
            {"availability_status": None, "available": True},
            {"availability_status": {"$exists": False}, "available": True},
        ]
    }


def _is_hireable_worker(worker: dict) -> bool:
    status = worker.get("availability_status")
    return status == "available" or (status is None and worker.get("available", True))


def _distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6371
    d_lat = radians(lat2 - lat1)
    d_lng = radians(lng2 - lng1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng / 2) ** 2
    return round(radius * 2 * asin(sqrt(a)), 2)


def _worker_media_defaults(worker: dict) -> dict:
    worker.setdefault("certifications", [])
    worker.setdefault("portfolio", [])
    worker.setdefault("team_size", 1)
    worker.setdefault("is_kyc_verified", False)
    worker.setdefault("monthly_cancellations", 0)
    worker.setdefault("is_available_now", False)
    worker.setdefault("skill_badges", [])
    return worker


async def _current_worker(user: dict) -> dict:
    if not is_worker(user):
        raise HTTPException(status_code=403, detail="Activate worker profile first")
    worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker profile not found")
    return _worker_media_defaults(worker)


async def _read_upload(
    file: UploadFile, allowed_prefixes: tuple[str, ...], max_bytes: int
) -> bytes:
    content_type = file.content_type or ""
    if not any(content_type.startswith(prefix) for prefix in allowed_prefixes):
        raise HTTPException(status_code=400, detail="Upload a supported file type")
    file_bytes = await file.read()
    if len(file_bytes) > max_bytes:
        raise HTTPException(status_code=413, detail="File is too large")
    return file_bytes


def _rank_worker(
    worker: dict, pincode: Optional[str], skills: list[str]
) -> tuple[int, int, float, int]:
    worker_skills = _worker_skill_names(worker)
    skill_match_count = (
        sum(1 for s in skills if _skill_soft_match(worker_skills, [s])) if skills else 0
    )
    same_pincode = bool(pincode and _worker_pincode(worker) == pincode)

    if skill_match_count and same_pincode:
        bucket = 0
    elif skill_match_count:
        bucket = 1
    elif same_pincode:
        bucket = 2
    else:
        bucket = 3

    return (
        bucket,
        -skill_match_count,
        -float(worker.get("avg_rating", 0) or 0),
        -int(worker.get("trust_tier", 0) or 0),
    )


def _enrich_worker_for_search(worker: dict, pincode: Optional[str], skills: list[str]) -> dict:
    worker_skills = _worker_skill_names(worker)
    matched_skills = sorted(worker_skills.intersection(skills)) if skills else []
    same_pincode = bool(pincode and _worker_pincode(worker) == pincode)
    bucket, _, _, _ = _rank_worker(worker, pincode, skills)
    enriched = dict(worker)
    enriched["wage"] = _worker_wage(worker)
    enriched["wage_amount"] = worker.get("daily_rate")
    enriched["wage_unit"] = "day"
    enriched["matched_skills"] = matched_skills
    enriched["skill_match"] = bool(matched_skills)
    enriched["same_pincode"] = same_pincode
    enriched["match_rank"] = bucket + 1
    enriched["response_time_minutes"] = worker.get("response_time_minutes")
    return enriched


@router.post("/profile", response_model=WorkerOut)
async def upsert_worker_profile(
    body: WorkerProfileIn,
    user: dict = Depends(get_current_user),
):
    if not is_worker(user):
        raise HTTPException(status_code=403, detail="Activate worker profile first")

    existing = await db.workers.find_one({"user_id": user["id"]})
    now = datetime.now(timezone.utc).isoformat()
    profile = body.model_dump()
    profile["address"] = _legacy_address(profile)
    profile["village"] = profile["address"]["village"] or profile["village"]
    profile["district"] = profile["address"]["district"] or profile.get("district", "")
    profile["state"] = profile["address"]["state"] or profile.get("state", "")
    profile["structured_skills"] = _legacy_structured_skills(profile)
    profile["last_active_at"] = now
    profile["user_id"] = user["id"]
    profile["name"] = user["name"]
    profile["gender"] = profile.get("gender") or user.get("gender")
    _apply_profile_completion(profile)

    if existing:
        await db.workers.update_one({"id": existing["id"]}, {"$set": profile})
        worker = await db.workers.find_one({"id": existing["id"]}, {"_id": 0})
    else:
        worker_id = str(uuid.uuid4())
        worker_doc = {
            "id": worker_id,
            **profile,
            "trust_tier": 1,
            "avg_rating": 0.0,
            "total_jobs": 0,
            "photo_url": None,
            "created_at": now,
            "certifications": [],
            "portfolio": [],
            "team_size": profile.get("team_size") or 1,
            "is_kyc_verified": False,
            "monthly_cancellations": 0,
            "is_available_now": False,
            "skill_badges": [],
        }
        await db.workers.insert_one(worker_doc)
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"is_worker": True, "has_worker_profile": True, "role": "user"}},
        )
        worker = await db.workers.find_one({"id": worker_id}, {"_id": 0})

    return _worker_media_defaults(worker)


@router.post("/become-worker")
async def become_worker(body: BecomeWorkerIn, user: dict = Depends(get_current_user)):
    existing = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="Worker profile already exists")
    now = datetime.now(timezone.utc).isoformat()
    worker_id = str(uuid.uuid4())
    structured_skills = body.structured_skills or [
        {"category": "General", "skill": skill} for skill in body.skills
    ]
    address = {
        "village": user.get("village"),
        "district": None,
        "state": None,
        "pincode": body.pincode,
    }
    worker_doc = {
        "id": worker_id,
        "user_id": user["id"],
        "name": user["name"],
        "skills": body.skills,
        "structured_skills": [
            item.model_dump() if hasattr(item, "model_dump") else item for item in structured_skills
        ],
        "daily_rate": body.daily_rate,
        "bio": body.bio or "",
        "village": user.get("village"),
        "district": None,
        "state": None,
        "lat": body.lat,
        "lng": body.lng,
        "available": True,
        "availability_status": "available",
        "address": address,
        "gender": body.gender or user.get("gender"),
        "trust_tier": 1,
        "avg_rating": 0.0,
        "total_jobs": 0,
        "photo_url": user.get("photo_url"),
        "last_active_at": now,
        "created_at": now,
        "certifications": [],
        "portfolio": [],
        "response_time_minutes": None,
        "available_from": None,
        "team_size": 1,
        "is_kyc_verified": False,
        "kyc_doc_type": None,
        "kyc_verified_at": None,
        "monthly_cancellations": 0,
        "cancellation_warned_at": None,
        "video_url": None,
        "is_available_now": False,
        "available_now_expires_at": None,
        "skill_badges": [],
    }
    await db.workers.insert_one(worker_doc)
    user_set = {"is_worker": True, "has_worker_profile": True, "role": "user"}
    if body.gender:
        user_set["gender"] = body.gender
    await db.users.update_one({"id": user["id"]}, {"$set": user_set})
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    worker_doc.pop("_id", None)
    return {"worker": worker_doc, "user": updated_user}


@router.get("", response_model=List[WorkerOut])
async def list_workers(
    skill: Optional[str] = None,
    q: Optional[str] = None,
    available_only: bool = False,
):
    query = _hireable_worker_query()
    if skill:
        query["skills"] = {"$in": [skill]}
    if q:
        query = {
            "$and": [
                query,
                {
                    "$or": [
                        {"name": {"$regex": q, "$options": "i"}},
                        {"village": {"$regex": q, "$options": "i"}},
                        {"skills": {"$regex": q, "$options": "i"}},
                    ]
                },
            ]
        }
    workers = await db.workers.find(query, {"_id": 0}).limit(200).to_list(200)
    workers.sort(key=lambda w: (-w.get("avg_rating", 0), -w.get("trust_tier", 0)))
    return [_worker_media_defaults(worker) for worker in workers]


@router.get("/search")
async def search_workers(
    pincode: Optional[str] = None,
    skills: Optional[str] = None,
    available_only: bool = False,
    q: Optional[str] = None,
    gender: Optional[str] = None,
    certified_only: bool = False,
    kyc_verified: bool = False,
    available_from: Optional[str] = None,
    min_rating: Optional[float] = None,
    max_rate: Optional[int] = None,
    team_size: Optional[int] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    user: Optional[dict] = Depends(get_optional_user),
):
    # Only use explicitly-provided pincode for filtering — never auto-fill from user profile
    explicit_pincode = pincode if (pincode and len(pincode) == 6) else None
    # User pincode used only for ranking (not filtering)
    rank_pincode = explicit_pincode or ((user or {}).get("address") or {}).get("pincode")
    selected_skills = _split_skills(skills)

    query = _hireable_worker_query()
    if gender:
        query["gender"] = gender
    if kyc_verified:
        query["is_kyc_verified"] = True
    if min_rating is not None:
        query["avg_rating"] = {"$gte": min_rating}
    if max_rate is not None:
        query["daily_rate"] = {"$lte": max_rate}
    if team_size is not None:
        query["team_size"] = {"$gte": team_size}

    workers = await db.workers.find(query, {"_id": 0}).limit(200).to_list(200)

    # Strict pincode filter — ONLY when user explicitly provided a pincode
    if explicit_pincode:
        workers = [w for w in workers if _worker_pincode(w) == explicit_pincode]

    # Filter by skill — soft match (exact + common prefix) to handle "painter" ↔ "painting"
    if selected_skills:
        workers = [w for w in workers if _skill_soft_match(_worker_skill_names(w), selected_skills)]
    if certified_only:
        workers = [
            w for w in workers if any(c.get("verified") for c in w.get("certifications", []))
        ]
    if available_from:
        workers = [
            w
            for w in workers
            if not w.get("available_from") or w.get("available_from") <= available_from
        ]

    # Text search filter (name, village, skill)
    if q:
        lq = q.lower()
        workers = [
            w
            for w in workers
            if lq in (w.get("name") or "").lower()
            or lq in (w.get("village") or "").lower()
            or any(lq in s.lower() for s in _worker_skill_names(w))
        ]

    enriched_workers = []
    for worker in workers:
        enriched = _enrich_worker_for_search(
            _worker_media_defaults(worker), rank_pincode, selected_skills
        )
        if (
            lat is not None
            and lng is not None
            and worker.get("lat") is not None
            and worker.get("lng") is not None
        ):
            enriched["distance_km"] = _distance_km(lat, lng, worker["lat"], worker["lng"])
        enriched_workers.append(enriched)
    enriched_workers.sort(key=lambda worker: _rank_worker(worker, rank_pincode, selected_skills))
    return enriched_workers


async def _get_my_worker(user: dict):
    worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker profile not found")
    return worker


@router.get("/me")
async def my_worker_profile_short(user: dict = Depends(get_current_user)):
    return await _get_my_worker(user)


@router.get("/me/profile")
async def my_worker_profile(user: dict = Depends(get_current_user)):
    return await _get_my_worker(user)


@router.patch("/profile", response_model=WorkerOut)
async def update_worker_profile(
    body: WorkerProfileIn,
    user: dict = Depends(get_current_user),
):
    """Partial profile update - only provided fields are updated."""
    if not is_worker(user):
        raise HTTPException(status_code=403, detail="Activate worker profile first")

    now = datetime.now(timezone.utc).isoformat()
    profile = body.model_dump(exclude_unset=True)
    profile["last_active_at"] = now

    # Handle address if provided
    if "address" in profile and profile["address"]:
        profile["address"] = _legacy_address(profile)
        if profile["address"]["village"]:
            profile["village"] = profile["address"]["village"]
        if profile["address"]["district"]:
            profile["district"] = profile["address"]["district"]
        if profile["address"]["state"]:
            profile["state"] = profile["address"]["state"]

    # Handle structured_skills if provided
    if "structured_skills" in profile:
        profile["structured_skills"] = profile.get("structured_skills") or []

    existing = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Worker profile not found")
    merged = {**existing, **profile}
    _apply_profile_completion(merged)
    profile["availability_status"] = merged["availability_status"]
    profile["available"] = merged["available"]

    result = await db.workers.update_one({"user_id": user["id"]}, {"$set": profile})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Worker profile not found")

    worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
    return _worker_media_defaults(worker)


@router.patch("/me/availability")
async def toggle_availability(
    body: dict,
    user: dict = Depends(get_current_user),
):
    """Toggle worker availability status. Accepts {availability_status: 'available'|'not_available'}"""
    if not is_worker(user):
        raise HTTPException(status_code=403, detail="Activate worker profile first")

    worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker profile not found")
    if not _has_complete_worker_profile(worker):
        raise HTTPException(
            status_code=400, detail="Complete worker profile before changing availability"
        )

    new_status = body.get("availability_status")
    if new_status not in ("available", "not_available"):
        raise HTTPException(
            status_code=422, detail="availability_status must be 'available' or 'not_available'"
        )

    available_bool = new_status == "available"
    now = datetime.now(timezone.utc).isoformat()

    result = await db.workers.update_one(
        {"user_id": user["id"]},
        {
            "$set": {
                "availability_status": new_status,
                "available": available_bool,
                "last_active_at": now,
            }
        },
    )
    return {"ok": True, "availability_status": new_status, "available": available_bool}


@router.post("/me/portfolio")
async def add_portfolio_item(
    caption: Optional[str] = Form(None),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    worker = await _current_worker(user)
    portfolio = list(worker.get("portfolio") or [])
    if len(portfolio) >= 6:
        raise HTTPException(status_code=400, detail="You can add up to 6 photos")
    file_bytes = await _read_upload(file, ("image/",), 5 * 1024 * 1024)
    item_id = str(uuid.uuid4())
    image_url = upload_portfolio_image(file_bytes, f"portfolio_{worker['id']}_{item_id}")
    item = {
        "id": item_id,
        "image_url": image_url,
        "caption": (caption or "")[:100] or None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    portfolio.append(item)
    await db.workers.update_one({"id": worker["id"]}, {"$set": {"portfolio": portfolio}})
    return portfolio


@router.delete("/me/portfolio/{item_id}")
async def delete_portfolio_item(item_id: str, user: dict = Depends(get_current_user)):
    from ..cloudinary_service import delete_image

    worker = await _current_worker(user)
    portfolio = list(worker.get("portfolio") or [])
    item = next((entry for entry in portfolio if entry.get("id") == item_id), None)
    if item:
        delete_image(item.get("image_url"))
    portfolio = [entry for entry in portfolio if entry.get("id") != item_id]
    await db.workers.update_one({"id": worker["id"]}, {"$set": {"portfolio": portfolio}})
    return portfolio


@router.post("/me/certifications")
async def add_certification(
    skill: str = Form(...),
    cert_name: str = Form(...),
    issued_by: Optional[str] = Form(None),
    year: Optional[int] = Form(None),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    worker = await _current_worker(user)
    file_bytes = await _read_upload(file, ("image/", "application/pdf"), 5 * 1024 * 1024)
    cert_id = str(uuid.uuid4())
    cert_url = upload_cert_image(file_bytes, f"cert_{worker['id']}_{cert_id}")
    cert = {
        "id": cert_id,
        "skill": skill[:80],
        "cert_name": cert_name[:120],
        "cert_url": cert_url,
        "issued_by": (issued_by or "")[:120] or None,
        "year": year,
        "verified": False,
        "verified_at": None,
    }
    certifications = [*list(worker.get("certifications") or []), cert]
    await db.workers.update_one({"id": worker["id"]}, {"$set": {"certifications": certifications}})
    return certifications


@router.delete("/me/certifications/{cert_id}")
async def delete_certification(cert_id: str, user: dict = Depends(get_current_user)):
    from ..cloudinary_service import delete_image

    worker = await _current_worker(user)
    certifications = list(worker.get("certifications") or [])
    cert = next((entry for entry in certifications if entry.get("id") == cert_id), None)
    if cert:
        delete_image(cert.get("cert_url"))
    certifications = [entry for entry in certifications if entry.get("id") != cert_id]
    await db.workers.update_one({"id": worker["id"]}, {"$set": {"certifications": certifications}})
    return certifications


@router.post("/me/video", response_model=WorkerOut)
async def upload_video(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    worker = await _current_worker(user)
    file_bytes = await _read_upload(file, ("video/mp4", "video/quicktime"), 50 * 1024 * 1024)
    video_url = upload_worker_video(file_bytes, f"video_{worker['id']}")
    await db.workers.update_one({"id": worker["id"]}, {"$set": {"video_url": video_url}})
    updated_worker = await db.workers.find_one({"id": worker["id"]}, {"_id": 0})
    return _worker_media_defaults(updated_worker)


@router.post("/me/available-now")
async def available_now(user: dict = Depends(get_current_user)):
    worker = await _current_worker(user)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat()
    await db.workers.update_one(
        {"id": worker["id"]},
        {"$set": {"is_available_now": True, "available_now_expires_at": expires_at}},
    )
    saved_users = await db.users.find(
        {"saved_workers": worker["id"], "push_token": {"$exists": True, "$ne": None}},
        {"_id": 0, "push_token": 1},
    ).to_list(500)
    for saved_user in saved_users:
        try:
            from ..push_service import send_push

            await send_push(
                saved_user["push_token"],
                "Local Expert is free now",
                f"{worker.get('name', 'A Local Expert')} is available for the next 4 hours.",
                {"kind": "available_now", "worker_id": worker["id"]},
            )
        except Exception:
            pass
    return {"expires_at": expires_at}


@router.delete("/me/available-now")
async def clear_available_now(user: dict = Depends(get_current_user)):
    worker = await _current_worker(user)
    await db.workers.update_one(
        {"id": worker["id"]},
        {"$set": {"is_available_now": False, "available_now_expires_at": None}},
    )
    return {"ok": True}


@router.get("/me/earnings")
async def my_earnings(user: dict = Depends(get_current_user)):
    """Monthly earnings summary + list of completed engagements for the worker."""
    worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker profile not found")

    from datetime import date
    first_of_month = date.today().replace(day=1).isoformat()

    completed = await db.engagements.find(
        {"worker_id": worker["id"], "status": "completed"},
        {"_id": 0},
    ).to_list(200)

    this_month = [e for e in completed if (e.get("updated_at") or "")[:10] >= first_of_month]
    total_this_month = sum(e.get("payment_amount") or e.get("daily_rate") or 0 for e in this_month)
    jobs_done = len(completed)

    ratings = [e["worker_rating"]["rating"] for e in completed if e.get("worker_rating")]
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else None

    return {
        "total_this_month": total_this_month,
        "jobs_done": jobs_done,
        "avg_rating": avg_rating,
        "engagements": [
            {
                "id": e["id"],
                "job_title": e.get("job_title", ""),
                "job_date": e.get("job_date", ""),
                "payment_amount": e.get("payment_amount") or e.get("daily_rate"),
            }
            for e in completed
        ],
    }


@router.get("/me/qr-code")
async def get_my_qr_code(user: dict = Depends(get_current_user)):
    worker = await _current_worker(user)
    try:
        image = generate_profile_qr(worker["id"], "https://kaamnow.com")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return StreamingResponse(
        iter([image]),
        media_type="image/png",
        headers={"Content-Disposition": 'inline; filename="kaamnow-profile-qr.png"'},
    )


@router.post("/{worker_id}/waitlist")
async def join_worker_waitlist(worker_id: str, body: dict, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "worker_id": worker_id,
        "user_id": user["id"],
        "job_category": body.get("job_category"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.worker_waitlist.update_one(
        {"worker_id": worker_id, "user_id": user["id"]}, {"$setOnInsert": doc}, upsert=True
    )
    return {"ok": True}


@router.delete("/{worker_id}/waitlist")
async def leave_worker_waitlist(worker_id: str, user: dict = Depends(get_current_user)):
    await db.worker_waitlist.delete_one({"worker_id": worker_id, "user_id": user["id"]})
    return {"ok": True}


@router.post("/me/kyc/initiate")
async def initiate_kyc(body: dict, user: dict = Depends(get_current_user)):
    worker = await _current_worker(user)
    doc_type = body.get("doc_type") or "aadhaar"
    if doc_type not in ("aadhaar", "driving_licence", "voter_id"):
        raise HTTPException(status_code=400, detail="Choose a valid document type")
    return {
        "session_id": f"kyc_{worker['id']}_{uuid.uuid4().hex[:10]}",
        "provider": "digilocker_placeholder",
        "doc_type": doc_type,
    }


@router.post("/me/kyc/verify", response_model=WorkerOut)
async def verify_kyc(body: dict, user: dict = Depends(get_current_user)):
    worker = await _current_worker(user)
    doc_type = body.get("doc_type") or "aadhaar"
    now = datetime.now(timezone.utc).isoformat()
    await db.workers.update_one(
        {"id": worker["id"]},
        {
            "$set": {
                "is_kyc_verified": True,
                "kyc_doc_type": doc_type,
                "kyc_verified_at": now,
            }
        },
    )
    updated_worker = await db.workers.find_one({"id": worker["id"]}, {"_id": 0})
    return _worker_media_defaults(updated_worker)


@router.post("/me/photo")
async def upload_photo(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload worker profile photo to Cloudinary CDN."""
    if not is_worker(user):
        raise HTTPException(status_code=403, detail="Activate worker profile first")

    from ..cloudinary_service import delete_image, upload_image

    file_bytes = await _read_upload(file, ("image/",), 5 * 1024 * 1024)
    public_id = f"worker_{user['id']}"

    # Delete old photo from Cloudinary
    worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0, "photo_url": 1})
    if worker and worker.get("photo_url"):
        delete_image(worker["photo_url"])

    photo_url = upload_image(file_bytes, public_id)
    await db.workers.update_one({"user_id": user["id"]}, {"$set": {"photo_url": photo_url}})
    await db.users.update_one({"id": user["id"]}, {"$set": {"photo_url": photo_url}})
    return {"ok": True, "photo_url": photo_url}


@router.get("/{worker_id}", response_model=WorkerOut)
async def get_worker(worker_id: str):
    worker = await db.workers.find_one({"id": worker_id}, {"_id": 0})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    if not _is_hireable_worker(worker):
        raise HTTPException(status_code=404, detail="Worker is not currently available")
    return _worker_media_defaults(worker)
