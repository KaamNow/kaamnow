"""
Work Requests — direction-based request model.
Everyone is a user. No customer/worker role.

request_type:
  job_application  — user applies to a posted job (requested_to = job poster)
  job_invitation   — job poster invites a service profile user (requested_by = job poster)
  direct_booking   — user directly requests another user (no job)
"""

import asyncio
import uuid

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..auth import get_current_user
from ..db import db
from ..utils import utc_now_iso
from ..whatsapp_notify import _send as _wa_send

router = APIRouter(prefix="/api/work-requests", tags=["work-requests"])

# ── Labels returned to frontend ─────────────────────────────────────────────
STATUS_LABEL = {
    "requested": "Pending",
    "accepted": "Accepted",
    "rejected": "Declined",
    "cancelled": "Cancelled",
    "completed": "Completed",
}
REQUEST_TYPE_LABEL = {
    "job_application": "Job Application",
    "job_invitation": "Job Invitation",
    "direct_booking": "Direct Request",
}
ACTION_LABEL = {
    "accept": "Accept",
    "reject": "Decline",
    "cancel": "Cancel Request",
    "complete": "Mark as Completed",
    "message": "Send a Message",
}


async def _get_request(request_id: str, user: dict) -> dict:
    doc = await db.work_requests.find_one({"id": request_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Request not found")
    uid = user["id"]
    if uid not in (doc.get("requested_by_user_id"), doc.get("requested_to_user_id")):
        raise HTTPException(status_code=403, detail="You cannot access this request")
    return doc


async def _enrich(doc: dict, uid: str) -> dict:
    """Attach computed fields the frontend uses."""
    status = doc.get("status", "requested")
    is_sender = uid == doc.get("requested_by_user_id")
    is_receiver = uid == doc.get("requested_to_user_id")
    direction = "sent" if is_sender else "received"

    # Available actions
    actions = []
    if is_receiver and status == "requested":
        actions = ["accept", "reject"]
    if is_sender and status == "requested":
        actions = ["cancel"]
    if status == "accepted":
        actions = ["message", "complete"]

    # Other user info
    other_uid = doc.get("requested_to_user_id") if is_sender else doc.get("requested_by_user_id")
    other_user = None
    if other_uid:
        u = await db.users.find_one(
            {"id": other_uid}, {"_id": 0, "id": 1, "name": 1, "photo_url": 1}
        )
        other_user = u

    # Job summary
    job_summary = None
    if doc.get("job_id"):
        j = await db.jobs.find_one(
            {"id": doc["job_id"]},
            {"_id": 0, "id": 1, "title": 1, "date_required": 1, "budget_max": 1},
        )
        job_summary = j

    # Last message preview (for chat list)
    last_msg = await db.messages.find_one(
        {"work_request_id": doc["id"]},
        {"_id": 0, "text": 1, "image_url": 1, "voice_url": 1, "created_at": 1, "sender_id": 1},
        sort=[("created_at", -1)],
    )
    last_message = None
    if last_msg:
        preview = last_msg.get("text") or (
            "Photo" if last_msg.get("image_url") else "Voice message"
        )
        last_message = {
            "text": preview,
            "created_at": last_msg.get("created_at"),
            "is_mine": last_msg.get("sender_id") == uid,
        }

    return {
        **doc,
        "direction": direction,
        "is_request_sender": is_sender,
        "is_request_receiver": is_receiver,
        "can_act": is_receiver and status == "requested",
        "can_cancel": is_sender and status == "requested",
        "available_actions": actions,
        "action_labels": {a: ACTION_LABEL[a] for a in actions},
        "status_label": STATUS_LABEL.get(status, status),
        "request_type_label": REQUEST_TYPE_LABEL.get(doc.get("request_type", ""), "Request"),
        "other_user": other_user,
        "job_summary": job_summary,
        "last_message": last_message,
    }


async def _notify(
    user_id: str, title: str, body: str, ref_id: str = None, kind: str = "new_request"
):
    if not user_id:
        return

    # 1. In-app notification (bell icon)
    try:
        await db.notifications.insert_one(
            {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "title": title,
                "body": body,
                "kind": kind,
                "ref_id": ref_id,
                "read": False,
                "created_at": utc_now_iso(),
            }
        )
    except Exception:
        pass

    # Fetch recipient for push token + phone
    try:
        recipient = await db.users.find_one(
            {"id": user_id}, {"_id": 0, "push_token": 1, "phone_primary": 1}
        )
    except Exception:
        return

    # 2. Expo push notification
    push_token = (recipient or {}).get("push_token")
    if push_token and push_token.startswith("ExponentPushToken"):
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                await client.post(
                    "https://exp.host/--/api/v2/push/send",
                    json={
                        "to": push_token,
                        "title": title,
                        "body": body,
                        "data": {"ref_id": ref_id},
                    },
                    headers={"Accept": "application/json", "Content-Type": "application/json"},
                )
        except Exception:
            pass

    # 3. WhatsApp notification (run sync in thread to avoid blocking event loop)
    phone = (recipient or {}).get("phone_primary")
    if phone:
        try:
            await asyncio.to_thread(_wa_send, phone, f"*{title}*\n{body}\n\n_KaamNow_")
        except Exception:
            pass


# ── POST /work-requests ──────────────────────────────────────────────────────
@router.post("")
async def create_work_request(body: dict, user: dict = Depends(get_current_user)):
    request_type = body.get("request_type")  # job_application | job_invitation | direct_booking
    job_id = body.get("job_id")
    requested_to = body.get("requested_to_user_id")
    message = (body.get("message") or "")[:500]
    proposed_price = body.get("proposed_price")
    proposed_date = body.get("proposed_date")

    if request_type not in ("job_application", "job_invitation", "direct_booking"):
        raise HTTPException(
            status_code=400,
            detail="request_type must be job_application, job_invitation, or direct_booking",
        )

    uid = user["id"]

    # Resolve requested_to_user_id from job ownership rules
    if request_type == "job_application":
        if not job_id:
            raise HTTPException(status_code=400, detail="job_id required for job_application")
        job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if job.get("status") != "open":
            raise HTTPException(status_code=400, detail="Job is not open for applications")
        if job.get("posted_by_user_id") == uid:
            raise HTTPException(status_code=400, detail="You cannot apply to your own job")
        requested_to = job["posted_by_user_id"]

    elif request_type == "job_invitation":
        if not job_id or not requested_to:
            raise HTTPException(
                status_code=400,
                detail="job_id and requested_to_user_id required for job_invitation",
            )
        job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if job.get("posted_by_user_id") != uid:
            raise HTTPException(status_code=403, detail="Only the job poster can invite users")

    elif request_type == "direct_booking":
        if not requested_to:
            raise HTTPException(
                status_code=400, detail="requested_to_user_id required for direct_booking"
            )

    if not requested_to:
        raise HTTPException(status_code=400, detail="Could not resolve recipient")
    if requested_to == uid:
        raise HTTPException(status_code=400, detail="You cannot send a request to yourself")

    # Recipient must exist
    recipient = await db.users.find_one({"id": requested_to}, {"_id": 0, "id": 1, "name": 1})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient user not found")

    # Prevent duplicate pending requests. Accepted requests are already active work;
    # they should not block a user from sending a new hire request later.
    dup = await db.work_requests.find_one(
        {
            "requested_by_user_id": uid,
            "requested_to_user_id": requested_to,
            "job_id": job_id,
            "request_type": request_type,
            "status": "requested",
        }
    )
    if dup:
        raise HTTPException(status_code=400, detail="Active request already exists")

    now = utc_now_iso()
    doc = {
        "id": str(uuid.uuid4()),
        "requested_by_user_id": uid,
        "requested_by_name": user.get("name", ""),
        "requested_to_user_id": requested_to,
        "requested_to_name": recipient.get("name", ""),
        "request_type": request_type,
        "job_id": job_id,
        "message": message,
        "proposed_price": proposed_price,
        "proposed_date": proposed_date,
        "status": "requested",
        "created_at": now,
        "updated_at": now,
        "accepted_at": None,
        "rejected_at": None,
        "cancelled_at": None,
        "completed_at": None,
    }
    await db.work_requests.insert_one(doc)
    doc.pop("_id", None)

    await _notify(
        requested_to,
        f"New request from {user.get('name', 'Someone')}",
        message or "Tap to view and respond.",
        doc["id"],
        kind="new_request",
    )
    return await _enrich(doc, uid)


# ── GET /work-requests/mine ──────────────────────────────────────────────────
@router.get("/mine")
async def list_my_requests(user: dict = Depends(get_current_user)):
    uid = user["id"]
    docs = (
        await db.work_requests.find(
            {"$or": [{"requested_by_user_id": uid}, {"requested_to_user_id": uid}]},
            {"_id": 0},
        )
        .sort("created_at", -1)
        .to_list(200)
    )

    return [await _enrich(d, uid) for d in docs]


# ── GET /work-requests/{id} ──────────────────────────────────────────────────
@router.get("/{request_id}")
async def get_request(request_id: str, user: dict = Depends(get_current_user)):
    doc = await _get_request(request_id, user)
    return await _enrich(doc, user["id"])


# ── POST /work-requests/{id}/accept ─────────────────────────────────────────
@router.post("/{request_id}/accept")
async def accept_request(request_id: str, user: dict = Depends(get_current_user)):
    doc = await _get_request(request_id, user)
    if doc.get("requested_to_user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Only the recipient can accept")
    if doc.get("status") != "requested":
        raise HTTPException(status_code=400, detail="Only pending requests can be accepted")

    now = utc_now_iso()
    await db.work_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "accepted", "accepted_at": now, "updated_at": now}},
    )
    # If this is tied to a job, mark it assigned.
    # For job_application: the applicant (sender) becomes the selected worker.
    # For job_invitation: the invited party (receiver) becomes the selected worker.
    if doc.get("job_id"):
        is_invitation = doc.get("request_type") == "job_invitation"
        selected_user = (
            doc["requested_to_user_id"] if is_invitation else doc["requested_by_user_id"]
        )
        await db.jobs.update_one(
            {"id": doc["job_id"]},
            {
                "$set": {
                    "status": "assigned",
                    "selected_request_id": request_id,
                    "selected_user_id": selected_user,
                    "updated_at": now,
                }
            },
        )
    await _notify(
        doc["requested_by_user_id"],
        "Request accepted!",
        f"{user.get('name', 'User')} accepted your request.",
        request_id,
        kind="accepted",
    )
    updated = await db.work_requests.find_one({"id": request_id}, {"_id": 0})
    return await _enrich(updated, user["id"])


