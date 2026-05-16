import threading
import uuid
from typing import Literal, Optional

from fastapi import HTTPException

from .db import db
from .utils import utc_now_iso
from .whatsapp_notify import (
    notify_customer_work_completed,
    notify_worker_job_completed,
    notify_worker_rating_received,
)


async def _notify(user_id: str, title: str, body: str, kind: str, ref_id: str = None) -> None:
    """
    Store in-app notification AND fire WhatsApp if the user has a phone.
    WhatsApp is sent for booking_accepted and booking_rejected events.
    """
    if not user_id:
        return

    try:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": title,
            "body": body,
            "kind": kind,
            "ref_id": ref_id,
            "read": False,
            "created_at": utc_now_iso(),
        })
    except Exception:
        pass

    # Fire push notification + WhatsApp for all engagement events
    if kind in ("booking_accepted", "booking_rejected", "interest_withdrawn",
                "booking_request", "booking_completed", "booking_cancelled",
                "job_rated", "tier_upgraded", "tier_downgraded"):
        try:
            user = await db.users.find_one(
                {"id": user_id},
                {"_id": 0, "phone_primary": 1, "phone": 1, "mobile": 1, "phone_number": 1, "push_token": 1},
            )
            if user:
                # Push notification (instant, lock-screen)
                push_token = user.get("push_token")
                if push_token:
                    from .push_service import send_push
                    import asyncio
                    asyncio.create_task(send_push(push_token, title, body, {"kind": kind, "ref_id": ref_id or ""}))

                # WhatsApp (rich message with details)
                phone = _notification_phone(user)
                if phone:
                    from .whatsapp_notify import _send as _wa_send
                    import threading
                    threading.Thread(
                        target=_wa_send,
                        args=(phone, f"{title}\n{body}"),
                        daemon=True,
                    ).start()
        except Exception:
            pass

TIER_THRESHOLDS = [
    # (tier, name, min_jobs, min_rating, badge_emoji)
    (4, "Elite",    50, 4.5, "🏆"),
    (3, "Pro",      20, 4.0, "🔵"),
    (2, "Verified",  5, 3.5, "✅"),
    (1, "Basic",     0, 0.0, ""),
]

TIER_NAMES = {1: "Basic", 2: "Verified", 3: "Pro", 4: "Elite"}
TIER_EMOJIS = {1: "", 2: "✅", 3: "🔵", 4: "🏆"}


def _notification_phone(user: Optional[dict]) -> Optional[str]:
    if not user:
        return None
    return user.get("phone_primary") or user.get("phone") or user.get("mobile") or user.get("phone_number")


async def _check_tier(worker_id: str, worker_user_id: str) -> None:
    """Recompute trust_tier based on total_jobs + avg_rating. Notify on change."""
    worker = await db.workers.find_one({"id": worker_id}, {"_id": 0, "total_jobs": 1, "avg_rating": 1, "trust_tier": 1})
    if not worker:
        return

    jobs = worker.get("total_jobs") or 0
    rating = worker.get("avg_rating") or 0.0
    current_tier = worker.get("trust_tier") or 1

    # Find highest tier the worker qualifies for
    new_tier = 1
    for tier, _, min_jobs, min_rating, _ in TIER_THRESHOLDS:
        if jobs >= min_jobs and rating >= min_rating:
            new_tier = tier
            break

    if new_tier == current_tier:
        return

    await db.workers.update_one({"id": worker_id}, {"$set": {"trust_tier": new_tier}})

    if new_tier > current_tier:
        emoji = TIER_EMOJIS[new_tier]
        name = TIER_NAMES[new_tier]
        await _notify(
            worker_user_id,
            f"{emoji} बधाई हो! आप KaamNow {name} बन गए!",
            f"आपकी rating {rating}/5 और {jobs} jobs के साथ आप {name} tier पर पहुँच गए। "
            f"अब search results में ऊपर दिखेंगे।",
            "tier_upgraded",
        )
    else:
        old_name = TIER_NAMES[current_tier]
        new_name = TIER_NAMES[new_tier]
        await _notify(
            worker_user_id,
            f"Tier changed: {old_name} → {new_name}",
            f"आपकी rating या jobs कम होने से tier {new_name} हो गई। "
            f"Rating बढ़ाएं और {TIER_NAMES.get(current_tier, old_name)} वापस पाएं।",
            "tier_downgraded",
        )


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
    status = engagement.get("status", "")
    accepted = status in ("accepted", "completed")
    worker_rating = engagement.get("worker_rating") or {}
    customer_rating = engagement.get("customer_rating") or {}
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
        "status": booking_status_from_engagement(status),
        "rating": worker_rating.get("stars"),
        "comment": worker_rating.get("comment"),
        "rating_image_urls": worker_rating.get("image_urls", []),
        "customer_rating": customer_rating.get("stars"),
        "customer_comment": customer_rating.get("comment"),
        "customer_rating_image_urls": customer_rating.get("image_urls", []),
        "source": engagement.get("source"),
        "engagement_status": status,
        "created_at": engagement.get("created_at"),
        # Contact details — only unlocked after acceptance
        "customer_phone": engagement.get("customer_phone") if accepted else None,
        "worker_phone": engagement.get("worker_phone") if accepted else None,
        "customer_village": engagement.get("customer_village") if accepted else None,
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

    # Notify the party who must respond next.
    if source == "worker_interest":
        await _notify(
            job["customer_id"],
            f"New interest: {engagement['job_title']}",
            f"{worker['name']} is interested in your job. Tap to approve or reject.",
            "booking_request",
            engagement["id"],
        )
    elif source == "customer_booking":
        await _notify(
            worker.get("user_id", ""),
            f"New booking request: {engagement['job_title']}",
            f"{job.get('customer_name') or user.get('name') or 'Customer'} wants to hire you. Tap to accept or decline.",
            "booking_request",
            engagement["id"],
        )

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


