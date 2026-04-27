import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..db import db
from ..schemas import JobIn, JobOut
from ..utils import utc_now_iso

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.post("", response_model=JobOut)
async def create_job(body: JobIn, user: dict = Depends(get_current_user)):
    job_id = str(uuid.uuid4())
    job_doc = {
        "id": job_id,
        "customer_id": user["id"],
        "customer_name": user["name"],
        **body.model_dump(),
        "status": "open",
        "created_at": utc_now_iso(),
    }
    await db.jobs.insert_one(job_doc)
    return {k: job_doc[k] for k in JobOut.model_fields.keys()}


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


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
