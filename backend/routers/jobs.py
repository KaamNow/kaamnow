import asyncio
import math
import uuid
from typing import List, Optional, Union

from fastapi import APIRouter, Body, Depends, HTTPException

from ..auth import get_current_user, get_optional_user
from ..db import db
from ..schemas import JobIn, JobOut
from ..utils import utc_now_iso

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _legacy_address(job: dict) -> dict:
    address = job.get("address") or {}
    return {
        "village": address.get("village") or job.get("village"),
        "post": address.get("post"),
        "block": address.get("block"),
        "district": address.get("district"),
        "state": address.get("state"),
        "pincode": address.get("pincode"),
    }


def _legacy_required_skills(job: dict) -> list[dict]:
    required_skills = job.get("required_skills") or []
    if required_skills:
        return required_skills
    return [{"category": job.get("category", "Legacy"), "skill": job.get("category", "other")}]


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


def _job_skill_names(job: dict) -> set[str]:
    return (
        _skill_names(job.get("required_skills"))
        | _skill_names(job.get("skills"))
        | {str(job.get("category", "")).strip().lower()}
    )


def _job_pincode(job: dict) -> Optional[str]:
    return (job.get("address") or {}).get("pincode")


def _job_wage(job: dict) -> dict:
    amount = job.get("daily_rate")
    return {
        "amount": amount,
        "unit": "day",
        "label": f"₹{amount}/day" if amount is not None else "",
    }


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.asin(math.sqrt(a))


def _rank_job(
    job: dict, worker_lat: Optional[float], worker_lng: Optional[float], skills: list[str]
) -> tuple[int, int, float, str]:
    job_skills = _job_skill_names(job)
    skill_match_count = len(job_skills.intersection(skills)) if skills else 0

    # Distance in km (lower = closer = better)
    job_lat, job_lng = job.get("lat"), job.get("lng")
    if worker_lat and worker_lng and job_lat and job_lng:
        try:
            dist_km = _haversine_km(worker_lat, worker_lng, float(job_lat), float(job_lng))
        except Exception:
            dist_km = 9999.0
    else:
        dist_km = 9999.0

    # Primary: skill match (more = better), Secondary: distance, Tertiary: urgency, Quaternary: date
    skill_rank = -skill_match_count  # negative so higher match sorts first
    urgent_rank = 0 if job.get("urgency") == "urgent" else 1
    return (skill_rank, dist_km, urgent_rank, job.get("created_at", ""))


def _enrich_job_for_feed(
    job: dict,
    worker_lat: Optional[float],
    worker_lng: Optional[float],
    worker_pincode: Optional[str],
    skills: list[str],
) -> dict:
    job_skills = _job_skill_names(job)
    matched_skills = sorted(job_skills.intersection(skills)) if skills else []
    same_pincode = bool(worker_pincode and _job_pincode(job) == worker_pincode)

    job_lat, job_lng = job.get("lat"), job.get("lng")
    dist_km = None
    if worker_lat and worker_lng and job_lat and job_lng:
        try:
            dist_km = round(
                _haversine_km(worker_lat, worker_lng, float(job_lat), float(job_lng)), 1
            )
        except Exception:
            pass

    skill_rank, _, _, _ = _rank_job(job, worker_lat, worker_lng, skills)
    enriched = dict(job)
    enriched["wage"] = _job_wage(job)
    enriched["wage_amount"] = job.get("daily_rate")
    enriched["wage_unit"] = "day"
    enriched["matched_skills"] = matched_skills
    enriched["skill_match"] = bool(matched_skills)
    enriched["same_pincode"] = same_pincode
    enriched["distance_km"] = dist_km
    # match_rank: 1=skill+close, 2=skill only, 3=close only, 4=other
    if matched_skills and dist_km is not None and dist_km <= 50:
        enriched["match_rank"] = 1
    elif matched_skills:
        enriched["match_rank"] = 2
    elif same_pincode or (dist_km is not None and dist_km <= 50):
        enriched["match_rank"] = 3
    else:
        enriched["match_rank"] = 4
    return enriched