def _can_decide_engagement(engagement: dict, user: dict, worker: Optional[dict]) -> bool:
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

    now = utc_now_iso()

    # Fetch contact details for sharing
    worker_user = await db.users.find_one({"id": engagement_worker.get("user_id")}, {"_id": 0, "phone_primary": 1, "name": 1})
    customer_user = await db.users.find_one({"id": engagement["customer_id"]}, {"_id": 0, "phone_primary": 1, "name": 1, "village": 1, "address": 1})

    customer_phone = customer_user.get("phone_primary") if customer_user else None
    customer_village = ((customer_user.get("address") or {}).get("village") or customer_user.get("village")) if customer_user else None

    await db.engagements.update_one(
        {"id": engagement_id},
        {"$set": {
            "status": "accepted",
            "accepted_at": now,
            "updated_at": now,
            "worker_phone": worker_user.get("phone_primary") if worker_user else None,
            "customer_phone": customer_phone,
            "customer_village": customer_village,
        }},
    )

    accepted_worker_ids = list(job.get("accepted_worker_ids") or [])
    if engagement["worker_id"] not in accepted_worker_ids:
        accepted_worker_ids.append(engagement["worker_id"])

    # If job is now fully booked, mark it
    workers_needed = int(job.get("workers_needed") or 1)
    new_filled = len(accepted_worker_ids)
    new_job_status = "booked" if new_filled >= workers_needed else "open"

    await db.jobs.update_one(
        {"id": job["id"]},
        {"$set": {
            "accepted_worker_ids": accepted_worker_ids,
            "filled_count": new_filled,
            "status": new_job_status,
        }},
    )

    if engagement.get("source") == "worker_interest":
        await _notify(
            engagement_worker.get("user_id", ""),
            f"✅ Booking confirmed: {engagement.get('job_title')}",
            f"Your interest was approved! Contact the customer at {customer_user.get('phone_primary', 'N/A') if customer_user else 'N/A'}.",
            "booking_accepted",
            engagement_id,
        )
    elif engagement.get("source") == "customer_booking":
        await _notify(
            engagement["customer_id"],
            f"✅ Worker accepted: {engagement.get('job_title')}",
            f"{engagement.get('worker_name', 'Worker')} accepted your booking request. Contact details are now available.",
            "booking_accepted",
            engagement_id,
        )

    return {"ok": True, "worker_phone": worker_user.get("phone_primary") if worker_user else None, "customer_phone": customer_user.get("phone_primary") if customer_user else None}


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

    now = utc_now_iso()
    await db.engagements.update_one(
        {"id": engagement_id},
        {"$set": {"status": "rejected", "rejected_at": now, "updated_at": now}},
    )

    engagement_worker = await db.workers.find_one({"id": engagement["worker_id"]}, {"_id": 0})
    if engagement.get("source") == "worker_interest" and engagement_worker:
        await _notify(
            engagement_worker.get("user_id", ""),
            f"Interest not approved: {engagement.get('job_title')}",
            "The customer chose a different worker for this job. Browse the feed for other opportunities.",
            "booking_rejected",
            engagement_id,
        )
    elif engagement.get("source") == "customer_booking":
        await _notify(
            engagement["customer_id"],
            f"Worker declined: {engagement.get('job_title')}",
            f"{engagement.get('worker_name', 'Worker')} could not accept your booking request. You can request another worker.",
            "booking_rejected",
            engagement_id,
        )

    return {"ok": True}


