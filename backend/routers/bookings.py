import asyncio
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..auth import get_current_user
from ..db import db
from ..engagements import (
    accept_engagement,
    complete_engagement,
    create_engagement_request,
    engagement_to_booking,
    list_engagements_for_user,
)
from ..schemas import BookingIn, RatingIn
from ..whatsapp_notify import (
    notify_customer_booking_accepted,
    notify_worker_job_completed,
    notify_worker_new_booking,
)

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.post("")
async def create_booking(body: BookingIn, user: dict = Depends(get_current_user)):
    engagement = await create_engagement_request(
        job_id=body.job_id,
        worker_id=body.worker_id,
        source="customer_booking",
        user=user,
    )
    booking = engagement_to_booking(engagement)

    # Notify worker via WhatsApp (non-blocking)
    worker_doc = await db.workers.find_one({"id": body.worker_id}, {"_id": 0})
    if worker_doc:
        worker_user = await db.users.find_one({"id": worker_doc.get("user_id")}, {"_id": 0})
        if worker_user and worker_user.get("phone"):
            asyncio.create_task(
                asyncio.to_thread(notify_worker_new_booking, worker_user["phone"], booking)
            )

    return booking


class DirectHireIn(BaseModel):
    worker_id: str
    category: str
    daily_rate: int
    job_date: str
    note: Optional[str] = None


@router.post("/direct")
async def direct_hire(body: DirectHireIn, user: dict = Depends(get_current_user)):
    """Hire a worker directly without posting a job first.
    Auto-creates a minimal job + engagement in one step.
    Worker must accept before booking is confirmed.
    """
    if user["role"] != "customer":
        raise HTTPException(status_code=403, detail="Only customers can hire workers directly")

    worker = await db.workers.find_one({"id": body.worker_id}, {"_id": 0})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    from ..utils import utc_now_iso
    job_id = str(uuid.uuid4())
    job_doc = {
        "id": job_id,
        "customer_id": user["id"],
        "customer_name": user.get("name", ""),
        "title": f"{body.category.title()} work – Direct hire",
        "category": body.category,
        "description": body.note or f"Direct booking request for {body.category} work on {body.job_date}.",
        "workers_needed": 1,
        "daily_rate": body.daily_rate,
        "job_date": body.job_date,
        "village": (user.get("address") or {}).get("village") or user.get("village") or "",
        "lat": 22.9734,
        "lng": 78.6569,
        "address": user.get("address") or {},
        "status": "open",
        "source": "direct_hire",
        "required_skills": [{"category": body.category, "skill": body.category}],
        "created_at": utc_now_iso(),
    }
    await db.jobs.insert_one(job_doc)

    engagement = await create_engagement_request(
        job_id=job_id,
        worker_id=body.worker_id,
        source="customer_booking",
        user=user,
    )
    booking = engagement_to_booking(engagement)

    # Notify worker
    worker_user = await db.users.find_one({"id": worker.get("user_id")}, {"_id": 0})
    if worker_user and worker_user.get("phone"):
        asyncio.create_task(asyncio.to_thread(notify_worker_new_booking, worker_user["phone"], booking))

    return booking


@router.get("/mine")
async def my_bookings(user: dict = Depends(get_current_user)):
    engagement_bookings = [engagement_to_booking(e) for e in await list_engagements_for_user(user)]

    if user["role"] == "worker":
        worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
        if not worker:
            return engagement_bookings
        bookings = await db.bookings.find({"worker_id": worker["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    else:
        bookings = await db.bookings.find({"customer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    existing_ids = {booking["id"] for booking in engagement_bookings}
    return engagement_bookings + [booking for booking in bookings if booking["id"] not in existing_ids]


@router.post("/{booking_id}/accept")
async def accept_booking(booking_id: str, user: dict = Depends(get_current_user)):
    engagement = await db.engagements.find_one({"id": booking_id})
    if engagement:
        result = await accept_engagement(booking_id, user)
        # Notify customer via WhatsApp (non-blocking)
        booking_data = engagement_to_booking(engagement)
        customer_doc = await db.users.find_one({"id": engagement.get("customer_id")}, {"_id": 0})
        if customer_doc and customer_doc.get("phone"):
            asyncio.create_task(
                asyncio.to_thread(notify_customer_booking_accepted, customer_doc["phone"], booking_data)
            )
        return result

    if user["role"] != "worker":
        raise HTTPException(status_code=403, detail="Only workers can accept bookings")
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    worker = await db.workers.find_one({"user_id": user["id"]})
    if not worker or worker["id"] != booking["worker_id"]:
        raise HTTPException(status_code=403, detail="You can only accept bookings assigned to you")
    if booking["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending bookings can be accepted")
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "confirmed"}})
    # Notify customer for legacy booking
    customer_doc = await db.users.find_one({"id": booking.get("customer_id")}, {"_id": 0})
    if customer_doc and customer_doc.get("phone"):
        asyncio.create_task(
            asyncio.to_thread(notify_customer_booking_accepted, customer_doc["phone"], booking)
        )
    return {"ok": True}


@router.post("/{booking_id}/complete")
async def complete_booking(booking_id: str, user: dict = Depends(get_current_user)):
    engagement = await db.engagements.find_one({"id": booking_id})
    if engagement:
        result = await complete_engagement(booking_id, user)
        # Notify worker via WhatsApp (non-blocking)
        worker_doc = await db.workers.find_one({"id": engagement.get("worker_id")}, {"_id": 0})
        if worker_doc:
            worker_user = await db.users.find_one({"id": worker_doc.get("user_id")}, {"_id": 0})
            if worker_user and worker_user.get("phone"):
                booking_data = engagement_to_booking(engagement)
                asyncio.create_task(
                    asyncio.to_thread(notify_worker_job_completed, worker_user["phone"], booking_data)
                )
        return result

    if user["role"] != "customer":
        raise HTTPException(status_code=403, detail="Only customers can mark bookings as completed")
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only complete your own bookings")
    if booking["status"] != "confirmed":
        raise HTTPException(status_code=400, detail="Only confirmed bookings can be completed")
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "completed"}})
    # Notify worker for legacy booking
    worker_doc = await db.workers.find_one({"id": booking.get("worker_id")}, {"_id": 0})
    if worker_doc:
        worker_user = await db.users.find_one({"id": worker_doc.get("user_id")}, {"_id": 0})
        if worker_user and worker_user.get("phone"):
            asyncio.create_task(
                asyncio.to_thread(notify_worker_job_completed, worker_user["phone"], booking)
            )
    return {"ok": True}


@router.post("/rate")
async def rate_booking(body: RatingIn, user: dict = Depends(get_current_user)):
    if user["role"] != "customer":
        raise HTTPException(status_code=403, detail="Only customers can rate bookings")
    booking = await db.bookings.find_one({"id": body.booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only rate your own bookings")
    if booking["status"] != "completed":
        raise HTTPException(status_code=400, detail="Only completed bookings can be rated")

    await db.bookings.update_one(
        {"id": body.booking_id},
        {"$set": {"rating": body.rating, "comment": body.comment}},
    )

    pipeline = [
        {"$match": {"worker_id": booking["worker_id"], "rating": {"$ne": None}}},
        {"$group": {"_id": "$worker_id", "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    agg = await db.bookings.aggregate(pipeline).to_list(1)
    if agg:
        await db.workers.update_one(
            {"id": booking["worker_id"]},
            {"$set": {"avg_rating": round(agg[0]["avg"], 2), "total_jobs": agg[0]["count"]}},
        )

    return {"ok": True}
