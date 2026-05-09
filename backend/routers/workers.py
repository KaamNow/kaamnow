import os
import shutil
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Union

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..auth import get_current_user, get_optional_user
from ..db import db
from ..schemas import WorkerOut, WorkerProfileIn

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
            value = item.get("skill")
        else:
            value = item
        if value:
            names.add(str(value).strip().lower())
    return names


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


def _rank_worker(worker: dict, pincode: Optional[str], skills: list[str]) -> tuple[int, int, float, int]:
    worker_skills = _worker_skill_names(worker)
    skill_match_count = len(worker_skills.intersection(skills)) if skills else 0
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
    return enriched


@router.post("/profile", response_model=WorkerOut)
async def upsert_worker_profile(
    body: WorkerProfileIn,
    user: dict = Depends(get_current_user),
):
    if user["role"] != "worker":
        raise HTTPException(status_code=403, detail="Only workers can create worker profiles")

    existing = await db.workers.find_one({"user_id": user["id"]})
    now = datetime.now(timezone.utc).isoformat()
    profile = body.model_dump()
    profile["address"] = _legacy_address(profile)
    profile["village"] = profile["address"]["village"] or profile["village"]
    profile["district"] = profile["address"]["district"] or profile.get("district", "")
    profile["state"] = profile["address"]["state"] or profile.get("state", "")
    profile["structured_skills"] = _legacy_structured_skills(profile)
    profile["availability_status"] = profile.get("availability_status") or (
        "available" if profile.get("available", True) else "not_available"
    )
    profile["last_active_at"] = now
    profile["user_id"] = user["id"]
    profile["name"] = user["name"]

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
        }
        await db.workers.insert_one(worker_doc)
        worker = await db.workers.find_one({"id": worker_id}, {"_id": 0})

    return worker


@router.get("", response_model=List[WorkerOut])
async def list_workers(
    skill: Optional[str] = None,
    q: Optional[str] = None,
    available_only: bool = False,
):
    query = {}
    if skill:
        query["skills"] = {"$in": [skill]}
    if available_only:
        query["available"] = True
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"village": {"$regex": q, "$options": "i"}},
            {"skills": {"$regex": q, "$options": "i"}},
        ]
    workers = await db.workers.find(query, {"_id": 0}).limit(200).to_list(200)
    workers.sort(key=lambda w: (-w.get("avg_rating", 0), -w.get("trust_tier", 0)))
    return workers


@router.get("/search")
async def search_workers(
    pincode: Optional[str] = None,
    skills: Optional[str] = None,
    available_only: bool = False,
    user: Optional[dict] = Depends(get_optional_user),
):
    selected_pincode = pincode or ((user or {}).get("address") or {}).get("pincode")
    selected_skills = _split_skills(skills)

    query = {}
    if available_only:
        query["available"] = True

    workers = await db.workers.find(query, {"_id": 0}).limit(200).to_list(200)
    workers.sort(key=lambda worker: _rank_worker(worker, selected_pincode, selected_skills))
    return [_enrich_worker_for_search(worker, selected_pincode, selected_skills) for worker in workers]

@router.get("/me/profile")
async def my_worker_profile(user: dict = Depends(get_current_user)):
    worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker profile not found")
    return worker


@router.patch("/profile", response_model=WorkerOut)
async def update_worker_profile(
    body: WorkerProfileIn,
    user: dict = Depends(get_current_user),
):
    """Partial profile update - only provided fields are updated."""
    if user["role"] != "worker":
        raise HTTPException(status_code=403, detail="Only workers can update profiles")

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

    result = await db.workers.update_one(
        {"user_id": user["id"]},
        {"$set": profile}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Worker profile not found")

    worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
    return worker


@router.patch("/me/availability")
async def toggle_availability(
    body: dict,
    user: dict = Depends(get_current_user),
):
    """Toggle worker availability status. Accepts {availability_status: 'available'|'not_available'}"""
    if user["role"] != "worker":
        raise HTTPException(status_code=403, detail="Only workers can update availability")

    new_status = body.get("availability_status")
    if new_status not in ("available", "not_available"):
        raise HTTPException(status_code=422, detail="availability_status must be 'available' or 'not_available'")

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
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Worker profile not found")

    return {"ok": True, "availability_status": new_status, "available": available_bool}


@router.post("/me/photo")
async def upload_photo(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload worker profile photo to local storage."""
    if user["role"] != "worker":
        raise HTTPException(status_code=403, detail="Only workers can upload photos")
    
    # Ensure directory exists
    os.makedirs("static/uploads", exist_ok=True)
    
    file_ext = file.filename.split(".")[-1]
    filename = f"{user['id']}_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = os.path.join("static/uploads", filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    photo_url = f"/static/uploads/{filename}"
    await db.workers.update_one(
        {"user_id": user["id"]},
        {"$set": {"photo_url": photo_url}}
    )
    return {"ok": True, "photo_url": photo_url}


@router.get("/{worker_id}", response_model=WorkerOut)
async def get_worker(worker_id: str):
    worker = await db.workers.find_one({"id": worker_id}, {"_id": 0})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return worker
