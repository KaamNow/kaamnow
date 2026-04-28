import uuid
from typing import Literal

from fastapi import HTTPException

from .db import db
from .utils import utc_now_iso

ACTIVE_ENGAGEMENT_STATUSES = ["requested", "accepted"]
MAX_ACTIVE_REQUESTS_PER_WORKER = 5
MAX_ACTIVE_REQUESTS_PER_CUSTOMER = 10

ENGAGEMENT_TO_BOOKING_STATUS = {
    "requested": "pending",
    "accepted": "confirmed",
    "rejected": "cancelled",
    "completed": "completed",
    "cancelled": "cancelled",
}


def booking_status_from_engagement(status: str) -> str:
    return ENGAGEMENT_TO_BOOKING_STATUS.get(status, status)


def engagement_to_booking(engagement: dict) -> dict:
    return {
        "id": engagement["id"],
        "job_id": engagement["job_id"],
        "worker_id": engagement["worker_id"],
        "customer_id": engagement["customer_id"],
        "worker_name": engagement.get("worker_name"),
        "customer_name": engagement.get("customer_name"),
        "job_title": engagement.get("job_title"),
        "job_date": engagement.get("job_date"),
        "daily_rate": engagement.get("daily_rate"),
        "status": booking_status_from_engagement(engagement.get("status", "")),
        "rating": (engagement.get("worker_rating") or {}).get("stars"),
        "comment": (engagement.get("worker_rating") or {}).get("comment"),
        "customer_rating": (engagement.get("customer_rating") or {}).get("stars"),
        "customer_comment": (engagement.get("customer_rating") or {}).get("comment"),
        "source": engagement.get("source"),
        "engagement_status": engagement.get("status"),
        "created_at": engagement.get("created_at"),
    }


async def _find_job_and_worker(job_id: str, worker_id: str) -> tuple[dict, dict]:
    job = await db.jobs.find_one({"id": job_id})
    worker = await db.workers.find_one({"id": worker_id})
    if not job or not worker:
        raise HTTPException(status_code=404, detail="Job or worker not found")
    return job, worker


async def _ensure_no_duplicate(job_id: str, worker_id: str) -> None:
    duplicate = await db.engagements.find_one(
        {
            "job_id": job_id,
            "worker_id": worker_id,
            "status": {"$in": ACTIVE_ENGAGEMENT_STATUSES},
        }
    )
    if duplicate:
        raise HTTPException(status_code=400, detail="Request already exists for this job and worker")


async def _ensure_active_limits(worker_id: str, customer_id: str) -> None:
    worker_active = await db.engagements.count_documents(
        {"worker_id": worker_id, "status": {"$in": ACTIVE_ENGAGEMENT_STATUSES}}
    )
    if worker_active >= MAX_ACTIVE_REQUESTS_PER_WORKER:
        raise HTTPException(status_code=400, detail="Worker has too many active requests")

    customer_active = await db.engagements.count_documents(
        {"customer_id": customer_id, "status": {"$in": ACTIVE_ENGAGEMENT_STATUSES}}
    )
    if customer_active >= MAX_ACTIVE_REQUESTS_PER_CUSTOMER:
        raise HTTPException(status_code=400, detail="Customer has too many active requests")


async def _ensure_job_can_accept_more(job: dict) -> None:
    workers_needed = int(job.get("workers_needed") or 1)
    accepted_count = await db.engagements.count_documents(
        {"job_id": job["id"], "status": "accepted"}
    )
    filled_count = int(job.get("filled_count") or 0)
    accepted_worker_count = len(job.get("accepted_worker_ids") or [])
    current_count = max(accepted_count, filled_count, accepted_worker_count)
    if current_count >= workers_needed:
        raise HTTPException(status_code=400, detail="Job is already filled")


