import asyncio
import math
import uuid
from typing import List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..db import db
from ..engagements import create_engagement_request
from ..schemas import JobIn, JobOut
from ..utils import utc_now_iso
from ..whatsapp_notify import notify_worker_job_alert

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
    return _skill_names(job.get("required_skills")) | _skill_names(job.get("skills")) | {
        str(job.get("category", "")).strip().lower()
    }


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
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _rank_job(job: dict, worker_lat: Optional[float], worker_lng: Optional[float], skills: list[str]) -> tuple[int, int, float, str]:
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


def _enrich_job_for_feed(job: dict, worker_lat: Optional[float], worker_lng: Optional[float], worker_pincode: Optional[str], skills: list[str]) -> dict:
    job_skills = _job_skill_names(job)
    matched_skills = sorted(job_skills.intersection(skills)) if skills else []
    same_pincode = bool(worker_pincode and _job_pincode(job) == worker_pincode)

    job_lat, job_lng = job.get("lat"), job.get("lng")
    dist_km = None
    if worker_lat and worker_lng and job_lat and job_lng:
        try:
            dist_km = round(_haversine_km(worker_lat, worker_lng, float(job_lat), float(job_lng)), 1)
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
    if user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Only customers can post jobs")
    job_id = str(uuid.uuid4())
    job_payload = body.model_dump()
    job_payload["address"] = _legacy_address(job_payload)
    job_payload["village"] = job_payload["address"]["village"] or job_payload["village"]
    job_payload["required_skills"] = _legacy_required_skills(job_payload)
    job_doc = {
        "id": job_id,
        "customer_id": user["id"],
        "customer_name": user["name"],
        **job_payload,
        "status": "open",
        "filled_count": 0,
        "accepted_worker_ids": [],
        "created_at": utc_now_iso(),
    }
    await db.jobs.insert_one(job_doc)

    # Fire WhatsApp job alerts to matching available workers (non-blocking)
    asyncio.create_task(_alert_matching_workers(job_doc))

    return {k: job_doc.get(k) for k in JobOut.model_fields.keys()}


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

        # Available workers only
        workers = await db.workers.find(
            {"available": True},
            {"_id": 0, "id": 1, "user_id": 1, "address": 1, "structured_skills": 1, "skills": 1, "lat": 1, "lng": 1}
        ).limit(200).to_list(200)

        matched = []
        for w in workers:
            w_skills = _skill_names(w.get("structured_skills")) | _skill_names(w.get("skills"))
            w_pincode = (w.get("address") or {}).get("pincode")
            skill_match = bool(job_skills & w_skills)
            same_pincode = bool(job_pincode and w_pincode and job_pincode == w_pincode)

            nearby = False
            if job_lat and job_lng:
                try:
                    w_lat = float(w.get("lat") or 0)
                    w_lng = float(w.get("lng") or 0)
                    if w_lat and w_lng:
                        nearby = _haversine_km(job_lat, job_lng, w_lat, w_lng) <= 25.0
                except Exception:
                    pass

            if skill_match or same_pincode or nearby:
                matched.append(w)

        matched = matched[:50]
        if not matched:
            return

        user_ids = [w["user_id"] for w in matched if w.get("user_id")]
        users = await db.users.find(
            {"id": {"$in": user_ids}, "phone": {"$exists": True}},
            {"_id": 0, "id": 1, "phone": 1}
        ).to_list(50)

        phone_by_uid = {u["id"]: u["phone"] for u in users if u.get("phone")}

        import threading
        now = utc_now_iso()
        for w in matched:
            uid = w.get("user_id")
            phone = phone_by_uid.get(uid)
            if not phone:
                continue

            # Dedup: skip if already sent for this job+worker
            already_sent = await db.wa_notif_log.find_one({"job_id": job_id, "user_id": uid})
            if already_sent:
                continue

            # Log before sending
            await db.wa_notif_log.insert_one({
                "job_id": job_id,
                "user_id": uid,
                "phone": phone,
                "sent_at": now,
                "kind": "job_alert",
            })

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
    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    jobs = await db.jobs.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return jobs


@router.get("/mine", response_model=List[JobOut])
async def my_jobs(user: dict = Depends(get_current_user)):
    jobs = await db.jobs.find({"customer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return jobs


@router.get("/feed")
async def job_feed(
    pincode: Optional[str] = None,
    skills: Optional[str] = None,
    category: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    selected_pincode = pincode or (user.get("address") or {}).get("pincode")
    selected_skills = _split_skills(skills)
    worker_lat: Optional[float] = None
    worker_lng: Optional[float] = None

    if user["role"] == "worker":
        worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
        if worker:
            selected_pincode = selected_pincode or (worker.get("address") or {}).get("pincode")
            if not selected_skills:
                selected_skills = sorted(_skill_names(worker.get("structured_skills")) | _skill_names(worker.get("skills")))
            try:
                worker_lat = float(worker.get("lat") or 0) or None
                worker_lng = float(worker.get("lng") or 0) or None
            except (TypeError, ValueError):
                pass

    query: dict = {
        "status": "open",
        "$expr": {"$lt": ["$filled_count", "$workers_needed"]}
    }
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
            {"id": {"$in": expired_ids}},
            {"$set": {"status": "expired", "expired_at": _now()}}
        )

    active_jobs.sort(key=lambda job: _rank_job(job, worker_lat, worker_lng, selected_skills))
    return [_enrich_job_for_feed(job, worker_lat, worker_lng, selected_pincode, selected_skills) for job in active_jobs]


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

    sort_spec = [("filled_count", -1), ("created_at", -1)] if sort == "popular" else [("created_at", -1)]

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


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/interest")
async def express_interest(job_id: str, user: dict = Depends(get_current_user)):
    if user["role"] != "worker":
        raise HTTPException(status_code=403, detail="Only workers can express interest")
    worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker profile not found")
    return await create_engagement_request(
        job_id=job_id,
        worker_id=worker["id"],
        source="worker_interest",
        user=user,
    )