# ── POST /work-requests/{id}/reject ─────────────────────────────────────────
@router.post("/{request_id}/reject")
async def reject_request(request_id: str, user: dict = Depends(get_current_user)):
    doc = await _get_request(request_id, user)
    if doc.get("requested_to_user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Only the recipient can decline")
    if doc.get("status") != "requested":
        raise HTTPException(status_code=400, detail="Only pending requests can be declined")

    now = utc_now_iso()
    await db.work_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "rejected", "rejected_at": now, "updated_at": now}},
    )
    await _notify(
        doc["requested_by_user_id"],
        "Request declined",
        f"{user.get('name', 'User')} declined your request.",
        request_id,
        kind="rejected",
    )
    updated = await db.work_requests.find_one({"id": request_id}, {"_id": 0})
    return await _enrich(updated, user["id"])


# ── POST /work-requests/{id}/cancel ─────────────────────────────────────────
@router.post("/{request_id}/cancel")
async def cancel_request(request_id: str, user: dict = Depends(get_current_user)):
    doc = await _get_request(request_id, user)
    if doc.get("requested_by_user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Only the sender can cancel")
    if doc.get("status") != "requested":
        raise HTTPException(status_code=400, detail="Only pending requests can be cancelled")

    now = utc_now_iso()
    await db.work_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "cancelled", "cancelled_at": now, "updated_at": now}},
    )
    await _notify(
        doc["requested_to_user_id"],
        "Request cancelled",
        f"{user.get('name', 'User')} cancelled their request.",
        request_id,
        kind="rejected",
    )
    updated = await db.work_requests.find_one({"id": request_id}, {"_id": 0})
    return await _enrich(updated, user["id"])


