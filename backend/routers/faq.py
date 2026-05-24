from typing import Optional

from fastapi import APIRouter

from ..db import db

router = APIRouter(prefix="/api/faq", tags=["faq"])

DEFAULT_FAQS = [
    {
        "id": "faq_general_free",
        "category": "general",
        "order": 10,
        "question_en": "Is KaamNow free to use?",
        "answer_en": "Yes. Users can browse, post work, and create a service profile during the dev phase.",
        "question_hi": "क्या KaamNow इस्तेमाल करना फ्री है?",
        "answer_hi": "हाँ। Dev phase में users browse, work post, और service profile बना सकते हैं।",
    },
    {
        "id": "faq_expert_profile",
        "category": "local_expert",
        "order": 20,
        "question_en": "How do I start offering services?",
        "answer_en": "Create a Service Profile from Profile, add your skills, rate, and location, then users can find and request you.",
        "question_hi": "मैं service देना कैसे शुरू करूँ?",
        "answer_hi": "Profile से Service Profile बनाइए, skills, rate और location जोड़िए, फिर users आपको खोजकर request भेज सकते हैं।",
    },
    {
        "id": "faq_requests",
        "category": "general",
        "order": 30,
        "question_en": "Who can accept or reject a request?",
        "answer_en": "Only the receiver of a pending request can accept or reject it. The sender can cancel their own pending request.",
        "question_hi": "Request accept या reject कौन कर सकता है?",
        "answer_hi": "Pending request का receiver ही उसे accept या reject कर सकता है। Sender अपनी pending request cancel कर सकता है।",
    },
    {
        "id": "faq_payments",
        "category": "payments",
        "order": 40,
        "question_en": "How are payments handled?",
        "answer_en": "Payments are currently handled directly between users. In-app payments are disabled until Razorpay is approved.",
        "question_hi": "Payments कैसे होंगे?",
        "answer_hi": "अभी payments users के बीच direct होंगे। Razorpay approval तक in-app payments disabled हैं।",
    },
    {
        "id": "faq_safety",
        "category": "safety",
        "order": 50,
        "question_en": "How do ratings work?",
        "answer_en": "After completed work, both sides can rate each other. These ratings help build trust on service profiles.",
        "question_hi": "Ratings कैसे काम करती हैं?",
        "answer_hi": "काम complete होने के बाद दोनों users एक-दूसरे को rate कर सकते हैं। Ratings service profiles पर trust बनाने में मदद करती हैं।",
    },
]


@router.get("")
async def list_faqs(category: Optional[str] = None, lang: str = "en"):
    query: dict = {"is_active": True}
    if category:
        query["category"] = category

    docs = await db.faqs.find(query, {"_id": 0}).sort([("category", 1), ("order", 1)]).to_list(200)
    if not docs:
        docs = [item for item in DEFAULT_FAQS if not category or item["category"] == category]
    lang = lang if lang in {"en", "hi"} else "en"
    items = []
    for doc in docs:
        item = dict(doc)
        item["question"] = item.get(f"question_{lang}") or item.get("question_en") or ""
        item["answer"] = item.get(f"answer_{lang}") or item.get("answer_en") or ""
        items.append(item)
    return {"items": items}
