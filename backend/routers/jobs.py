import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..db import db
from ..engagements import create_engagement_request
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


def _skill_names(items: list[dict] | list[str] | None) -> set[str]:
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


def _job_pincode(job: dict) -> str | None:
    return (job.get("address") or {}).get("pincode")


def _job_wage(job: dict) -> dict:
    amount = job.get("daily_rate")
    return {
        "amount": amount,
        "unit": "day",
        "label": f"₹{amount}/day" if amount is not None else "",
    }


def _rank_job(job: dict, pincode: str | None, skills: list[str]) -> tuple[int, int, str]:
    job_skills = _job_skill_names(job)
    skill_match_count = len(job_skills.intersection(skills)) if skills else 0
    same_pincode = bool(pincode and _job_pincode(job) == pincode)

    if skill_match_count and same_pincode:
        bucket = 0
    elif skill_match_count:
        bucket = 1
    elif same_pincode:
        bucket = 2
    else:
        bucket = 3

    urgent_rank = 0 if job.get("urgency") == "urgent" else 1
    return (bucket, urgent_rank, job.get("created_at", ""))


def _enrich_job_for_feed(job: dict, pincode: str | None, skills: list[str]) -> dict:
    job_skills = _job_skill_names(job)
    matched_skills = sorted(job_skills.intersection(skills)) if skills else []
    same_pincode = bool(pincode and _job_pincode(job) == pincode)
    bucket, _, _ = _rank_job(job, pincode, skills)
    enriched = dict(job)
    enriched["wage"] = _job_wage(job)
    enriched["wage_amount"] = job.get("daily_rate")
    enriched["wage_unit"] = "day"
    enriched["matched_skills"] = matched_skills
    enriched["skill_match"] = bool(matched_skills)
    enriched["same_pincode"] = same_pincode
    enriched["match_rank"] = bucket + 1
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
        "customer_id": user["id"],
        "customer_name": user["name"],
        **job_payload,
        "status": "open",
        "filled_count": 0,
        "accepted_worker_ids": [],
        "created_at": utc_now_iso(),
    }
    await db.jobs.insert_one(job_doc)
    return {k: job_doc.get(k) for k in JobOut.model_fields.keys()}


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
    user: dict = Depends(get_current_user),
):
    selected_pincode = pincode or (user.get("address") or {}).get("pincode")
    selected_skills = _split_skills(skills)

    if user["role"] == "worker":
        worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
        if worker:
            selected_pincode = selected_pincode or (worker.get("address") or {}).get("pincode")
            if not selected_skills:
                selected_skills = sorted(_skill_names(worker.get("structured_skills")) | _skill_names(worker.get("skills")))

    # Hide jobs that are already filled
    jobs = await db.jobs.find(
        {
            "status": "open",
            "$expr": {"$lt": ["$filled_count", "$workers_needed"]}
        },
        {"_id": 0}
    ).limit(200).to_list(200)
    
    jobs.sort(key=lambda job: _rank_job(job, selected_pincode, selected_skills))
    return [_enrich_job_for_feed(job, selected_pincode, selected_skills) for job in jobs]


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
