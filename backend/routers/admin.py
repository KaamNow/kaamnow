import re
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header

from ..auth import get_current_user
from ..db import db
from ..config import settings
from ..utils import utc_now_iso
from ..whatsapp_notify import _send as wa_send

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])


def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


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
    await db.users.insert_one({
        "id": admin_id,
        "phone_primary": phone,
        "name": name,
        "role": "admin",
        "phone_verified": True,
        "avatar_color": "#ff6b35",
        "migration_status": "phone_primary",
        "created_at": utc_now_iso(),
    })
    return {"ok": True, "message": "Admin created", "id": admin_id}


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@router.get("/stats")
async def get_stats(admin: dict = Depends(get_admin_user)):
    total_workers = await db.workers.count_documents({})
    total_customers = await db.users.count_documents({"role": "customer"})
    total_jobs = await db.jobs.count_documents({})
    active_jobs = await db.jobs.count_documents({"status": "open"})

    total_engagements = await db.engagements.count_documents({})
    active_engagements = await db.engagements.count_documents({"status": {"$in": ["requested", "accepted"]}})
    completed_engagements = await db.engagements.count_documents({"status": "completed"})

    # Tier breakdown
    tier_pipeline = [
        {"$group": {"_id": "$trust_tier", "count": {"$sum": 1}}}
    ]
    tier_docs = await db.workers.aggregate(tier_pipeline).to_list(10)
    tier_breakdown = {str(t["_id"] or 1): t["count"] for t in tier_docs}

    # GMV — sum of daily_rate on completed engagements
    gmv_pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$daily_rate"}}}
    ]
    gmv_docs = await db.engagements.aggregate(gmv_pipeline).to_list(1)
    gmv = gmv_docs[0]["total"] if gmv_docs else 0

    # Restricted workers
    restricted = await db.workers.count_documents({"availability_status": "restricted"})

    return {
        "workers": total_workers,
        "customers": total_customers,
        "jobs": {"total": total_jobs, "active": active_jobs},
        "engagements": {
            "total": total_engagements,
            "active": active_engagements,
            "completed": completed_engagements,
        },
        "tier_breakdown": tier_breakdown,
        "gmv": gmv,
        "restricted_workers": restricted,
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
    admin: dict = Depends(get_admin_user)
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

    users = await db.users.find(query, {"password_hash": 0, "_id": 0}) \
        .skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    total = await db.users.count_documents(query)

    return {"items": users, "total": total, "skip": skip, "limit": limit}


@router.patch("/users/{user_id}/status")
async def update_user_status(user_id: str, body: dict, admin: dict = Depends(get_admin_user)):
    update_data = {}
    if "status" in body:
        update_data["status"] = body["status"]
    if not update_data and "trust_tier" not in body:
        raise HTTPException(status_code=400, detail="Invalid payload")

    if update_data:
        res = await db.users.update_one({"id": user_id}, {"$set": update_data})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")

    if "trust_tier" in body:
        await db.workers.update_one(
            {"user_id": user_id},
            {"$set": {"trust_tier": int(body["trust_tier"])}}
        )

    return {"ok": True}


# ---------------------------------------------------------------------------
# Workers
# ---------------------------------------------------------------------------

@router.get("/workers")
async def list_workers(
    search: Optional[str] = None,
    tier: Optional[int] = None,
    availability: Optional[str] = None,
    state: Optional[str] = None,
    skill: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    admin: dict = Depends(get_admin_user)
):
    query = {}
    if tier is not None:
        query["trust_tier"] = tier
    if availability:
        query["availability_status"] = availability
    if state:
        query["state"] = {"$regex": re.escape(state), "$options": "i"}
    if skill:
        query["skills"] = {"$regex": re.escape(skill), "$options": "i"}
    if search:
        pattern = re.escape(search.strip())
        query["$or"] = [
            {"name": {"$regex": pattern, "$options": "i"}},
        ]

    workers = await db.workers.find(query, {"_id": 0}) \
        .skip(skip).limit(limit).sort("created_at", -1).to_list(limit)

    # Attach phone from users collection
    user_ids = [w["user_id"] for w in workers if w.get("user_id")]
    user_docs = await db.users.find(
        {"id": {"$in": user_ids}},
        {"id": 1, "phone_primary": 1, "status": 1, "_id": 0}
    ).to_list(len(user_ids))
    user_map = {u["id"]: u for u in user_docs}

    for w in workers:
        u = user_map.get(w.get("user_id"), {})
        w["phone"] = u.get("phone_primary", "")
        w["account_status"] = u.get("status", "active")

    total = await db.workers.count_documents(query)
    return {"items": workers, "total": total, "skip": skip, "limit": limit}


@router.patch("/workers/{worker_id}/tier")
async def set_worker_tier(worker_id: str, body: dict, admin: dict = Depends(get_admin_user)):
    tier = body.get("tier")
    if tier not in (1, 2, 3, 4):
        raise HTTPException(status_code=400, detail="tier must be 1, 2, 3, or 4")
    res = await db.workers.update_one({"id": worker_id}, {"$set": {"trust_tier": tier}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Worker not found")
    return {"ok": True}


@router.patch("/workers/{worker_id}/lift-restriction")
async def lift_worker_restriction(worker_id: str, admin: dict = Depends(get_admin_user)):
    res = await db.workers.update_one(
        {"id": worker_id},
        {"$set": {"availability_status": "available"}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Worker not found")
    return {"ok": True}


@router.patch("/workers/{worker_id}/suspend")
async def suspend_worker(worker_id: str, body: dict, admin: dict = Depends(get_admin_user)):
    """suspend=true to suspend, suspend=false to reactivate"""
    suspend = body.get("suspend", True)
    new_status = "suspended" if suspend else "available"

    worker = await db.workers.find_one({"id": worker_id}, {"user_id": 1})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    await db.workers.update_one({"id": worker_id}, {"$set": {"availability_status": new_status}})
    await db.users.update_one(
        {"id": worker["user_id"]},
        {"$set": {"status": "suspended" if suspend else "active"}}
    )
    return {"ok": True}


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
    return {"ok": result.get("ok", False)}


# ---------------------------------------------------------------------------
# Customers
# ---------------------------------------------------------------------------

@router.get("/customers")
async def list_customers(
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    admin: dict = Depends(get_admin_user)
):
    query: dict = {"role": "customer"}
    if status:
        query["status"] = status
    if search:
        pattern = re.escape(search.strip())
        query["$or"] = [
            {"name": {"$regex": pattern, "$options": "i"}},
            {"phone_primary": {"$regex": pattern, "$options": "i"}},
        ]

    customers = await db.users.find(query, {"password_hash": 0, "_id": 0}) \
        .skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    total = await db.users.count_documents(query)

    # Attach job counts
    cids = [c["id"] for c in customers]
    job_counts = await db.jobs.aggregate([
        {"$match": {"customer_id": {"$in": cids}}},
        {"$group": {"_id": "$customer_id", "count": {"$sum": 1}}}
    ]).to_list(len(cids))
    jmap = {j["_id"]: j["count"] for j in job_counts}
    for c in customers:
        c["jobs_posted"] = jmap.get(c["id"], 0)

    return {"items": customers, "total": total, "skip": skip, "limit": limit}


@router.patch("/customers/{user_id}/suspend")
async def suspend_customer(user_id: str, body: dict, admin: dict = Depends(get_admin_user)):
    suspend = body.get("suspend", True)
    res = await db.users.update_one(
        {"id": user_id},
        {"$set": {"status": "suspended" if suspend else "active"}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
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
    admin: dict = Depends(get_admin_user)
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
            {"customer_name": {"$regex": pattern, "$options": "i"}},
        ]

    jobs = await db.jobs.find(query, {"_id": 0}) \
        .skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    total = await db.jobs.count_documents(query)

    # Attach engagement count per job
    job_ids = [j["id"] for j in jobs]
    eng_counts = await db.engagements.aggregate([
        {"$match": {"job_id": {"$in": job_ids}}},
        {"$group": {"_id": "$job_id", "count": {"$sum": 1}}}
    ]).to_list(len(job_ids))
    emap = {e["_id"]: e["count"] for e in eng_counts}
    for j in jobs:
        j["engagement_count"] = emap.get(j.get("id"), 0)

    return {"items": jobs, "total": total, "skip": skip, "limit": limit}


@router.patch("/jobs/{job_id}/close")
async def force_close_job(job_id: str, admin: dict = Depends(get_admin_user)):
    res = await db.jobs.update_one({"id": job_id}, {"$set": {"status": "expired"}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Engagements
# ---------------------------------------------------------------------------

@router.get("/engagements")
async def list_engagements(
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    admin: dict = Depends(get_admin_user)
):
    query = {}
    if status:
        query["status"] = status
    if date_from:
        query["created_at"] = {"$gte": date_from}
    if search:
        pattern = re.escape(search.strip())
        query["$or"] = [
            {"worker_name": {"$regex": pattern, "$options": "i"}},
            {"customer_name": {"$regex": pattern, "$options": "i"}},
            {"job_title": {"$regex": pattern, "$options": "i"}},
        ]

    engagements = await db.engagements.find(query, {"_id": 0}) \
        .skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    total = await db.engagements.count_documents(query)

    return {"items": engagements, "total": total, "skip": skip, "limit": limit}


@router.patch("/engagements/{engagement_id}/flag")
async def flag_engagement(engagement_id: str, body: dict, admin: dict = Depends(get_admin_user)):
    note = (body.get("note") or "").strip()
    res = await db.engagements.update_one(
        {"id": engagement_id},
        {"$set": {"flagged": True, "admin_note": note, "flagged_at": utc_now_iso()}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Engagement not found")
    return {"ok": True}


@router.patch("/engagements/{engagement_id}/unflag")
async def unflag_engagement(engagement_id: str, admin: dict = Depends(get_admin_user)):
    await db.engagements.update_one(
        {"id": engagement_id},
        {"$unset": {"flagged": "", "admin_note": "", "flagged_at": ""}}
    )
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
    if audience not in ("workers", "customers"):
        raise HTTPException(status_code=400, detail="audience must be 'workers' or 'customers'")

    if audience == "workers":
        users = await db.users.find({"role": "worker"}, {"phone_primary": 1}).to_list(2000)
    else:
        users = await db.users.find({"role": "customer"}, {"phone_primary": 1}).to_list(2000)

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
    return {"ok": True, "sent": sent}


# ---------------------------------------------------------------------------
# Dev utilities
# ---------------------------------------------------------------------------

@router.delete("/seed-data")
async def delete_seed_data(admin: dict = Depends(get_admin_user)):
    """Remove all dummy +717000* accounts (safe to call in dev/staging)."""
    pattern = r"^\+717000"
    dummy_users = await db.users.find(
        {"phone_primary": {"$regex": pattern}}, {"id": 1}
    ).to_list(500)
    dummy_ids = [u["id"] for u in dummy_users]

    del_users = await db.users.delete_many({"phone_primary": {"$regex": pattern}})
    del_workers = await db.workers.delete_many({"user_id": {"$in": dummy_ids}})
    del_jobs = await db.jobs.delete_many({"customer_id": {"$in": dummy_ids}})

    return {
        "ok": True,
        "deleted": {
            "users": del_users.deleted_count,
            "workers": del_workers.deleted_count,
            "jobs": del_jobs.deleted_count,
        }
    }
