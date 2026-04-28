from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..db import db
from ..engagements import (
    accept_engagement,
    cancel_engagement,
    complete_engagement,
    create_engagement_request,
    list_engagements_for_user,
    reject_engagement,
)
from ..schemas import BookingIn

router = APIRouter(prefix="/api/engagements", tags=["engagements"])


@router.post("/customer-booking")
async def create_customer_booking(body: BookingIn, user: dict = Depends(get_current_user)):
    return await create_engagement_request(
        job_id=body.job_id,
        worker_id=body.worker_id,
        source="customer_booking",
        user=user,
    )


@router.post("/worker-interest/{job_id}")
async def create_worker_interest(job_id: str, user: dict = Depends(get_current_user)):
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


@router.get("/mine")
async def my_engagements(user: dict = Depends(get_current_user)):
    return await list_engagements_for_user(user)


@router.post("/{engagement_id}/accept")
async def accept(engagement_id: str, user: dict = Depends(get_current_user)):
    return await accept_engagement(engagement_id, user)


@router.post("/{engagement_id}/reject")
async def reject(engagement_id: str, user: dict = Depends(get_current_user)):
    return await reject_engagement(engagement_id, user)


@router.post("/{engagement_id}/cancel")
async def cancel(engagement_id: str, user: dict = Depends(get_current_user)):
    return await cancel_engagement(engagement_id, user)


@router.post("/{engagement_id}/complete")
async def complete(engagement_id: str, user: dict = Depends(get_current_user)):
    return await complete_engagement(engagement_id, user)


@router.post("/{engagement_id}/rate")
async def rate(engagement_id: str, body: dict, user: dict = Depends(get_current_user)):
    # Reusing logic but ensuring it matches RatingIn schema fields
    rating = body.get("rating")
    comment = body.get("comment", "")
    if rating is None:
        raise HTTPException(status_code=422, detail="Rating is required")
    from ..engagements import rate_engagement
    return await rate_engagement(engagement_id, rating, comment, user)