@router.post("", response_model=JobOut)
async def create_job(body: JobIn, user: dict = Depends(get_current_user)):
    job_id = str(uuid.uuid4())
    job_payload = body.model_dump()
    job_payload["address"] = _legacy_address(job_payload)
    job_payload["village"] = job_payload["address"]["village"] or job_payload["village"]
    job_payload["required_skills"] = _legacy_required_skills(job_payload)
    job_doc = {
        "id": job_id,
        "posted_by_user_id": user["id"],
        "posted_by_name": user.get("name", ""),
        **job_payload,
        "skills": [],
        "status": "open",
        "selected_request_id": None,
        "selected_user_id": None,
        "created_at": utc_now_iso(),
        "updated_at": utc_now_iso(),
    }
    await db.jobs.insert_one(job_doc)
    return {k: job_doc.get(k) for k in JobOut.model_fields.keys()}


def _job_out(job: dict) -> dict:
    return {k: job.get(k) for k in JobOut.model_fields.keys()}


async def _owned_job(job_id: str, user: dict) -> dict:
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("posted_by_user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="You can only manage your own jobs")
    return job


def _coerce_int(value, field_name: str) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail=f"{field_name} must be a number")
    if parsed < 0:
        raise HTTPException(status_code=400, detail=f"{field_name} cannot be negative")
    return parsed


