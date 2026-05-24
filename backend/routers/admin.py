import logging
import re
import uuid
import uuid as _uuid
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from ..auth import create_token, get_current_user, verify_password
from ..config import settings
from ..db import db
from ..utils import utc_now_iso
from ..whatsapp_notify import _send as wa_send

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])


def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def audit(admin: dict, action: str, target: str = "", detail: str = ""):
    """Write one line to the admin_logs collection (fire-and-forget, never raises)."""
    try:
        await db.admin_logs.insert_one(
            {
                "id": str(uuid.uuid4()),
                "admin_id": admin.get("id", ""),
                "admin_name": admin.get("name", "admin"),
                "action": action,
                "target": target,
                "detail": detail,
                "ts": utc_now_iso(),
            }
        )
    except Exception as e:
        logger.warning("audit write failed: %s", e)


@router.post("/login")
async def admin_login(body: dict):
    identifier = (body.get("identifier") or "").strip()
    password = body.get("password") or ""
    if not identifier or not password:
        raise HTTPException(status_code=400, detail="identifier and password required")

    if "@" in identifier:
        query = {"email": identifier.lower(), "role": "admin"}
    else:
        digits = "".join(c for c in identifier if c.isdigit())
        query = {"phone_primary": {"$regex": digits[-10:]}, "role": "admin"}

    admin = await db.users.find_one(query)
    if not admin or not admin.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(admin["id"], admin.get("phone_primary", ""))
    return {"access_token": token, "token_type": "bearer"}


# ---------------------------------------------------------------------------
# Bootstrap — create the very first admin account (no auth required,
# protected by ADMIN_BOOTSTRAP_SECRET env var)
# ---------------------------------------------------------------------------


@router.post("/bootstrap")
async def bootstrap_admin(body: dict, x_bootstrap_secret: Optional[str] = Header(None)):
    secret = settings.admin_bootstrap_secret
    if not secret:
        raise HTTPException(status_code=503, detail="Bootstrap not configured")
    if x_bootstrap_secret != secret:
        raise HTTPException(status_code=403, detail="Invalid bootstrap secret")

    phone = (body.get("phone") or "").strip()
    name = (body.get("name") or "KaamNow Admin").strip()
    if not phone:
        raise HTTPException(status_code=400, detail="phone required")

    existing = await db.users.find_one({"phone_primary": phone})
    if existing:
        if existing.get("role") == "admin":
            return {"ok": True, "message": "Admin already exists", "id": existing["id"]}
        # Promote existing user to admin
        await db.users.update_one({"phone_primary": phone}, {"$set": {"role": "admin"}})
        return {"ok": True, "message": "Promoted to admin", "id": existing["id"]}

    admin_id = str(uuid.uuid4())
    await db.users.insert_one(
        {
            "id": admin_id,
            "phone_primary": phone,
            "name": name,
            "role": "admin",
            "phone_verified": True,
            "avatar_color": "#ff6b35",
            "migration_status": "phone_primary",
            "created_at": utc_now_iso(),
        }
    )
    return {"ok": True, "message": "Admin created", "id": admin_id}


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------


@router.get("/stats")
async def get_stats(admin: dict = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    total_experts = await db.service_profiles.count_documents({})
    total_jobs = await db.jobs.count_documents({})
    active_jobs = await db.jobs.count_documents({"status": "open"})

    total_requests = await db.work_requests.count_documents({})
    active_requests = await db.work_requests.count_documents(
        {"status": {"$in": ["requested", "accepted"]}}
    )
    completed_requests = await db.work_requests.count_documents({"status": "completed"})

    gmv_pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$daily_rate"}}},
    ]
    gmv_docs = await db.work_requests.aggregate(gmv_pipeline).to_list(1)
    gmv = gmv_docs[0]["total"] if gmv_docs else 0

    return {
        "users": total_users,
        "experts": total_experts,
        "jobs": {"total": total_jobs, "active": active_jobs},
        "work_requests": {
            "total": total_requests,
            "active": active_requests,
            "completed": completed_requests,
        },
        "gmv": gmv,
    }


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