def _expert_id(doc: dict) -> str:
    """Return the user_id of the expert (person who does the work) for any request type."""
    if doc.get("request_type") == "job_application":
        return doc.get("requested_by_user_id")  # worker applied → worker is sender
    return doc.get("requested_to_user_id")  # invitation / direct_booking → worker is receiver


# ── POST /work-requests/{id}/complete ───────────────────────────────────────
@router.post("/{request_id}/complete")
async def complete_request(request_id: str, user: dict = Depends(get_current_user)):
    doc = await _get_request(request_id, user)
    if _expert_id(doc) != user["id"]:
        raise HTTPException(
            status_code=403, detail="Only the expert who did the work can mark it complete"
        )
    if doc.get("status") != "accepted":
        raise HTTPException(status_code=400, detail="Only accepted requests can be completed")

    now = utc_now_iso()
    await db.work_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "completed", "completed_at": now, "updated_at": now}},
    )
    if doc.get("job_id"):
        await db.jobs.update_one(
            {"id": doc["job_id"]},
            {"$set": {"status": "completed", "updated_at": now}},
        )
    # Increment expert's completed_jobs counter on their service profile
    await db.service_profiles.update_one(
        {"user_id": user["id"]},
        {"$inc": {"completed_jobs": 1}, "$set": {"updated_at": now}},
    )
    other_uid = (
        doc["requested_to_user_id"]
        if user["id"] == doc["requested_by_user_id"]
        else doc["requested_by_user_id"]
    )
    await _notify(
        other_uid,
        "Work completed",
        f"{user.get('name', 'User')} marked the work as completed.",
        request_id,
        kind="completed",
    )
    updated = await db.work_requests.find_one({"id": request_id}, {"_id": 0})
    return await _enrich(updated, user["id"])