async def cancel_engagement(engagement_id: str, user: dict) -> dict:
    engagement = await get_engagement_for_user(engagement_id, user)
    if engagement["status"] not in ["requested", "accepted"]:
        raise HTTPException(status_code=400, detail="Only active engagements can be cancelled")

    now = utc_now_iso()
    await db.engagements.update_one(
        {"id": engagement_id},
        {"$set": {"status": "cancelled", "cancelled_at": now, "updated_at": now}},
    )

    # If worker is cancelling, notify customer; if customer cancels, notify worker
    if user["role"] == "worker":
        worker_name = engagement.get("worker_name", "A worker")
        was_accepted = engagement["status"] == "accepted"
        if was_accepted:
            kind = "booking_cancelled"
            title = f"Booking cancelled: {engagement.get('job_title')}"
            body = f"{worker_name} ने active booking cancel कर दी। दूसरा worker ढूंढें।"
        else:
            kind = "interest_withdrawn"
            title = f"Interest withdrawn: {engagement.get('job_title')}"
            body = f"{worker_name} ने interest वापस ले ली। आपकी job फिर से open है।"
        await _notify(engagement["customer_id"], title, body, kind, engagement_id)

        # Reopen job + decrement filled_count if accepted booking cancelled
        job = await db.jobs.find_one({"id": engagement["job_id"]}, {"_id": 0})
        if job:
            accepted_ids = [w for w in (job.get("accepted_worker_ids") or []) if w != engagement["worker_id"]]
            new_filled = len(accepted_ids)
            await db.jobs.update_one(
                {"id": engagement["job_id"]},
                {"$set": {"status": "open", "accepted_worker_ids": accepted_ids, "filled_count": new_filled}}
            )
        # Restore worker availability immediately
        await db.workers.update_one(
            {"id": engagement["worker_id"]},
            {"$set": {"available": True, "availability_status": "available"}}
        )

        # ── Cancellation limit enforcement ────────────────────────────
        from datetime import datetime
        month_start = datetime.utcnow().strftime("%Y-%m-01")
        monthly_count = await db.engagements.count_documents({
            "worker_id": engagement["worker_id"],
            "status": "cancelled",
            "cancelled_at": {"$gte": month_start},
        })

        worker_doc = await db.workers.find_one({"id": engagement["worker_id"]}, {"_id": 0, "user_id": 1})
        worker_user_id = worker_doc.get("user_id") if worker_doc else None

        if monthly_count >= 8 and worker_user_id:
            # Restrict account
            await db.workers.update_one(
                {"id": engagement["worker_id"]},
                {"$set": {"available": False, "availability_status": "restricted",
                          "restriction_reason": "cancellation_limit"}}
            )
            await _notify(
                worker_user_id,
                "🚫 Account restricted",
                f"इस महीने {monthly_count} cancellations हो गईं। आपका account temporarily restrict है। Support से संपर्क करें।",
                "booking_rejected",
                engagement_id,
            )
        elif monthly_count >= 5 and worker_user_id:
            # Warning
            remaining = 8 - monthly_count
            await _notify(
                worker_user_id,
                f"⚠️ Warning: {monthly_count} cancellations this month",
                f"आप इस महीने {monthly_count} बार cancel कर चुके हैं। {remaining} और cancel हुईं तो account restrict होगा।",
                "booking_rejected",
                engagement_id,
            )
    elif user["role"] == "customer":
        eng_worker = await db.workers.find_one({"id": engagement["worker_id"]}, {"_id": 0})
        if eng_worker:
            await _notify(
                eng_worker.get("user_id", ""),
                f"Booking cancelled: {engagement.get('job_title')}",
                "The customer cancelled this booking. Browse the feed for other opportunities.",
                "booking_rejected",
                engagement_id,
            )

    return {"ok": True}