@router.get("/users")
async def list_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    admin: dict = Depends(get_admin_user),
):
    query = {}
    if role:
        query["role"] = role
    if search:
        pattern = re.escape(search.strip())
        query["$or"] = [
            {"name": {"$regex": pattern, "$options": "i"}},
            {"phone_primary": {"$regex": pattern, "$options": "i"}},
        ]

    users = (
        await db.users.find(query, {"password_hash": 0, "_id": 0})
        .skip(skip)
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    total = await db.users.count_documents(query)

    return {"items": users, "total": total, "skip": skip, "limit": limit}


@router.patch("/users/{user_id}/status")
async def update_user_status(user_id: str, body: dict, admin: dict = Depends(get_admin_user)):
    update_data = {}
    if "status" in body:
        update_data["status"] = body["status"]
    if not update_data:
        raise HTTPException(status_code=400, detail="Invalid payload")
    res = await db.users.update_one({"id": user_id}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@router.post("/users/{user_id}/ban")
async def ban_user(user_id: str, admin: dict = Depends(get_admin_user)):
    res = await db.users.update_one(
        {"id": user_id}, {"$set": {"is_active": False, "status": "banned"}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@router.post("/users/{user_id}/flag")
async def flag_user(user_id: str, admin: dict = Depends(get_admin_user)):
    res = await db.users.update_one({"id": user_id}, {"$set": {"status": "flagged"}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Workers
# ---------------------------------------------------------------------------


@router.get("/experts")
async def list_experts(
    search: Optional[str] = None,
    skill: Optional[str] = None,
    available_only: bool = False,
    limit: int = 50,
    skip: int = 0,
    admin: dict = Depends(get_admin_user),
):
    query: dict = {}
    if available_only:
        query["availability"] = True
    if skill:
        query["skills"] = {"$in": [skill]}
    if search:
        pattern = re.escape(search.strip())
        query["display_name"] = {"$regex": pattern, "$options": "i"}

    profiles = (
        await db.service_profiles.find(query, {"_id": 0})
        .skip(skip)
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    user_ids = [p["user_id"] for p in profiles if p.get("user_id")]
    user_docs = await db.users.find(
        {"id": {"$in": user_ids}}, {"id": 1, "phone_primary": 1, "is_active": 1, "_id": 0}
    ).to_list(len(user_ids))
    user_map = {u["id"]: u for u in user_docs}
    for p in profiles:
        u = user_map.get(p.get("user_id"), {})
        p["phone"] = u.get("phone_primary", "")
        p["is_active"] = u.get("is_active", True)

    total = await db.service_profiles.count_documents(query)
    return {"items": profiles, "total": total, "skip": skip, "limit": limit}


@router.patch("/experts/{profile_id}/suspend")
async def suspend_expert(profile_id: str, body: dict, admin: dict = Depends(get_admin_user)):
    suspend = body.get("suspend", True)
    sp = await db.service_profiles.find_one(
        {"id": profile_id}, {"_id": 0, "user_id": 1, "display_name": 1}
    )
    if not sp:
        raise HTTPException(status_code=404, detail="Service profile not found")
    await db.service_profiles.update_one(
        {"id": profile_id}, {"$set": {"is_active": not suspend, "availability": not suspend}}
    )
    await db.users.update_one(
        {"id": sp["user_id"]}, {"$set": {"status": "suspended" if suspend else "active"}}
    )
    await audit(
        admin,
        "expert.suspended" if suspend else "expert.reactivated",
        profile_id,
        sp.get("display_name", ""),
    )
    return {"ok": True}


@router.patch("/experts/{profile_id}/trust-tier")
async def set_expert_trust_tier(profile_id: str, body: dict, admin: dict = Depends(get_admin_user)):
    tier = body.get("trust_tier")
    if tier not in (1, 2, 3, 4):
        raise HTTPException(status_code=400, detail="trust_tier must be 1, 2, 3, or 4")
    sp = await db.service_profiles.find_one(
        {"id": profile_id}, {"_id": 0, "user_id": 1, "display_name": 1}
    )
    if not sp:
        raise HTTPException(status_code=404, detail="Service profile not found")
    verification_status = "verified" if tier >= 2 else "unverified"
    await db.service_profiles.update_one(
        {"id": profile_id},
        {
            "$set": {
                "trust_tier": tier,
                "verification_status": verification_status,
                "updated_at": utc_now_iso(),
            }
        },
    )
    tier_labels = {1: "Self Verified", 2: "Verified", 3: "KaamNow Pro", 4: "Elite Expert"}
    await audit(
        admin,
        "expert.trust_tier_set",
        profile_id,
        f"{sp.get('display_name', '')} → {tier_labels[tier]}",
    )
    return {"ok": True, "trust_tier": tier, "verification_status": verification_status}


@router.delete("/experts/{profile_id}")
async def delete_expert_profile(profile_id: str, admin: dict = Depends(get_admin_user)):
    """Delete service profile only (keeps user account)."""
    sp = await db.service_profiles.find_one(
        {"id": profile_id}, {"_id": 0, "user_id": 1, "display_name": 1}
    )
    if not sp:
        raise HTTPException(status_code=404, detail="Service profile not found")
    await db.service_profiles.delete_one({"id": profile_id})
    await db.users.update_one({"id": sp["user_id"]}, {"$set": {"has_service_profile": False}})
    await audit(admin, "expert.profile_deleted", profile_id, sp.get("display_name", ""))
    return {"ok": True}


@router.delete("/users/by-phone/{phone}")
async def delete_user_by_phone(phone: str, admin: dict = Depends(get_admin_user)):
    """Full wipe of a user account by phone number."""
    user = await db.users.find_one(
        {"phone_primary": {"$regex": phone, "$options": "i"}}, {"_id": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail=f"No user found with phone containing {phone}")
    user_id = user["id"]
    await db.service_profiles.delete_many({"user_id": user_id})
    await db.work_requests.delete_many(
        {"$or": [{"requested_by_user_id": user_id}, {"requested_to_user_id": user_id}]}
    )
    await db.jobs.delete_many({"posted_by_user_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})
    await db.wa_notif_log.delete_many({"user_id": user_id})
    await db.bot_sessions.delete_many({"session_id": {"$regex": phone.replace("+", "")}})
    await db.otps.delete_many({"phone": {"$regex": phone.replace("+", "")}})
    await db.users.delete_one({"id": user_id})
    await audit(admin, "user.full_delete", user_id, user.get("name", phone))
    return {"ok": True, "deleted_user": user.get("name"), "phone": phone}


# ---------------------------------------------------------------------------
# WhatsApp
# ---------------------------------------------------------------------------


@router.post("/whatsapp/send")
async def send_whatsapp(body: dict, admin: dict = Depends(get_admin_user)):
    phone = (body.get("phone") or "").strip()
    message = (body.get("message") or "").strip()
    if not phone or not message:
        raise HTTPException(status_code=400, detail="phone and message required")

    import threading

    result = {}

    def _do_send():
        result["ok"] = wa_send(phone, message)

    t = threading.Thread(target=_do_send)
    t.start()
    t.join(timeout=10)
    await audit(admin, "whatsapp.sent", phone, message[:80])
    return {"ok": result.get("ok", False)}


# ---------------------------------------------------------------------------
# Customers
# ---------------------------------------------------------------------------


@router.patch("/users/{user_id}/suspend")
async def suspend_user(user_id: str, body: dict, admin: dict = Depends(get_admin_user)):
    suspend = body.get("suspend", True)
    res = await db.users.update_one(
        {"id": user_id}, {"$set": {"status": "suspended" if suspend else "active"}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await audit(admin, "user.suspended" if suspend else "user.reactivated", user_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------


@router.get("/jobs")
async def list_jobs(
    status: Optional[str] = None,
    pincode: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    admin: dict = Depends(get_admin_user),
):
    query = {}
    if status:
        query["status"] = status
    if pincode:
        query["pincode"] = pincode
    if search:
        pattern = re.escape(search.strip())
        query["$or"] = [
            {"title": {"$regex": pattern, "$options": "i"}},
            {"posted_by_name": {"$regex": pattern, "$options": "i"}},
        ]

    jobs = (
        await db.jobs.find(query, {"_id": 0})
        .skip(skip)
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    total = await db.jobs.count_documents(query)

    job_ids = [j["id"] for j in jobs]
    req_counts = await db.work_requests.aggregate(
        [
            {"$match": {"job_id": {"$in": job_ids}}},
            {"$group": {"_id": "$job_id", "count": {"$sum": 1}}},
        ]
    ).to_list(len(job_ids))
    rmap = {r["_id"]: r["count"] for r in req_counts}
    for j in jobs:
        j["request_count"] = rmap.get(j.get("id"), 0)

    return {"items": jobs, "total": total, "skip": skip, "limit": limit}


@router.patch("/jobs/{job_id}/close")
async def force_close_job(job_id: str, admin: dict = Depends(get_admin_user)):
    res = await db.jobs.update_one({"id": job_id}, {"$set": {"status": "expired"}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    await audit(admin, "job.force_closed", job_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Engagements
# ---------------------------------------------------------------------------


@router.get("/work-requests")
async def list_work_requests(
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    admin: dict = Depends(get_admin_user),
):
    query: dict = {}
    if status:
        query["status"] = status
    if date_from:
        query["created_at"] = {"$gte": date_from}
    if search:
        pattern = re.escape(search.strip())
        query["$or"] = [
            {"requested_by_name": {"$regex": pattern, "$options": "i"}},
            {"requested_to_name": {"$regex": pattern, "$options": "i"}},
            {"job_title": {"$regex": pattern, "$options": "i"}},
        ]

    items = (
        await db.work_requests.find(query, {"_id": 0})
        .skip(skip)
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    total = await db.work_requests.count_documents(query)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.patch("/work-requests/{request_id}/flag")
async def flag_work_request(request_id: str, body: dict, admin: dict = Depends(get_admin_user)):
    note = (body.get("note") or "").strip()
    res = await db.work_requests.update_one(
        {"id": request_id},
        {"$set": {"flagged": True, "admin_note": note, "flagged_at": utc_now_iso()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Work request not found")
    await audit(admin, "work_request.flagged", request_id, note[:80])
    return {"ok": True}


@router.patch("/work-requests/{request_id}/unflag")
async def unflag_work_request(request_id: str, admin: dict = Depends(get_admin_user)):
    await db.work_requests.update_one(
        {"id": request_id}, {"$unset": {"flagged": "", "admin_note": "", "flagged_at": ""}}
    )
    await audit(admin, "work_request.unflagged", request_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Broadcast WhatsApp
# ---------------------------------------------------------------------------


@router.post("/whatsapp/broadcast")
async def broadcast_whatsapp(body: dict, admin: dict = Depends(get_admin_user)):
    """Send a message to all workers or all customers."""
    audience = body.get("audience")  # "workers" or "customers"
    message = (body.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="message required")
    if audience not in ("experts", "all"):
        raise HTTPException(status_code=400, detail="audience must be 'experts' or 'all'")

    if audience == "experts":
        sp_user_ids = [
            p["user_id"]
            for p in await db.service_profiles.find({}, {"user_id": 1, "_id": 0}).to_list(2000)
        ]
        users = await db.users.find({"id": {"$in": sp_user_ids}}, {"phone_primary": 1}).to_list(
            2000
        )
    else:
        users = await db.users.find({}, {"phone_primary": 1}).to_list(2000)

    import threading

    sent = 0

    def _send_all():
        nonlocal sent
        for u in users:
            phone = u.get("phone_primary", "")
            if phone and not phone.startswith("+717000"):
                if wa_send(phone, message):
                    sent += 1

    t = threading.Thread(target=_send_all)
    t.start()
    t.join(timeout=30)
    await audit(admin, "whatsapp.broadcast", audience, f"sent={sent} msg={message[:60]}")
    return {"ok": True, "sent": sent}


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------


@router.get("/audit-log")
async def get_audit_log(limit: int = 50, skip: int = 0, admin: dict = Depends(get_admin_user)):
    logs = (
        await db.admin_logs.find({}, {"_id": 0})
        .skip(skip)
        .limit(limit)
        .sort("ts", -1)
        .to_list(limit)
    )
    total = await db.admin_logs.count_documents({})
    return {"items": logs, "total": total}


# ---------------------------------------------------------------------------
# Reports, FAQ, legal, wallet, referrals
# ---------------------------------------------------------------------------


@router.get("/reports")
async def list_reports(
    status: str = "pending",
    limit: int = 50,
    skip: int = 0,
    admin: dict = Depends(get_admin_user),
):
    query = {} if status == "all" else {"status": status}
    items = (
        await db.reports.find(query, {"_id": 0})
        .skip(skip)
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    total = await db.reports.count_documents(query)
    return {"items": items, "total": total}


async def _close_report(report_id: str, status: str, body: dict, admin: dict) -> dict:
    now = utc_now_iso()
    res = await db.reports.update_one(
        {"id": report_id},
        {
            "$set": {
                "status": status,
                "admin_note": (body.get("admin_note") or "").strip(),
                "resolved_by": admin["id"],
                "resolved_at": now,
                "updated_at": now,
            }
        },
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    await audit(admin, f"report.{status}", report_id)
    return {"ok": True}


@router.post("/reports/{report_id}/resolve")
async def resolve_report(report_id: str, body: dict, admin: dict = Depends(get_admin_user)):
    return await _close_report(report_id, "resolved", body, admin)


@router.post("/reports/{report_id}/dismiss")
async def dismiss_report(report_id: str, body: dict, admin: dict = Depends(get_admin_user)):
    return await _close_report(report_id, "dismissed", body, admin)


@router.get("/faq")
async def admin_list_faq(admin: dict = Depends(get_admin_user)):
    items = await db.faqs.find({}, {"_id": 0}).sort([("category", 1), ("order", 1)]).to_list(500)
    return {"items": items}


@router.post("/faq")
async def admin_create_faq(body: dict, admin: dict = Depends(get_admin_user)):
    now = utc_now_iso()
    doc = {
        "id": str(uuid.uuid4()),
        "question_en": (body.get("question_en") or "").strip(),
        "question_hi": (body.get("question_hi") or "").strip(),
        "answer_en": (body.get("answer_en") or "").strip(),
        "answer_hi": (body.get("answer_hi") or "").strip(),
        "category": (body.get("category") or "general").strip(),
        "order": int(body.get("order") or 0),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    if not doc["question_en"] or not doc["answer_en"]:
        raise HTTPException(status_code=400, detail="question_en and answer_en required")
    await db.faqs.insert_one(doc)
    await audit(admin, "faq.created", doc["id"])
    doc.pop("_id", None)
    return doc


@router.patch("/faq/{faq_id}")
async def admin_update_faq(faq_id: str, body: dict, admin: dict = Depends(get_admin_user)):
    allowed = {
        "question_en",
        "question_hi",
        "answer_en",
        "answer_hi",
        "category",
        "order",
        "is_active",
    }
    update = {k: body[k] for k in allowed if k in body}
    if not update:
        raise HTTPException(status_code=400, detail="No valid fields")
    if "order" in update:
        update["order"] = int(update["order"])
    update["updated_at"] = utc_now_iso()
    res = await db.faqs.update_one({"id": faq_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="FAQ not found")
    await audit(admin, "faq.updated", faq_id)
    return {"ok": True}


@router.delete("/faq/{faq_id}")
async def admin_delete_faq(faq_id: str, admin: dict = Depends(get_admin_user)):
    res = await db.faqs.update_one(
        {"id": faq_id}, {"$set": {"is_active": False, "updated_at": utc_now_iso()}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="FAQ not found")
    await audit(admin, "faq.deactivated", faq_id)
    return {"ok": True}


@router.post("/faq/{faq_id}/reorder")
async def admin_reorder_faq(faq_id: str, body: dict, admin: dict = Depends(get_admin_user)):
    res = await db.faqs.update_one(
        {"id": faq_id},
        {"$set": {"order": int(body.get("order") or 0), "updated_at": utc_now_iso()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="FAQ not found")
    await audit(admin, "faq.reordered", faq_id)
    return {"ok": True}


@router.get("/legal")
async def admin_list_legal(admin: dict = Depends(get_admin_user)):
    items = await db.legal_docs.find({}, {"_id": 0}).sort("effective_date", -1).to_list(100)
    return {"items": items}


@router.post("/legal")
async def admin_publish_legal(body: dict, admin: dict = Depends(get_admin_user)):
    doc_type = body.get("doc_type")
    if doc_type not in {"terms", "privacy"}:
        raise HTTPException(status_code=400, detail="doc_type must be terms or privacy")
    now = utc_now_iso()
    await db.legal_docs.update_many({"doc_type": doc_type}, {"$set": {"is_current": False}})
    doc = {
        "id": str(uuid.uuid4()),
        "doc_type": doc_type,
        "version": (body.get("version") or "1.0").strip(),
        "content_en": body.get("content_en") or "",
        "content_hi": body.get("content_hi") or "",
        "effective_date": body.get("effective_date") or now,
        "is_current": True,
        "published_by": admin["id"],
        "created_at": now,
    }
    await db.legal_docs.insert_one(doc)
    await audit(admin, "legal.published", doc_type, doc["version"])
    doc.pop("_id", None)
    return doc


@router.get("/wallet")
async def admin_wallet_stats(admin: dict = Depends(get_admin_user)):
    users_balance = await db.users.aggregate(
        [{"$group": {"_id": None, "total": {"$sum": "$wallet_balance"}}}]
    ).to_list(1)
    credits = await db.wallet_transactions.count_documents({"type": "credit"})
    debits = await db.wallet_transactions.count_documents({"type": "debit"})
    return {
        "total_credits_outstanding": int(users_balance[0]["total"]) if users_balance else 0,
        "credit_transactions": credits,
        "debit_transactions": debits,
    }


@router.get("/referrals")
async def admin_referrals(admin: dict = Depends(get_admin_user), limit: int = 100):
    items = (
        await db.users.find(
            {"referred_by": {"$exists": True, "$ne": None}},
            {"_id": 0, "id": 1, "name": 1, "phone_primary": 1, "referred_by": 1, "created_at": 1},
        )
        .sort("created_at", -1)
        .limit(limit)
        .to_list(limit)
    )
    return {"items": items}


@router.post("/broadcast")
async def admin_broadcast(body: dict, admin: dict = Depends(get_admin_user)):
    title = (body.get("title") or "").strip()
    message = (body.get("body") or "").strip()
    if not title or not message:
        raise HTTPException(status_code=400, detail="title and body required")
    query = {}
    if body.get("pincode"):
        query["saved_addresses.pincode"] = body["pincode"]
    users = await db.users.find(query, {"_id": 0, "id": 1}).limit(2000).to_list(2000)
    now = utc_now_iso()
    for target in users:
        await db.notifications.insert_one(
            {
                "id": str(_uuid.uuid4()),
                "user_id": target["id"],
                "title": title,
                "body": message,
                "type": "admin_broadcast",
                "read": False,
                "created_at": now,
            }
        )
    await audit(admin, "broadcast.sent", "", f"count={len(users)}")
    return {"ok": True, "sent": len(users)}


@router.post("/experts/{profile_id}/verify-cert/{cert_id}")
async def verify_expert_cert(
    profile_id: str, cert_id: str, body: dict, admin: dict = Depends(get_admin_user)
):
    sp = await db.service_profiles.find_one({"id": profile_id}, {"_id": 0, "certifications": 1})
    if not sp:
        raise HTTPException(status_code=404, detail="Service profile not found")
    certs = sp.get("certifications") or []
    found = False
    for cert in certs:
        if cert.get("id") == cert_id:
            cert["verified"] = True
            cert["verified_at"] = utc_now_iso()
            cert["verified_by"] = admin["id"]
            cert["verification_note"] = body.get("note") or ""
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Certification not found")
    await db.service_profiles.update_one({"id": profile_id}, {"$set": {"certifications": certs}})
    await audit(admin, "expert.cert_verified", profile_id, cert_id)
    return {"ok": True}


@router.get("/waitlist")
async def admin_waitlist(admin: dict = Depends(get_admin_user), limit: int = 100):
    items = (
        await db.worker_waitlist.find({}, {"_id": 0})
        .sort("created_at", -1)
        .limit(limit)
        .to_list(limit)
    )
    return {"items": items}


# ---------------------------------------------------------------------------
# Platform info
# ---------------------------------------------------------------------------


@router.get("/platform-info")
async def get_platform_info(admin: dict = Depends(get_admin_user)):
    """Return current feature flags and DB collection counts."""
    return {
        "feature_flags": {
            "whatsapp_notifications": settings.feature_whatsapp_notifications,
            "otp_auth": settings.feature_otp_auth,
            "engagement_flow": settings.feature_engagement_flow,
            "sandbox_mode": settings.gupshup_sandbox_mode,
            "show_otp_in_response": settings.show_otp_in_response,
        },
        "collections": {
            "users": await db.users.count_documents({}),
            "service_profiles": await db.service_profiles.count_documents({}),
            "jobs": await db.jobs.count_documents({}),
            "work_requests": await db.work_requests.count_documents({}),
            "notifications": await db.notifications.count_documents({}),
            "admin_logs": await db.admin_logs.count_documents({}),
        },
        "dummy_accounts": await db.users.count_documents(
            {"phone_primary": {"$regex": r"^\+717000"}}
        ),
    }


# ---------------------------------------------------------------------------
# Dev utilities
# ---------------------------------------------------------------------------


@router.delete("/seed-data")
async def delete_seed_data(admin: dict = Depends(get_admin_user)):
    """Remove all dummy +717000* accounts (safe to call in dev/staging)."""
    pattern = r"^\+717000"
    dummy_users = await db.users.find({"phone_primary": {"$regex": pattern}}, {"id": 1}).to_list(
        500
    )
    dummy_ids = [u["id"] for u in dummy_users]

    del_users = await db.users.delete_many({"phone_primary": {"$regex": pattern}})
    del_profiles = await db.service_profiles.delete_many({"user_id": {"$in": dummy_ids}})
    del_jobs = await db.jobs.delete_many({"posted_by_user_id": {"$in": dummy_ids}})

    await audit(
        admin,
        "seed_data.deleted",
        "",
        f"users={del_users.deleted_count} profiles={del_profiles.deleted_count} jobs={del_jobs.deleted_count}",
    )
    return {
        "ok": True,
        "deleted": {
            "users": del_users.deleted_count,
            "profiles": del_profiles.deleted_count,
            "jobs": del_jobs.deleted_count,
        },
    }