async def _ensure_worker_can_take_job(worker: dict, job: dict) -> None:
    if not worker.get("available", True):
        raise HTTPException(status_code=400, detail="Worker is not available")

    job_date = job.get("job_date")
    if not job_date:
        return

    existing_engagement = await db.engagements.find_one(
        {"worker_id": worker["id"], "job_date": job_date, "status": "accepted"}
    )
    if existing_engagement:
        raise HTTPException(status_code=400, detail="Worker already booked for this date")

    existing_booking = await db.bookings.find_one(
        {"worker_id": worker["id"], "job_date": job_date, "status": "confirmed"}
    )
    if existing_booking:
        raise HTTPException(status_code=400, detail="Worker already booked for this date")


async def create_engagement_request(
    *,
    job_id: str,
    worker_id: str,
    source: Literal["worker_interest", "customer_booking"],
    user: dict,
) -> dict:
    job, worker = await _find_job_and_worker(job_id, worker_id)

    if job.get("status") != "open":
        raise HTTPException(status_code=400, detail="Job is not open for requests")

    if source == "customer_booking":
        if user["role"] != "customer":
            raise HTTPException(status_code=403, detail="Only customers can book workers")
        if job["customer_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="You can only book workers for your own jobs")
    elif source == "worker_interest":
        if user["role"] != "worker":
            raise HTTPException(status_code=403, detail="Only workers can express interest")
        if worker.get("user_id") != user["id"]:
            raise HTTPException(status_code=403, detail="You can only express interest as your own worker profile")
    else:
        raise HTTPException(status_code=400, detail="Invalid request source")

    await _ensure_no_duplicate(job_id, worker_id)
    await _ensure_active_limits(worker_id, job["customer_id"])
    await _ensure_job_can_accept_more(job)
    await _ensure_worker_can_take_job(worker, job)

    now = utc_now_iso()
    engagement = {
        "id": str(uuid.uuid4()),
        "job_id": job_id,
        "worker_id": worker_id,
        "customer_id": job["customer_id"],
        "source": source,
        "status": "requested",
        "worker_name": worker["name"],
        "customer_name": job.get("customer_name"),
        "job_title": job["title"],
        "job_date": job.get("job_date"),
        "daily_rate": job.get("daily_rate"),
        "worker_rating": None,
        "customer_rating": None,
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.engagements.insert_one(engagement)
    engagement.pop("_id", None)
    return engagement


async def get_engagement_for_user(engagement_id: str, user: dict) -> dict:
    engagement = await db.engagements.find_one({"id": engagement_id}, {"_id": 0})
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    if user["role"] == "customer" and engagement["customer_id"] == user["id"]:
        return engagement
    if user["role"] == "worker":
        worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
        if worker and worker["id"] == engagement["worker_id"]:
            return engagement

    raise HTTPException(status_code=403, detail="You cannot access this request")


async def list_engagements_for_user(user: dict) -> list[dict]:
    if user["role"] == "worker":
        worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
        if not worker:
            return []
        return await db.engagements.find({"worker_id": worker["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)

    return await db.engagements.find({"customer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)


def _can_decide_engagement(engagement: dict, user: dict, worker: dict | None) -> bool:
    if engagement["source"] == "worker_interest":
        return user["role"] == "customer" and engagement["customer_id"] == user["id"]
    if engagement["source"] == "customer_booking":
        return user["role"] == "worker" and worker is not None and worker["id"] == engagement["worker_id"]
    return False


async def accept_engagement(engagement_id: str, user: dict) -> dict:
    engagement = await db.engagements.find_one({"id": engagement_id})
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    worker = None
    if user["role"] == "worker":
        worker = await db.workers.find_one({"user_id": user["id"]})
    if not _can_decide_engagement(engagement, user, worker):
        raise HTTPException(status_code=403, detail="You cannot accept this request")
    if engagement["status"] != "requested":
        raise HTTPException(status_code=400, detail="Only requested engagements can be accepted")

    job, engagement_worker = await _find_job_and_worker(engagement["job_id"], engagement["worker_id"])
    await _ensure_job_can_accept_more(job)
    await _ensure_worker_can_take_job(engagement_worker, job)

    await db.engagements.update_one(
        {"id": engagement_id},
        {"$set": {"status": "accepted", "accepted_at": utc_now_iso(), "updated_at": utc_now_iso()}},
    )

    accepted_worker_ids = list(job.get("accepted_worker_ids") or [])
    if engagement["worker_id"] not in accepted_worker_ids:
        accepted_worker_ids.append(engagement["worker_id"])
    await db.jobs.update_one(
        {"id": job["id"]},
        {"$set": {"accepted_worker_ids": accepted_worker_ids, "filled_count": len(accepted_worker_ids)}},
    )
    return {"ok": True}


async def reject_engagement(engagement_id: str, user: dict) -> dict:
    engagement = await db.engagements.find_one({"id": engagement_id})
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    worker = None
    if user["role"] == "worker":
        worker = await db.workers.find_one({"user_id": user["id"]})
    if not _can_decide_engagement(engagement, user, worker):
        raise HTTPException(status_code=403, detail="You cannot reject this request")
    if engagement["status"] != "requested":
        raise HTTPException(status_code=400, detail="Only requested engagements can be rejected")

    await db.engagements.update_one(
        {"id": engagement_id},
        {"$set": {"status": "rejected", "rejected_at": utc_now_iso(), "updated_at": utc_now_iso()}},
    )
    return {"ok": True}


async def cancel_engagement(engagement_id: str, user: dict) -> dict:
    engagement = await get_engagement_for_user(engagement_id, user)
    if engagement["status"] not in ["requested", "accepted"]:
        raise HTTPException(status_code=400, detail="Only active engagements can be cancelled")
    await db.engagements.update_one(
        {"id": engagement_id},
        {"$set": {"status": "cancelled", "cancelled_at": utc_now_iso(), "updated_at": utc_now_iso()}},
    )
    return {"ok": True}


async def complete_engagement(engagement_id: str, user: dict) -> dict:
    engagement = await db.engagements.find_one({"id": engagement_id})
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")
    if user["role"] != "customer" or engagement["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the customer can complete this request")
    if engagement["status"] != "accepted":
        raise HTTPException(status_code=400, detail="Only accepted engagements can be completed")

    await db.engagements.update_one(
        {"id": engagement_id},
        {"$set": {"status": "completed", "completed_at": utc_now_iso(), "updated_at": utc_now_iso()}},
    )
    return {"ok": True}


async def rate_engagement(engagement_id: str, rating: int, comment: str, user: dict) -> dict:
    engagement = await db.engagements.find_one({"id": engagement_id})
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")
    
    if engagement["status"] != "completed":
        raise HTTPException(status_code=400, detail="Only completed engagements can be rated")

    now = utc_now_iso()
    if user["role"] == "customer":
        if engagement["customer_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="You can only rate your own hires")
        
        await db.engagements.update_one(
            {"id": engagement_id},
            {
                "$set": {
                    "worker_rating": {"stars": rating, "comment": comment, "created_at": now},
                    "updated_at": now
                }
            }
        )
        
        # Recompute worker rating
        pipeline = [
            {"$match": {"worker_id": engagement["worker_id"], "worker_rating": {"$ne": None}}},
            {"$group": {"_id": "$worker_id", "avg": {"$avg": "$worker_rating.stars"}, "count": {"$sum": 1}}},
        ]
        agg = await db.engagements.aggregate(pipeline).to_list(1)
        if agg:
            await db.workers.update_one(
                {"id": engagement["worker_id"]},
                {"$set": {"avg_rating": round(agg[0]["avg"], 2), "total_jobs": agg[0]["count"]}},
            )
            
    elif user["role"] == "worker":
        worker = await db.workers.find_one({"user_id": user["id"]})
        if not worker or worker["id"] != engagement["worker_id"]:
            raise HTTPException(status_code=403, detail="You can only rate your own jobs")
            
        await db.engagements.update_one(
            {"id": engagement_id},
            {
                "$set": {
                    "customer_rating": {"stars": rating, "comment": comment, "created_at": now},
                    "updated_at": now
                }
            }
        )
        # We could also recompute customer aggregate rating here later
        
    return {"ok": True}
