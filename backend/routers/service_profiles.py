"""
Service Profiles — any user can create one.
Direction-based user-to-user service profile API.
Collection: service_profiles
"""

import base64
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from ..auth import get_current_user, get_optional_user
from ..cloudinary_service import upload_cert_image, upload_portfolio_image
from ..cloudinary_service import upload_video as upload_sp_video
from ..db import db
from ..qr_service import generate_profile_qr, generate_url_qr
from ..utils import utc_now_iso

router = APIRouter(prefix="/api/service-profiles", tags=["service-profiles"])


def _public(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


async def _rating_stats_for_user_ids(user_ids: list[str]) -> dict:
    user_ids = [uid for uid in user_ids if uid]
    if not user_ids:
        return {}

    pipeline = [
        {
            "$match": {
                "status": "completed",
                "$or": [
                    {
                        "request_type": "job_application",
                        "requested_by_user_id": {"$in": user_ids},
                        "receiver_rating.rating": {"$exists": True},
                    },
                    {
                        "request_type": {"$in": ["job_invitation", "direct_booking"]},
                        "requested_to_user_id": {"$in": user_ids},
                        "sender_rating.rating": {"$exists": True},
                    },
                ],
            }
        },
        {
            "$project": {
                "expert_user_id": {
                    "$cond": [
                        {"$eq": ["$request_type", "job_application"]},
                        "$requested_by_user_id",
                        "$requested_to_user_id",
                    ]
                },
                "rating": {
                    "$cond": [
                        {"$eq": ["$request_type", "job_application"]},
                        "$receiver_rating.rating",
                        "$sender_rating.rating",
                    ]
                },
            }
        },
        {"$match": {"expert_user_id": {"$in": user_ids}, "rating": {"$ne": None}}},
        {
            "$group": {
                "_id": "$expert_user_id",
                "rating_count": {"$sum": 1},
                "rating_avg": {"$avg": "$rating"},
            }
        },
    ]
    rows = await db.work_requests.aggregate(pipeline).to_list(len(user_ids))
    return {
        row["_id"]: {
            "rating_count": row.get("rating_count") or 0,
            "rating_avg": round(float(row.get("rating_avg") or 0), 2),
        }
        for row in rows
    }


# ── GET /service-profiles ────────────────────────────────────────────────────
@router.get("")
async def browse(
    pincode: str = None,
    category: str = None,
    skill: str = None,
    available_only: bool = False,
    search: str = None,
    limit: int = 40,
    user: dict = Depends(get_optional_user),
):
    q: dict = {"is_active": True}
    if user and user.get("id"):
        q["user_id"] = {"$ne": user["id"]}
    if pincode:
        q["pincode"] = pincode
    if category:
        q["categories"] = {"$in": [category]}
    if skill:
        q["skills"] = {"$in": [skill]}
    if available_only:
        q["availability"] = True
    if search:
        import re
        pat = {"$regex": re.escape(search), "$options": "i"}
        q["$or"] = [
            {"display_name": pat},
            {"bio": pat},
            {"skills": {"$elemMatch": pat}},
            {"categories": {"$elemMatch": pat}},
        ]

    docs = (
        await db.service_profiles.find(q, {"_id": 0})
        .sort("rating_avg", -1)
        .limit(limit)
        .to_list(limit)
    )
    stats_by_user = await _rating_stats_for_user_ids([doc.get("user_id") for doc in docs])
    for doc in docs:
        stats = stats_by_user.get(doc.get("user_id"), {"rating_count": 0, "rating_avg": 0.0})
        doc["rating_count"] = stats["rating_count"]
        doc["rating_avg"] = stats["rating_avg"]
    return docs


# ── GET /service-profiles/mine ───────────────────────────────────────────────
@router.get("/mine")
async def get_mine(user: dict = Depends(get_current_user)):
    doc = await db.service_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No service profile found")
    return doc


# ── POST /service-profiles ───────────────────────────────────────────────────
@router.post("")
async def create_profile(body: dict, user: dict = Depends(get_current_user)):
    existing = await db.service_profiles.find_one({"user_id": user["id"]})
    now = utc_now_iso()
    if existing:
        allowed = {
            "display_name",
            "bio",
            "categories",
            "skills",
            "experience_years",
            "pincode",
            "location_text",
            "availability",
            "daily_rate",
            "lat",
            "lng",
        }
        updates = {k: v for k, v in body.items() if k in allowed}
        updates["updated_at"] = now
        updates["is_active"] = True
        await db.service_profiles.update_one({"user_id": user["id"]}, {"$set": updates})
        await db.users.update_one({"id": user["id"]}, {"$set": {"has_service_profile": True}})
        updated = await db.service_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
        return updated

    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "display_name": body.get("display_name") or user.get("name", ""),
        "bio": (body.get("bio") or "")[:500],
        "categories": body.get("categories") or [],
        "skills": body.get("skills") or [],
        "experience_years": body.get("experience_years"),
        "photos": [],
        "certifications": [],
        "pincode": body.get("pincode")
        or user.get("pincode")
        or (user.get("address") or {}).get("pincode"),
        "location_text": body.get("location_text") or "",
        "lat": body.get("lat"),
        "lng": body.get("lng"),
        "availability": body.get("availability", True),
        "daily_rate": body.get("daily_rate"),
        "is_active": True,
        "verification_status": "unverified",
        "trust_tier": 1,
        "rating_avg": 0.0,
        "rating_count": 0,
        "completed_jobs": 0,
        "created_at": now,
        "updated_at": now,
    }
    await db.service_profiles.insert_one(doc)
    doc.pop("_id", None)

    # Mark user as having a service profile
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"has_service_profile": True}},
    )
    return doc