@router.patch("/{job_id}", response_model=JobOut)
async def update_job(
    job_id: str,
    body: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """Job poster can edit an open job before it is accepted/started."""
    job = await _owned_job(job_id, user)
    if job.get("status") != "open":
        raise HTTPException(status_code=400, detail="Only open jobs can be edited")

    active_acceptance = await db.work_requests.find_one(
        {"job_id": job_id, "status": {"$in": ["accepted", "completed"]}},
        {"_id": 0, "id": 1},
    )
    if active_acceptance:
        raise HTTPException(status_code=400, detail="Cannot edit after a worker is accepted")

    updates: dict = {}
    text_fields = {
        "title": 120,
        "category": 80,
        "description": 1000,
        "village": 80,
        "urgency": 20,
        "recurrence": 20,
        "photo_url": 500,
    }
    for field, max_len in text_fields.items():
        if field in body:
            value = (body.get(field) or "").strip()
            if field in {"title", "category", "description", "village"} and not value:
                raise HTTPException(status_code=400, detail=f"{field} is required")
            updates[field] = value[:max_len]

    if "job_date" in body:
        from datetime import date as _date

        job_date = (body.get("job_date") or "").strip()
        try:
            if _date.fromisoformat(job_date) < _date.today():
                raise HTTPException(status_code=400, detail="Job date cannot be in the past")
        except ValueError:
            raise HTTPException(status_code=400, detail="Job date must be YYYY-MM-DD")
        updates["job_date"] = job_date

    for field in ("daily_rate", "workers_needed"):
        if field in body:
            value = _coerce_int(body.get(field), field)
            if field == "workers_needed" and value < 1:
                raise HTTPException(status_code=400, detail="workers_needed must be at least 1")
            updates[field] = value

    if "required_skills" in body and isinstance(body.get("required_skills"), list):
        updates["required_skills"] = body.get("required_skills")[:20]

    if "address" in body and isinstance(body.get("address"), dict):
        address = {**(job.get("address") or {}), **body["address"]}
        updates["address"] = _legacy_address({"address": address, "village": updates.get("village") or job.get("village")})
        if updates["address"].get("village"):
            updates["village"] = updates["address"]["village"]
        if updates["address"].get("pincode"):
            updates["pincode"] = updates["address"]["pincode"]

    if "pincode" in body:
        pincode = str(body.get("pincode") or "").strip()
        if pincode and (not pincode.isdigit() or len(pincode) != 6):
            raise HTTPException(status_code=400, detail="Pincode must be 6 digits")
        address = {**(job.get("address") or {}), "pincode": pincode or None}
        updates["address"] = _legacy_address({"address": address, "village": updates.get("village") or job.get("village")})
        updates["pincode"] = pincode or None

    if not updates:
        return _job_out(job)

    updates["updated_at"] = utc_now_iso()
    await db.jobs.update_one({"id": job_id}, {"$set": updates})
    updated = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    return _job_out(updated or {**job, **updates})


async def _cancel_owned_job(job_id: str, user: dict) -> dict:
    job = await _owned_job(job_id, user)
    if job.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel a completed job")
    if job.get("status") == "cancelled":
        return {"ok": True, "status": "cancelled"}

    accepted = await db.work_requests.find_one(
        {"job_id": job_id, "status": {"$in": ["accepted", "completed"]}},
        {"_id": 0, "id": 1},
    )
    if accepted:
        raise HTTPException(status_code=400, detail="Cannot cancel after a worker is accepted")

    now = utc_now_iso()
    cancel_set = {"status": "cancelled", "cancelled_at": now, "updated_at": now}
    await db.work_requests.update_many(
        {"job_id": job_id, "status": "requested"},
        {"$set": cancel_set},
    )
    await db.jobs.update_one(
        {"id": job_id},
        {"$set": {"status": "cancelled", "cancelled_at": now, "updated_at": now}},
    )
    return {"ok": True, "status": "cancelled"}


@router.post("/{job_id}/cancel")
async def cancel_job(job_id: str, user: dict = Depends(get_current_user)):
    return await _cancel_owned_job(job_id, user)


@router.delete("/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(get_current_user)):
    """Backwards-compatible delete URL: cancel the job without removing history."""
    return await _cancel_owned_job(job_id, user)


async def _alert_matching_workers(job: dict) -> None:
    """
    Find available workers matching job skills/pincode (or within 25km via haversine).
    Send a WhatsApp alert to each matched worker.
    Uses wa_notif_log to prevent duplicate sends per job per worker.
    """
    try:
        job_id = job["id"]
        job_pincode = _job_pincode(job)
        job_skills = _job_skill_names(job)
        job_lat = float(job.get("lat") or 0) or None
        job_lng = float(job.get("lng") or 0) or None

        # Available service profiles only (new schema)
        workers = (
            await db.service_profiles.find(
                {"availability": True, "is_active": True},
                {
                    "_id": 0,
                    "id": 1,
                    "user_id": 1,
                    "pincode": 1,
                    "skills": 1,
                    "categories": 1,
                },
            )
            .limit(200)
            .to_list(200)
        )

        matched = []
        for w in workers:
            w_skills = _skill_names(w.get("skills")) | _skill_names(w.get("categories"))
            w_pincode = w.get("pincode")
            skill_match = bool(job_skills & w_skills)
            same_pincode = bool(job_pincode and w_pincode and job_pincode == w_pincode)

            # Phase 1: notify workers in same pincode only
            # Phase 2 (later): change to `same_pincode and skill_match`
            if same_pincode:
                matched.append(w)

        matched = matched[:50]
        if not matched:
            return

        user_ids = [w["user_id"] for w in matched if w.get("user_id")]
        users = await db.users.find(
            {"id": {"$in": user_ids}, "phone_primary": {"$exists": True}},
            {"_id": 0, "id": 1, "phone_primary": 1},
        ).to_list(50)

        phone_by_uid = {u["id"]: u["phone_primary"] for u in users if u.get("phone_primary")}

        import threading

        now = utc_now_iso()
        for w in matched:
            uid = w.get("user_id")
            if not uid:
                continue

            # Dedup: skip if already sent for this job+worker
            already_sent = await db.wa_notif_log.find_one({"job_id": job_id, "user_id": uid})
            if already_sent:
                continue

            await db.notifications.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "user_id": uid,
                    "title": "New job near you!",
                    "body": f"{job.get('title', 'A new job')} in {job.get('village', 'your area')} — ₹{job.get('daily_rate', '?')}/day",
                    "type": "job_alert",
                    "ref_id": job_id,
                    "read": False,
                    "created_at": utc_now_iso(),
                }
            )

            # Log before sending WhatsApp
            phone = phone_by_uid.get(uid)
            await db.wa_notif_log.insert_one(
                {
                    "job_id": job_id,
                    "user_id": uid,
                    "phone": phone or "",
                    "sent_at": now,
                    "kind": "job_alert",
                }
            )

            # WhatsApp (only if phone available)
            if phone:
                threading.Thread(
                    target=notify_worker_job_alert,
                    args=(phone, job),
                    daemon=True,
                ).start()

    except Exception as exc:
        import logging

        logging.getLogger(__name__).error("Job alert dispatch failed: %s", exc)


@router.get("", response_model=List[JobOut])
async def list_jobs(category: Optional[str] = None, status: Optional[str] = None):
    query = {"is_template": {"$ne": True}}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    jobs = await db.jobs.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return jobs