async def complete_engagement(engagement_id: str, user: dict) -> dict:
    engagement = await db.engagements.find_one({"id": engagement_id})
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    # Only the assigned worker can mark as completed
    worker_doc = await db.workers.find_one({"id": engagement["worker_id"]}, {"_id": 0, "user_id": 1})
    is_worker = user["role"] == "worker" and worker_doc and worker_doc.get("user_id") == user["id"]

    if not is_worker:
        raise HTTPException(status_code=403, detail="Only the assigned worker can mark a job as complete")
    if engagement["status"] != "accepted":
        raise HTTPException(status_code=400, detail="Only accepted engagements can be completed")

    now = utc_now_iso()
    await db.engagements.update_one(
        {"id": engagement_id},
        {"$set": {"status": "completed", "completed_at": now, "updated_at": now}},
    )

    # Restore worker availability + update total_jobs count
    if worker_doc:
        completed_count = await db.engagements.count_documents(
            {"worker_id": engagement["worker_id"], "status": "completed"}
        )
        await db.workers.update_one(
            {"id": engagement["worker_id"]},
            {"$set": {"available": True, "availability_status": "available", "total_jobs": completed_count}}
        )

    # Mark the parent job as completed
    await db.jobs.update_one(
        {"id": engagement["job_id"]},
        {"$set": {"status": "completed"}}
    )

    # Notify customer that work is done — rate the worker
    await _notify(
        engagement["customer_id"],
        f"✅ काम पूरा: {engagement.get('job_title')}",
        f"{engagement.get('worker_name', 'Worker')} ने काम पूरा कर दिया। Worker को rate करें।",
        "booking_completed",
        engagement_id,
    )

    # WhatsApp: customer prompt to rate + worker confirmation
    customer_user = await db.users.find_one(
        {"id": engagement["customer_id"]},
        {"_id": 0, "phone_primary": 1, "phone": 1, "mobile": 1, "phone_number": 1},
    )
    customer_phone = _notification_phone(customer_user)
    if customer_phone:
        threading.Thread(
            target=notify_customer_work_completed,
            args=(customer_phone, engagement),
            daemon=True,
        ).start()

    if worker_doc and worker_doc.get("user_id"):
        worker_user = await db.users.find_one(
            {"id": worker_doc["user_id"]},
            {"_id": 0, "phone_primary": 1, "phone": 1, "mobile": 1, "phone_number": 1},
        )
        worker_phone = _notification_phone(worker_user)
        if worker_phone:
            threading.Thread(
                target=notify_worker_job_completed,
                args=(worker_phone, engagement),
                daemon=True,
            ).start()

    # Check if worker earned a tier upgrade (more jobs = possible promotion)
    if worker_doc and worker_doc.get("user_id"):
        await _check_tier(engagement["worker_id"], worker_doc["user_id"])

    return {"ok": True}


def _safe_review_images(image_urls: Optional[list] = None) -> list[str]:
    if not isinstance(image_urls, list):
        return []
    urls = []
    for url in image_urls:
        if isinstance(url, str) and url.startswith("http"):
            urls.append(url)
        if len(urls) >= 3:
            break
    return urls


