import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..db import db
from ..schemas import BookingIn, RatingIn

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.post("")
async def create_booking(body: BookingIn, user: dict = Depends(get_current_user)):
    if user["role"] != "customer":
        raise HTTPException(status_code=403, detail="Only customers can create bookings")

    job = await db.jobs.find_one({"id": body.job_id})
    worker = await db.workers.find_one({"id": body.worker_id})
    if not job or not worker:
        raise HTTPException(status_code=404, detail="Job or worker not found")
    if job["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only book workers for your own jobs")
    if job["status"] != "open":
        raise HTTPException(status_code=400, detail="Job is not open for booking")
    if not worker.get("available", True):
        raise HTTPException(status_code=400, detail="Worker is not available")

    booking_id = str(uuid.uuid4())
    booking_doc = {
        "id": booking_id,
        "job_id": body.job_id,
        "worker_id": body.worker_id,
        "customer_id": user["id"],
        "worker_name": worker["name"],
        "customer_name": user["name"],
        "job_title": job["title"],
        "job_date": job["job_date"],
        "daily_rate": job["daily_rate"],
        "status": "pending",
        "rating": None,
        "comment": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(booking_doc)
    booking_doc.pop("_id", None)
    return booking_doc


@router.get("/mine")
async def my_bookings(user: dict = Depends(get_current_user)):
    if user["role"] == "worker":
        worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
        if not worker:
            return []
        bookings = await db.bookings.find({"worker_id": worker["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    else:
        bookings = await db.bookings.find({"customer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return bookings


@router.post("/{booking_id}/accept")
async def accept_booking(booking_id: str, user: dict = Depends(get_current_user)):
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
    return {"ok": True}


@router.post("/{booking_id}/complete")
async def complete_booking(booking_id: str, user: dict = Depends(get_current_user)):
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