@router.get("/mine", response_model=List[JobOut])
async def my_jobs(user: dict = Depends(get_current_user)):
    jobs = (
        await db.jobs.find(
            {"posted_by_user_id": user["id"]},
            {"_id": 0},
        )
        .sort("created_at", -1)
        .to_list(100)
    )
    return jobs


@router.get("/feed")
async def job_feed(
    pincode: Optional[str] = None,
    skills: Optional[str] = None,
    category: Optional[str] = None,
    user: Optional[dict] = Depends(get_optional_user),
):
    user = user or {}
    selected_pincode = pincode or (user.get("address") or {}).get("pincode")
    selected_skills = _split_skills(skills)
    worker_lat: Optional[float] = None
    worker_lng: Optional[float] = None

    if user.get("id"):
        sp = await db.service_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
        if sp:
            selected_pincode = selected_pincode or sp.get("pincode")
            if not selected_skills:
                selected_skills = list(sp.get("skills") or [])

    query: dict = {
        "status": "open",
        "is_template": {"$ne": True},
        "$expr": {"$lt": ["$filled_count", "$workers_needed"]},
    }
    if user.get("id"):
        query["posted_by_user_id"] = {"$ne": user["id"]}
    if category:
        query["category"] = category

    jobs = await db.jobs.find(query, {"_id": 0}).limit(200).to_list(200)

    # Filter expired jobs (job_date < today) — mark them expired
    from datetime import date as _date

    today_str = _date.today().isoformat()
    active_jobs = []
    expired_ids = []
    for j in jobs:
        if j.get("job_date") and j["job_date"] < today_str:
            expired_ids.append(j["id"])
        else:
            active_jobs.append(j)

    if expired_ids:
        from ..utils import utc_now_iso as _now

        await db.jobs.update_many(
            {"id": {"$in": expired_ids}}, {"$set": {"status": "expired", "expired_at": _now()}}
        )

    # Strict filters when user explicitly provides params
    if pincode and len(pincode) == 6:
        active_jobs = [j for j in active_jobs if _job_pincode(j) == pincode]

    if skills:
        selected_set = set(selected_skills)
        active_jobs = [j for j in active_jobs if _job_skill_names(j).intersection(selected_set)]

    active_jobs.sort(key=lambda job: _rank_job(job, worker_lat, worker_lng, selected_skills))
    return [
        _enrich_job_for_feed(job, worker_lat, worker_lng, selected_pincode, selected_skills)
        for job in active_jobs
    ]


@router.get("/public")
async def list_public_jobs(
    pincode: Optional[str] = None,
    category: Optional[str] = None,
    sort: str = "newest",
):
    """Public job board — no auth required, no PII returned."""
    from datetime import date as _date

    today_str = _date.today().isoformat()

    query: dict = {"status": "open", "job_date": {"$gte": today_str}}
    if category:
        query["category"] = category
    if pincode:
        query["address.pincode"] = pincode

    sort_spec = (
        [("filled_count", -1), ("created_at", -1)] if sort == "popular" else [("created_at", -1)]
    )

    raw = await db.jobs.find(query, {"_id": 0}).sort(sort_spec).limit(60).to_list(60)

    def _safe(j: dict) -> dict:
        addr = j.get("address") or {}
        return {
            "id": j.get("id", ""),
            "title": j.get("title", ""),
            "category": j.get("category", ""),
            "description": j.get("description", ""),
            "village": addr.get("village") or j.get("village", ""),
            "district": addr.get("district", ""),
            "state": addr.get("state", ""),
            "pincode": addr.get("pincode", ""),
            "daily_rate": j.get("daily_rate"),
            "workers_needed": j.get("workers_needed", 1),
            "filled_count": j.get("filled_count", 0),
            "urgency": j.get("urgency", "normal"),
            "job_date": j.get("job_date", ""),
            "created_at": j.get("created_at", ""),
            "required_skills": j.get("required_skills", []),
        }

    return [_safe(j) for j in raw]


@router.get("/templates")
async def list_templates(user: dict = Depends(get_current_user)):
    return (
        await db.jobs.find(
            {"posted_by_user_id": user["id"], "is_template": True},
            {"_id": 0},
        )
        .sort("created_at", -1)
        .to_list(100)
    )


