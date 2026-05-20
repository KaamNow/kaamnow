from typing import Optional

from fastapi import APIRouter

from ..db import db

router = APIRouter(prefix="/api/faq", tags=["faq"])


@router.get("")
async def list_faqs(category: Optional[str] = None, lang: str = "en"):
    query: dict = {"is_active": True}
    if category:
        query["category"] = category

    docs = await db.faqs.find(query, {"_id": 0}).sort([("category", 1), ("order", 1)]).to_list(200)
    lang = lang if lang in {"en", "hi"} else "en"
    items = []
    for doc in docs:
        item = dict(doc)
        item["question"] = item.get(f"question_{lang}") or item.get("question_en") or ""
        item["answer"] = item.get(f"answer_{lang}") or item.get("answer_en") or ""
        items.append(item)
    return {"items": items}
