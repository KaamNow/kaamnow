import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..db import db
from ..schemas import WorkerOut, WorkerProfileIn

router = APIRouter(prefix="/api/workers", tags=["workers"])


@router.post("/profile", response_model=WorkerOut)
async def upsert_worker_profile(
    body: WorkerProfileIn,
    user: dict = Depends(get_current_user),
):
    if user["role"] != "worker":
        raise HTTPException(status_code=403, detail="Only workers can create worker profiles")

    existing = await db.workers.find_one({"user_id": user["id"]})
    profile = body.model_dump()
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
            "created_at": datetime.now(timezone.utc).isoformat(),
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


@router.get("/{worker_id}", response_model=WorkerOut)
async def get_worker(worker_id: str):
    worker = await db.workers.find_one({"id": worker_id}, {"_id": 0})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return worker


@router.get("/me/profile")
async def my_worker_profile(user: dict = Depends(get_current_user)):
    return await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