# ── PATCH /service-profiles/mine ────────────────────────────────────────────
@router.patch("/mine")
async def update_profile(body: dict, user: dict = Depends(get_current_user)):
    doc = await db.service_profiles.find_one({"user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="No service profile found. Create one first.")

    allowed = {
        "display_name",
        "bio",
        "categories",
        "skills",
        "experience_years",
        "pincode",
        "location_text",
        "availability",
        "daily_rate",
        "lat",
        "lng",
    }
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    updates["updated_at"] = utc_now_iso()
    await db.service_profiles.update_one({"user_id": user["id"]}, {"$set": updates})
    updated = await db.service_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return updated


# ── PATCH /service-profiles/mine/availability ────────────────────────────────
@router.patch("/mine/availability")
async def toggle_availability(body: dict, user: dict = Depends(get_current_user)):
    doc = await db.service_profiles.find_one({"user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="No service profile found")
    avail = body.get("is_available", body.get("availability", True))
    await db.service_profiles.update_one(
        {"user_id": user["id"]},
        {"$set": {"availability": bool(avail), "updated_at": utc_now_iso()}},
    )
    return {"availability": avail}


# ── GET /service-profiles/mine/earnings ─────────────────────────────────────
@router.get("/mine/earnings")
async def my_earnings(user: dict = Depends(get_current_user)):
    from datetime import date

    doc = await db.service_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No service profile found")

    first_of_month = date.today().replace(day=1).isoformat()

    # Expert can be requested_to (invitation/direct_booking) or requested_by (job_application)
    completed = await db.work_requests.find(
        {
            "$or": [
                {
                    "requested_to_user_id": user["id"],
                    "request_type": {"$in": ["job_invitation", "direct_booking"]},
                },
                {"requested_by_user_id": user["id"], "request_type": "job_application"},
            ],
            "status": "completed",
        },
        {"_id": 0},
    ).to_list(500)

    all_completed = completed
    this_month = [e for e in all_completed if (e.get("updated_at") or "")[:10] >= first_of_month]
    total_this_month = sum(e.get("daily_rate") or e.get("payment_amount") or 0 for e in this_month)
    jobs_done = len(all_completed)

    def _expert_rating(e):
        if e.get("request_type") == "job_application":
            return (
                e.get("receiver_rating", {}).get("rating")
                if isinstance(e.get("receiver_rating"), dict)
                else None
            )
        return (
            e.get("sender_rating", {}).get("rating")
            if isinstance(e.get("sender_rating"), dict)
            else None
        )

    ratings = [r for e in all_completed if (r := _expert_rating(e)) is not None]
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else None

    total_all_time = sum(e.get("daily_rate") or e.get("payment_amount") or 0 for e in all_completed)

    return {
        "total_this_month": total_this_month,
        "total_all_time": total_all_time,
        "jobs_done": jobs_done,
        "avg_rating": avg_rating,
        "engagements": [
            {
                "id": e["id"],
                "job_title": e.get("job_title") or e.get("title", ""),
                "job_date": e.get("job_date", ""),
                "payment_amount": e.get("daily_rate") or e.get("payment_amount"),
                "rating": _expert_rating(e),
            }
            for e in all_completed
        ],
    }


# ── POST /service-profiles/mine/photos ──────────────────────────────────────
@router.post("/mine/photos")
async def add_photo(
    caption: Optional[str] = Form(None),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    doc = await db.service_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No service profile found")
    photos = list(doc.get("photos") or [])
    if len(photos) >= 6:
        raise HTTPException(status_code=400, detail="You can add up to 6 photos")
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")
    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File must be 5MB or smaller")
    item_id = str(uuid.uuid4())
    image_url = upload_portfolio_image(file_bytes, f"sp_photo_{doc['id']}_{item_id}")
    item = {
        "id": item_id,
        "image_url": image_url,
        "caption": (caption or "")[:100] or None,
        "created_at": utc_now_iso(),
    }
    photos.append(item)
    await db.service_profiles.update_one(
        {"user_id": user["id"]}, {"$set": {"photos": photos, "updated_at": utc_now_iso()}}
    )
    return photos


# ── DELETE /service-profiles/mine/photos/{photo_id} ─────────────────────────
@router.delete("/mine/photos/{photo_id}")
async def delete_photo(photo_id: str, user: dict = Depends(get_current_user)):
    from ..cloudinary_service import delete_image

    doc = await db.service_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No service profile found")
    photos = list(doc.get("photos") or [])
    item = next((p for p in photos if p.get("id") == photo_id), None)
    if item:
        delete_image(item.get("image_url"))
    photos = [p for p in photos if p.get("id") != photo_id]
    await db.service_profiles.update_one(
        {"user_id": user["id"]}, {"$set": {"photos": photos, "updated_at": utc_now_iso()}}
    )
    return photos


# ── POST /service-profiles/mine/certifications ───────────────────────────────
@router.post("/mine/certifications")
async def add_certification(
    skill: str = Form(...),
    cert_name: str = Form(...),
    issued_by: Optional[str] = Form(None),
    year: Optional[int] = Form(None),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    doc = await db.service_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No service profile found")
    content_type = file.content_type or ""
    if not (content_type.startswith("image/") or content_type == "application/pdf"):
        raise HTTPException(status_code=400, detail="Only images or PDFs are supported")
    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File must be 5MB or smaller")
    cert_id = str(uuid.uuid4())
    cert_url = upload_cert_image(file_bytes, f"sp_cert_{doc['id']}_{cert_id}")
    cert = {
        "id": cert_id,
        "skill": skill[:80],
        "cert_name": cert_name[:120],
        "cert_url": cert_url,
        "issued_by": (issued_by or "")[:120] or None,
        "year": year,
        "verified": False,
        "verified_at": None,
    }
    certifications = [*(doc.get("certifications") or []), cert]
    await db.service_profiles.update_one(
        {"user_id": user["id"]},
        {"$set": {"certifications": certifications, "updated_at": utc_now_iso()}},
    )
    return certifications


# ── DELETE /service-profiles/mine/certifications/{cert_id} ──────────────────
@router.delete("/mine/certifications/{cert_id}")
async def delete_certification(cert_id: str, user: dict = Depends(get_current_user)):
    from ..cloudinary_service import delete_image

    doc = await db.service_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No service profile found")
    certifications = list(doc.get("certifications") or [])
    cert = next((c for c in certifications if c.get("id") == cert_id), None)
    if cert:
        delete_image(cert.get("cert_url"))
    certifications = [c for c in certifications if c.get("id") != cert_id]
    await db.service_profiles.update_one(
        {"user_id": user["id"]},
        {"$set": {"certifications": certifications, "updated_at": utc_now_iso()}},
    )
    return certifications


# ── POST /service-profiles/mine/video ───────────────────────────────────────
@router.post("/mine/video")
async def upload_video(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    doc = await db.service_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No service profile found")
    content_type = file.content_type or ""
    if not (content_type.startswith("video/mp4") or content_type.startswith("video/quicktime")):
        raise HTTPException(status_code=400, detail="Only MP4 or MOV videos are supported")
    file_bytes = await file.read()
    if len(file_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Video must be 50MB or smaller")
    video_url = upload_sp_video(file_bytes, f"sp_video_{doc['id']}")
    await db.service_profiles.update_one(
        {"user_id": user["id"]},
        {"$set": {"video_url": video_url, "updated_at": utc_now_iso()}},
    )
    updated = await db.service_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return updated


# ── POST /service-profiles/mine/kyc/initiate ────────────────────────────────
@router.post("/mine/kyc/initiate")
async def initiate_kyc(body: dict, user: dict = Depends(get_current_user)):
    doc = await db.service_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No service profile found")
    doc_type = body.get("doc_type") or "aadhaar"
    if doc_type not in ("aadhaar", "driving_licence", "voter_id"):
        raise HTTPException(status_code=400, detail="Choose a valid document type")
    return {
        "session_id": f"kyc_{doc['id']}_{uuid.uuid4().hex[:10]}",
        "provider": "digilocker_placeholder",
        "doc_type": doc_type,
    }


# ── GET /service-profiles/mine/qr-code ──────────────────────────────────────
@router.get("/mine/qr-code")
async def get_qr_code(user: dict = Depends(get_current_user)):
    doc = await db.service_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No service profile found")
    try:
        image = generate_profile_qr(doc["id"], "https://kaamnow.com")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return StreamingResponse(
        iter([image]),
        media_type="image/png",
        headers={"Content-Disposition": 'inline; filename="kaamnow-profile-qr.png"'},
    )


# ── GET /service-profiles/mine/qr-code-b64 ──────────────────────────────────
@router.get("/mine/qr-code-b64")
async def get_qr_code_b64(user: dict = Depends(get_current_user)):
    doc = await db.service_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if doc:
        profile_url = f"https://kaamnow.com/local-expert/{doc['id']}"
        qr_kind = "service_profile"
        qr_target = profile_url
    else:
        profile_url = f"https://kaamnow.com/users/{user['id']}"
        qr_kind = "user"
        qr_target = profile_url
    try:
        image = (
            generate_profile_qr(doc["id"], "https://kaamnow.com")
            if doc
            else generate_url_qr(qr_target)
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "b64": base64.b64encode(image).decode("ascii"),
        "profile_url": profile_url,
        "qr_kind": qr_kind,
    }


# ── POST /service-profiles/mine/rate-work-request ───────────────────────────
# (Compatibility endpoint — DashboardScreen uses this for completed work_requests)
@router.post("/mine/available-now")
async def available_now(user: dict = Depends(get_current_user)):
    from datetime import datetime, timedelta, timezone

    doc = await db.service_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No service profile found")
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat()
    await db.service_profiles.update_one(
        {"user_id": user["id"]},
        {
            "$set": {
                "is_available_now": True,
                "available_now_expires_at": expires_at,
                "updated_at": utc_now_iso(),
            }
        },
    )
    return {"expires_at": expires_at}


@router.delete("/mine/available-now")
async def clear_available_now(user: dict = Depends(get_current_user)):
    await db.service_profiles.update_one(
        {"user_id": user["id"]},
        {
            "$set": {
                "is_available_now": False,
                "available_now_expires_at": None,
                "updated_at": utc_now_iso(),
            }
        },
    )
    return {"ok": True}


# ── GET /service-profiles/user/{user_id}/qr-png (public, no auth) ───────────
@router.get("/user/{user_id}/qr-png")
async def public_user_qr_png(user_id: str):
    sp = await db.service_profiles.find_one({"user_id": user_id}, {"_id": 0, "id": 1})
    target = (
        f"https://kaamnow.com/local-expert/{sp['id']}"
        if sp
        else f"https://kaamnow.com/users/{user_id}"
    )
    image = generate_url_qr(target)
    return StreamingResponse(
        iter([image]),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )


# ── GET /service-profiles/{id} ───────────────────────────────────────────────
@router.get("/{profile_id}")
async def get_profile(profile_id: str, user: dict = Depends(get_optional_user)):
    # Accept either service profile id or user_id
    doc = await db.service_profiles.find_one(
        {"$or": [{"id": profile_id}, {"user_id": profile_id}]},
        {"_id": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Service profile not found")
    expert_user_id = doc.get("user_id")
    completed = (
        await db.work_requests.find(
            {
                "$or": [
                    {
                        "request_type": "job_application",
                        "requested_by_user_id": expert_user_id,
                        "receiver_rating": {"$exists": True},
                    },
                    {
                        "request_type": {"$in": ["job_invitation", "direct_booking"]},
                        "requested_to_user_id": expert_user_id,
                        "sender_rating": {"$exists": True},
                    },
                ],
                "status": "completed",
            },
            {"_id": 0},
        )
        .sort("updated_at", -1)
        .limit(20)
        .to_list(20)
    )

    reviewer_ids = []
    reviews = []
    for item in completed:
        if item.get("request_type") == "job_application":
            rating_doc = item.get("receiver_rating") or {}
            reviewer_id = item.get("requested_to_user_id")
        else:
            rating_doc = item.get("sender_rating") or {}
            reviewer_id = item.get("requested_by_user_id")
        if not isinstance(rating_doc, dict) or rating_doc.get("rating") is None:
            continue
        reviewer_ids.append(reviewer_id)
        reviews.append(
            {
                "id": item.get("id"),
                "reviewer_id": reviewer_id,
                "reviewer_name": "User",
                "rating": rating_doc.get("rating"),
                "comment": rating_doc.get("comment") or "",
                "image_urls": rating_doc.get("image_urls") or [],
                "created_at": rating_doc.get("rated_at") or item.get("updated_at"),
                "job_title": item.get("job_title") or item.get("title") or "",
            }
        )

    if reviewer_ids:
        users = await db.users.find(
            {"id": {"$in": [uid for uid in reviewer_ids if uid]}},
            {"_id": 0, "id": 1, "name": 1, "photo_url": 1},
        ).to_list(len(reviewer_ids))
        user_by_id = {u["id"]: u for u in users}
        for review in reviews:
            reviewer = user_by_id.get(review.get("reviewer_id")) or {}
            review["reviewer_name"] = reviewer.get("name") or "User"
            review["reviewer_photo_url"] = reviewer.get("photo_url")

    stats = (await _rating_stats_for_user_ids([expert_user_id])).get(
        expert_user_id,
        {"rating_count": 0, "rating_avg": 0.0},
    )
    doc["rating_count"] = stats["rating_count"]
    doc["rating_avg"] = stats["rating_avg"]
    doc["reviews"] = reviews
    return doc
