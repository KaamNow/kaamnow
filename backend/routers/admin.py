from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional

from ..auth import get_current_user
from ..db import db

router = APIRouter(prefix="/api/admin", tags=["admin"])

def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

@router.get("/stats")
async def get_stats(admin: dict = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    total_workers = await db.workers.count_documents({})
    total_customers = await db.users.count_documents({"role": "customer"})
    total_jobs = await db.jobs.count_documents({})
    active_jobs = await db.jobs.count_documents({"status": "open"})
    total_bookings = await db.bookings.count_documents({})
    completed_bookings = await db.bookings.count_documents({"status": "completed"})

    return {
        "users": total_users,
        "workers": total_workers,
        "customers": total_customers,
        "jobs": {"total": total_jobs, "active": active_jobs},
        "bookings": {"total": total_bookings, "completed": completed_bookings},
    }

@router.get("/users")
async def list_users(
    role: Optional[str] = None, 
    limit: int = 50, 
    skip: int = 0,
    admin: dict = Depends(get_admin_user)
):
    query = {}
    if role:
        query["role"] = role

    users = await db.users.find(query, {"password_hash": 0, "_id": 0}).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    total = await db.users.count_documents(query)
    
    return {
        "items": users,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.patch("/users/{user_id}/status")
async def update_user_status(user_id: str, body: dict, admin: dict = Depends(get_admin_user)):
    # e.g. {"status": "suspended"} or {"status": "active"} or {"trust_tier": 2}
    update_data = {}
    
    if "status" in body:
        update_data["status"] = body["status"]
    
    if not update_data and "trust_tier" not in body:
        raise HTTPException(status_code=400, detail="Invalid status update payload")

    if update_data:
        res = await db.users.update_one({"id": user_id}, {"$set": update_data})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
            
    # If they passed trust_tier, update the worker document
    if "trust_tier" in body:
        await db.workers.update_one(
            {"user_id": user_id}, 
            {"$set": {"trust_tier": int(body["trust_tier"])}}
        )

    return {"ok": True}