@router.post("/templates")
async def create_template(body: dict, user: dict = Depends(get_current_user)):
    now = utc_now_iso()
    template_id = str(uuid.uuid4())
    payload = dict(body)
    payload.setdefault("workers_needed", 1)
    payload.setdefault("daily_rate", 0)
    payload.setdefault("village", ((payload.get("address") or {}).get("village") or ""))
    payload.setdefault("lat", 0.0)
    payload.setdefault("lng", 0.0)
    payload["address"] = _legacy_address(payload)
    payload["required_skills"] = _legacy_required_skills(payload)
    template_doc = {
        "id": template_id,
        "posted_by_user_id": user["id"],
        "posted_by_name": user.get("name", ""),
        "title": (payload.get("title") or payload.get("template_name") or "Job template")[:120],
        "category": payload.get("category") or "other",
        "description": (payload.get("description") or "")[:1000],
        "workers_needed": payload["workers_needed"],
        "daily_rate": payload["daily_rate"],
        "job_date": payload.get("job_date") or now[:10],
        "village": payload["address"].get("village") or payload["village"],
        "lat": payload["lat"],
        "lng": payload["lng"],
        "required_skills": payload["required_skills"],
        "address": payload["address"],
        "urgency": payload.get("urgency") or "normal",
        "recurrence": payload.get("recurrence") or "once",
        "photo_url": payload.get("photo_url"),
        "ai_generated": bool(payload.get("ai_generated", False)),
        "is_anonymous": bool(payload.get("is_anonymous", False)),
        "status": "template",
        "filled_count": 0,
        "is_template": True,
        "template_name": (payload.get("template_name") or payload.get("title") or "Template")[:60],
        "created_at": now,
    }
    await db.jobs.insert_one(template_doc)
    return template_doc


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, user: dict = Depends(get_current_user)):
    result = await db.jobs.delete_one(
        {"id": template_id, "posted_by_user_id": user["id"], "is_template": True}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"ok": True}


@router.post("/from-template/{template_id}", response_model=JobOut)
async def create_from_template(
    template_id: str, body: dict, user: dict = Depends(get_current_user)
):
    template = await db.jobs.find_one(
        {"id": template_id, "posted_by_user_id": user["id"], "is_template": True},
        {"_id": 0},
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    job_date = body.get("job_date")
    if not job_date:
        raise HTTPException(status_code=400, detail="Choose a job date")
    job_doc = {
        **template,
        "id": str(uuid.uuid4()),
        "job_date": job_date,
        "status": "open",
        "is_template": False,
        "template_name": template.get("template_name"),
        "filled_count": 0,
        "created_at": utc_now_iso(),
        "posted_by_user_id": user["id"],
        "posted_by_name": user.get("name", ""),
    }
    await db.jobs.insert_one(job_doc)
    asyncio.create_task(_alert_matching_workers(job_doc))
    return {k: job_doc.get(k) for k in JobOut.model_fields.keys()}


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/interest")
async def express_interest(job_id: str, user: dict = Depends(get_current_user)):
    """Apply to a job — creates a work_request of type job_application."""
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("status") != "open":
        raise HTTPException(status_code=400, detail="Job is not open for applications")
    posted_by = job.get("posted_by_user_id")
    if posted_by == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot apply to your own job")

    import uuid as _uuid

    from ..utils import utc_now_iso as _now

    recipient = await db.users.find_one({"id": posted_by}, {"_id": 0, "id": 1, "name": 1})
    dup = await db.work_requests.find_one(
        {
            "requested_by_user_id": user["id"],
            "job_id": job_id,
            "request_type": "job_application",
            "status": {"$in": ["requested", "accepted"]},
        }
    )
    if dup:
        raise HTTPException(status_code=400, detail="You have already applied to this job")

    now = _now()
    doc = {
        "id": str(_uuid.uuid4()),
        "requested_by_user_id": user["id"],
        "requested_by_name": user.get("name", ""),
        "requested_to_user_id": posted_by,
        "requested_to_name": (recipient or {}).get("name", ""),
        "request_type": "job_application",
        "job_id": job_id,
        "message": "",
        "status": "requested",
        "created_at": now,
        "updated_at": now,
        "accepted_at": None,
        "rejected_at": None,
        "cancelled_at": None,
        "completed_at": None,
    }
    await db.work_requests.insert_one(doc)
    doc.pop("_id", None)
    return doc
