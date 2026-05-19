import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..auth import get_current_user
from ..cloudinary_service import upload_review_image
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
MAX_REVIEW_IMAGE_BYTES = 5 * 1024 * 1024


async def _ensure_can_rate_engagement(engagement_id: str, user: dict) -> dict:
    engagement = await db.engagements.find_one({"id": engagement_id}, {"_id": 0})
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")
    if engagement.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Only completed engagements can be rated")

    if user["role"] == "customer" and engagement.get("customer_id") == user["id"]:
        return engagement

    if user["role"] == "worker":
        worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0, "id": 1})
        if worker and worker.get("id") == engagement.get("worker_id"):
            return engagement

    raise HTTPException(status_code=403, detail="You can only rate your own completed jobs")


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
    image_urls = body.get("image_urls", [])
    if rating is None:
        raise HTTPException(status_code=422, detail="Rating is required")
    from ..engagements import rate_engagement

    return await rate_engagement(engagement_id, rating, comment, user, image_urls=image_urls)


@router.post("/{engagement_id}/rating-photo")
async def upload_rating_photo(
    engagement_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    await _ensure_can_rate_engagement(engagement_id, user)

    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Image file is empty")
    if len(file_bytes) > MAX_REVIEW_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 5MB or smaller")

    public_id = f"review_{engagement_id}_{user['id']}_{uuid.uuid4().hex}"
    try:
        photo_url = upload_review_image(file_bytes, public_id)
    except Exception:
        raise HTTPException(status_code=503, detail="Review image upload is unavailable")
    return {"ok": True, "photo_url": photo_url}
