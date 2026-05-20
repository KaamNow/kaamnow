import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..db import db
from ..schemas import ReportIn
from ..security import report_write_limit
from ..utils import utc_now_iso

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("")
async def create_report(
    body: ReportIn,
    user: dict = Depends(get_current_user),
    _: None = Depends(report_write_limit),
):
    if body.reported_user_id == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot report yourself")

    reported = await db.users.find_one({"id": body.reported_user_id}, {"_id": 0, "id": 1})
    if not reported:
        raise HTTPException(status_code=404, detail="Reported user not found")

    now = utc_now_iso()
    doc = {
        "id": str(uuid.uuid4()),
        "reporter_id": user["id"],
        "reported_user_id": body.reported_user_id,
        "reason": body.reason,
        "details": body.details,
        "engagement_id": body.engagement_id,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }
    await db.reports.insert_one(doc)

    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent_count = await db.reports.count_documents(
        {"reported_user_id": body.reported_user_id, "created_at": {"$gte": cutoff}}
    )
    if recent_count >= 3:
        await db.users.update_one(
            {"id": body.reported_user_id},
            {"$set": {"flagged": True, "flagged_at": now, "flag_reason": "multiple_reports"}},
        )

    return {"id": doc["id"], "status": doc["status"]}


@router.get("/mine")
async def list_my_reports(user: dict = Depends(get_current_user)):
    items = (
        await db.reports.find({"reporter_id": user["id"]}, {"_id": 0})
        .sort("created_at", -1)
        .limit(50)
        .to_list(50)
    )
    return {"items": items}
