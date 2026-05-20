import uuid
from math import asin, cos, radians, sin, sqrt
from random import randint

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from ..auth import get_current_user, is_customer, is_worker
from ..cloudinary_service import upload_review_image
from ..db import db
from ..engagements import (
    _notify,
    accept_engagement,
    cancel_engagement,
    complete_engagement,
    create_engagement_request,
    get_engagement_for_user,
    list_engagements_for_user,
    reject_engagement,
)
from ..pdf_service import generate_completion_certificate
from ..schemas import BookingIn
from ..utils import utc_now_iso

router = APIRouter(prefix="/api/engagements", tags=["engagements"])
MAX_REVIEW_IMAGE_BYTES = 5 * 1024 * 1024


async def _ensure_can_rate_engagement(engagement_id: str, user: dict) -> dict:
    engagement = await db.engagements.find_one({"id": engagement_id}, {"_id": 0})
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")
    if engagement.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Only completed engagements can be rated")

    if is_customer(user) and engagement.get("customer_id") == user["id"]:
        return engagement

    if is_worker(user):
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
    if not is_worker(user):
        raise HTTPException(status_code=403, detail="Activate worker profile first")
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


@router.get("/{engagement_id}/certificate")
async def get_completion_certificate(engagement_id: str, user: dict = Depends(get_current_user)):
    engagement = await get_engagement_for_user(engagement_id, user)
    if engagement.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Certificate available after completion")

    worker = await db.workers.find_one({"id": engagement.get("worker_id")}, {"_id": 0}) or {}
    customer = await db.users.find_one({"id": engagement.get("customer_id")}, {"_id": 0}) or {}
    try:
        pdf = generate_completion_certificate(engagement, worker, customer)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return StreamingResponse(
        iter([pdf]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="kaamnow-certificate-{engagement_id}.pdf"'
        },
    )


@router.post("/{engagement_id}/generate-start-otp")
async def generate_start_otp(engagement_id: str, user: dict = Depends(get_current_user)):
    engagement = await get_engagement_for_user(engagement_id, user)
    if engagement.get("customer_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Only the customer can create this code")
    if engagement.get("status") != "accepted":
        raise HTTPException(status_code=400, detail="Job must be accepted first")
    otp = f"{randint(0, 9999):04d}"
    await db.engagements.update_one(
        {"id": engagement_id}, {"$set": {"start_otp": otp, "updated_at": utc_now_iso()}}
    )
    await _notify(
        user["id"],
        "Your job start code",
        f"Your job start code is {otp}. Share it with the Local Expert when they arrive.",
        "start_otp",
        engagement_id,
    )
    return {"message": "OTP sent to you"}


@router.post("/{engagement_id}/verify-start-otp")
async def verify_start_otp(engagement_id: str, body: dict, user: dict = Depends(get_current_user)):
    engagement = await get_engagement_for_user(engagement_id, user)
    worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0, "id": 1})
    if not worker or worker.get("id") != engagement.get("worker_id"):
        raise HTTPException(status_code=403, detail="Only the assigned Local Expert can verify")
    if body.get("otp") != engagement.get("start_otp"):
        raise HTTPException(status_code=400, detail="Wrong start code")
    await db.engagements.update_one(
        {"id": engagement_id},
        {
            "$set": {"otp_verified_at": utc_now_iso(), "updated_at": utc_now_iso()},
            "$unset": {"start_otp": ""},
        },
    )
    await _notify(
        engagement["customer_id"],
        "Work has started",
        "The Local Expert has arrived and started work.",
        "progress_update",
        engagement_id,
    )
    return {"verified": True}


def _distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> int:
    radius = 6371000
    d_lat = radians(lat2 - lat1)
    d_lng = radians(lng2 - lng1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng / 2) ** 2
    return int(radius * 2 * asin(sqrt(a)))


