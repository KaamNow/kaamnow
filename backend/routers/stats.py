from fastapi import APIRouter

from ..db import db

router = APIRouter(prefix="/api", tags=["stats"])


@router.get("/stats")
async def stats():
    workers_count = await db.workers.count_documents({})
    jobs_count = await db.jobs.count_documents({})
    bookings_count = await db.bookings.count_documents({"status": "completed"})
    villages = await db.workers.distinct("village")
    return {
        "workers": workers_count,
        "jobs": jobs_count,
        "completed_bookings": bookings_count,
        "villages": len(villages),
    }