async def rate_engagement(
    engagement_id: str,
    rating: int,
    comment: str,
    user: dict,
    image_urls: Optional[list] = None,
) -> dict:
    engagement = await db.engagements.find_one({"id": engagement_id})
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")
    
    if engagement["status"] != "completed":
        raise HTTPException(status_code=400, detail="Only completed engagements can be rated")

    try:
        rating = int(rating)
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="Rating must be a number")
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=422, detail="Rating must be between 1 and 5")

    now = utc_now_iso()
    rating_doc = {
        "stars": rating,
        "comment": comment,
        "image_urls": _safe_review_images(image_urls),
        "reviewer_user_id": user["id"],
        "created_at": now,
    }
    if user["role"] == "customer":
        if engagement["customer_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="You can only rate your own hires")
        
        await db.engagements.update_one(
            {"id": engagement_id},
            {
                "$set": {
                    "worker_rating": rating_doc,
                    "updated_at": now
                }
            }
        )
        
        # Recompute worker avg_rating only — total_jobs is set by complete_engagement
        pipeline = [
            {"$match": {"worker_id": engagement["worker_id"], "worker_rating": {"$ne": None}}},
            {"$group": {"_id": "$worker_id", "avg": {"$avg": "$worker_rating.stars"}}},
        ]
        agg = await db.engagements.aggregate(pipeline).to_list(1)
        if agg:
            await db.workers.update_one(
                {"id": engagement["worker_id"]},
                {"$set": {"avg_rating": round(agg[0]["avg"], 2)}},
            )

        # Notify worker they received a rating + check minimum rating thresholds
        new_avg = round(agg[0]["avg"], 2) if agg else None
        worker_doc = await db.workers.find_one({"id": engagement["worker_id"]}, {"_id": 0, "user_id": 1})
        if worker_doc and worker_doc.get("user_id"):
            stars = "⭐" * rating
            await _notify(
                worker_doc["user_id"],
                f"{stars} Rating मिली: {rating}/5",
                f"{engagement.get('job_title', 'Job')} के लिए {rating}/5 stars।"
                + (f' "{comment}"' if comment else ""),
                "job_rated",
                engagement_id,
            )
            worker_user = await db.users.find_one(
                {"id": worker_doc["user_id"]},
                {"_id": 0, "phone_primary": 1, "phone": 1, "mobile": 1, "phone_number": 1},
            )
            worker_phone = _notification_phone(worker_user)
            if worker_phone:
                threading.Thread(
                    target=notify_worker_rating_received,
                    args=(worker_phone, rating, comment or "", engagement.get("job_title", "Job")),
                    daemon=True,
                ).start()

            # ── Minimum rating enforcement ────────────────────────────
            if new_avg is not None:
                if new_avg < 2.5:
                    # Flag account — hidden from new job matches
                    await db.workers.update_one(
                        {"id": engagement["worker_id"]},
                        {"$set": {"available": False, "availability_status": "flagged",
                                  "restriction_reason": "low_rating"}}
                    )
                    await _notify(
                        worker_doc["user_id"],
                        "🚫 Account flagged: Low rating",
                        f"आपकी rating {new_avg}/5 हो गई है जो बहुत कम है। नए jobs में नहीं दिखेंगे। "
                        f"Quality improve करें और support से contact करें।",
                        "booking_rejected",
                        engagement_id,
                    )
                elif new_avg < 3.0:
                    # Strong warning + reduce visibility
                    await db.workers.update_one(
                        {"id": engagement["worker_id"]},
                        {"$set": {"low_rating_warning": "strong"}}
                    )
                    await _notify(
                        worker_doc["user_id"],
                        f"⚠️ Rating बहुत कम: {new_avg}/5",
                        f"आपकी rating {new_avg}/5 है। अगर 2.5 से नीचे गई तो account band हो जाएगा। "
                        f"हर काम अच्छे से करें।",
                        "booking_rejected",
                        engagement_id,
                    )
                elif new_avg < 3.5:
                    # First warning
                    await db.workers.update_one(
                        {"id": engagement["worker_id"]},
                        {"$set": {"low_rating_warning": "first"}}
                    )
                    await _notify(
                        worker_doc["user_id"],
                        f"⚠️ Rating कम हो रही है: {new_avg}/5",
                        f"आपकी rating {new_avg}/5 है। 3.5 से ऊपर रखें ताकि ज़्यादा jobs मिलें।",
                        "job_rated",
                        engagement_id,
                    )
                else:
                    # Clear any previous warnings if rating recovered
                    await db.workers.update_one(
                        {"id": engagement["worker_id"]},
                        {"$unset": {"low_rating_warning": ""}}
                    )

            # Check tier upgrade/downgrade after every rating
            await _check_tier(engagement["worker_id"], worker_doc["user_id"])

    elif user["role"] == "worker":
        worker = await db.workers.find_one({"user_id": user["id"]})
        if not worker or worker["id"] != engagement["worker_id"]:
            raise HTTPException(status_code=403, detail="You can only rate your own jobs")
            
        await db.engagements.update_one(
            {"id": engagement_id},
            {
                "$set": {
                    "customer_rating": rating_doc,
                    "updated_at": now
                }
            }
        )
        # We could also recompute customer aggregate rating here later
        
    return {"ok": True}