# ── POST /work-requests/{id}/rating-photo ────────────────────────────────────
@router.post("/{request_id}/rating-photo")
async def upload_rating_photo(
    request_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    doc = await db.work_requests.find_one({"id": request_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Work request not found")
    if doc.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Only completed requests can be rated")
    parties = {doc.get("requested_by_user_id"), doc.get("requested_to_user_id")}
    if user["id"] not in parties:
        raise HTTPException(status_code=403, detail="Not a party to this request")
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Image file is empty")
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be 5MB or smaller")
    from ..cloudinary_service import upload_review_image

    public_id = f"review_{request_id}_{user['id']}_{uuid.uuid4().hex}"
    photo_url = upload_review_image(file_bytes, public_id)
    return {"ok": True, "photo_url": photo_url}


# ── POST /work-requests/{id}/rate ────────────────────────────────────────────
@router.post("/{request_id}/rate")
async def rate_request(request_id: str, body: dict, user: dict = Depends(get_current_user)):
    doc = await db.work_requests.find_one({"id": request_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Work request not found")
    if doc.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Only completed requests can be rated")
    parties = {doc.get("requested_by_user_id"), doc.get("requested_to_user_id")}
    if user["id"] not in parties:
        raise HTTPException(status_code=403, detail="Not a party to this request")

    rating = body.get("rating")
    if rating is None or not (1 <= float(rating) <= 5):
        raise HTTPException(status_code=422, detail="Rating must be between 1 and 5")
    comment = (body.get("comment") or "")[:500]
    image_urls = body.get("image_urls") or []
    now = utc_now_iso()

    is_sender = user["id"] == doc.get("requested_by_user_id")
    rating_field = "sender_rating" if is_sender else "receiver_rating"
    rated_user_id = (
        doc.get("requested_to_user_id") if is_sender else doc.get("requested_by_user_id")
    )

    rating_doc = {
        "rating": float(rating),
        "comment": comment,
        "image_urls": image_urls,
        "rated_at": now,
    }
    await db.work_requests.update_one(
        {"id": request_id},
        {"$set": {rating_field: rating_doc, "updated_at": now}},
    )

    expert_user_id = _expert_id(doc)
    sp = (
        await db.service_profiles.find_one({"user_id": rated_user_id}, {"_id": 0})
        if rated_user_id == expert_user_id
        else None
    )
    if sp:
        old_count = sp.get("rating_count") or 0
        old_avg = sp.get("rating_avg") or 0.0
        new_count = old_count + 1
        new_avg = round((old_avg * old_count + float(rating)) / new_count, 2)
        await db.service_profiles.update_one(
            {"user_id": rated_user_id},
            {"$set": {"rating_avg": new_avg, "rating_count": new_count, "updated_at": now}},
        )

    return {"ok": True, "rating": float(rating)}
