from fastapi import APIRouter, HTTPException

from ..db import db

router = APIRouter(prefix="/api/legal", tags=["legal"])

DEFAULT_DOCS = {
    "terms": {
        "version": "1.0",
        "content_en": "KaamNow connects customers and Local Experts. Use the service lawfully, pay agreed charges, and treat others with respect.",
        "content_hi": "KaamNow customers aur Local Experts ko jodta hai. Seva ka kanooni tareeke se upyog karein, tai ki gayi rashi ka bhugtan karein, aur sabka samman karein.",
        "effective_date": "2026-01-01",
    },
    "privacy": {
        "version": "1.0",
        "content_en": "KaamNow collects account, location, booking, and safety information to run the service and protect users.",
        "content_hi": "KaamNow seva chalane aur users ki suraksha ke liye account, location, booking, aur safety jaankari collect karta hai.",
        "effective_date": "2026-01-01",
    },
}


async def _current_doc(doc_type: str) -> dict:
    doc = (
        await db.legal_docs.find({"doc_type": doc_type, "is_current": True}, {"_id": 0})
        .sort("effective_date", -1)
        .limit(1)
        .to_list(1)
    )
    if doc:
        return doc[0]
    fallback = DEFAULT_DOCS.get(doc_type)
    if not fallback:
        raise HTTPException(status_code=404, detail="Document not found")
    return fallback


@router.get("/terms")
async def get_terms():
    return await _current_doc("terms")


@router.get("/privacy")
async def get_privacy():
    return await _current_doc("privacy")
