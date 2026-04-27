import uuid

from fastapi import APIRouter

from ..db import db
from ..schemas import WaitlistIn
from ..utils import utc_now_iso

router = APIRouter(prefix="/api", tags=["waitlist"])


@router.post("/waitlist")
async def join_waitlist(body: WaitlistIn):
    existing = await db.waitlist.find_one({"email": body.email.lower()})
    if existing:
        return {"ok": True}

    await db.waitlist.insert_one(
        {
            "id": str(uuid.uuid4()),
            "email": body.email.lower(),
            "name": body.name or "",
            "role": body.role or "customer",
            "created_at": utc_now_iso(),
        }
    )
    return {"ok": True}