@router.post("/{engagement_id}/checkin")
async def checkin(engagement_id: str, body: dict, user: dict = Depends(get_current_user)):
    engagement = await get_engagement_for_user(engagement_id, user)
    worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0, "id": 1})
    if not worker or worker.get("id") != engagement.get("worker_id"):
        raise HTTPException(status_code=403, detail="Only the assigned Local Expert can check in")
    job = await db.jobs.find_one({"id": engagement["job_id"]}, {"_id": 0})
    lat = float(body.get("lat"))
    lng = float(body.get("lng"))
    distance = 0
    if job and job.get("lat") is not None and job.get("lng") is not None:
        distance = _distance_m(lat, lng, float(job["lat"]), float(job["lng"]))
        if distance > 1000:
            raise HTTPException(status_code=400, detail="You are too far from the job location")
    await db.engagements.update_one(
        {"id": engagement_id},
        {"$set": {"checkin_lat": lat, "checkin_lng": lng, "updated_at": utc_now_iso()}},
    )
    return {"checked_in": True, "distance_m": distance}


@router.post("/{engagement_id}/progress")
async def add_progress(engagement_id: str, body: dict, user: dict = Depends(get_current_user)):
    engagement = await get_engagement_for_user(engagement_id, user)
    worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0, "id": 1})
    if not worker or worker.get("id") != engagement.get("worker_id"):
        raise HTTPException(status_code=403, detail="Only the assigned Local Expert can update")
    status = body.get("status")
    if status not in ("on_the_way", "arrived", "in_progress", "done"):
        raise HTTPException(status_code=400, detail="Choose a valid progress status")
    update = {
        "id": str(uuid.uuid4()),
        "status": status,
        "note": (body.get("note") or "")[:200] or None,
        "photo_url": body.get("photo_url"),
        "created_at": utc_now_iso(),
    }
    await db.engagements.update_one(
        {"id": engagement_id},
        {"$push": {"progress_updates": update}, "$set": {"updated_at": utc_now_iso()}},
    )
    await _notify(
        engagement["customer_id"],
        "Job update",
        f"Progress update: {status.replace('_', ' ')}",
        "progress_update",
        engagement_id,
    )
    updated = await db.engagements.find_one({"id": engagement_id}, {"_id": 0})
    return updated


async def _append_job_photo(engagement_id: str, user: dict, file: UploadFile, field: str):
    engagement = await get_engagement_for_user(engagement_id, user)
    worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0, "id": 1})
    if not worker or worker.get("id") != engagement.get("worker_id"):
        raise HTTPException(status_code=403, detail="Only the assigned Local Expert can upload")
    photos = list(engagement.get(field) or [])
    if len(photos) >= 3:
        raise HTTPException(status_code=400, detail="You can upload up to 3 photos")
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")
    file_bytes = await file.read()
    if len(file_bytes) > MAX_REVIEW_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 5MB or smaller")
    photo_url = upload_review_image(file_bytes, f"job_{field}_{engagement_id}_{uuid.uuid4().hex}")
    photos.append(photo_url)
    await db.engagements.update_one(
        {"id": engagement_id}, {"$set": {field: photos, "updated_at": utc_now_iso()}}
    )
    return await db.engagements.find_one({"id": engagement_id}, {"_id": 0})


@router.post("/{engagement_id}/before-photo")
async def upload_before_photo(
    engagement_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)
):
    return await _append_job_photo(engagement_id, user, file, "before_photos")


@router.post("/{engagement_id}/after-photo")
async def upload_after_photo(
    engagement_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)
):
    return await _append_job_photo(engagement_id, user, file, "after_photos")


@router.post("/{engagement_id}/re-hire")
async def re_hire(engagement_id: str, body: dict, user: dict = Depends(get_current_user)):
    engagement = await get_engagement_for_user(engagement_id, user)
    if engagement.get("customer_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Only the customer can re-hire")
    if engagement.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Only completed jobs can be re-hired")
    job_date = body.get("job_date")
    if not job_date:
        raise HTTPException(status_code=400, detail="Choose a job date")
    old_job = await db.jobs.find_one({"id": engagement["job_id"]}, {"_id": 0})
    if not old_job:
        raise HTTPException(status_code=404, detail="Original job not found")
    new_job = {
        **old_job,
        "id": str(uuid.uuid4()),
        "job_date": job_date,
        "status": "open",
        "filled_count": 0,
        "accepted_worker_ids": [],
        "created_at": utc_now_iso(),
    }
    await db.jobs.insert_one(new_job)
    return await create_engagement_request(
        job_id=new_job["id"],
        worker_id=engagement["worker_id"],
        source="customer_booking",
        user=user,
    )


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
