from fastapi import APIRouter

from ..db import db

router = APIRouter(prefix="/api", tags=["stats"])


@router.get("/stats")
async def stats():
    experts_count = await db.service_profiles.count_documents({"is_active": True})
    jobs_count = await db.jobs.count_documents({})
    completed_count = await db.work_requests.count_documents({"status": "completed"})
    villages = await db.service_profiles.distinct("location_text")
    return {
        "workers": experts_count,
        "jobs": jobs_count,
        "completed_bookings": completed_count,
        "villages": len(villages),
    }
