"""
KaamNow WhatsApp Bot — Production Worker Tool
Uses Gupshup for inbound/outbound WhatsApp.

Worker commands (case-insensitive):
  JOBS [category]      – Browse open jobs near your pincode
  1-5                  – View job details (when list is shown)
  APPLY                – Express interest in last viewed job
  MORE                 – Next 5 jobs
  WITHDRAW             – Cancel latest pending interest
  STATUS               – Show my pending/active bookings
  PINCODE <6digits>    – Update preferred search pincode
  HELP                 – List all commands
  MENU / RESET         – Back to main menu

Customer commands:
  1 / 2 (role select)  – Customer booking flow (category → count → date → village → select worker)
  ACCEPT / REJECT      – Accept or reject a worker booking (legacy)
"""

import json
import logging
import math
import re
import threading
import uuid
from datetime import date, timedelta
from typing import Any, Optional, TypedDict

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response

from ..auth import get_optional_user
from ..config import settings
from ..db import db
from ..engagements import _notify, cancel_engagement, create_engagement_request
from ..schemas import WhatsAppMessageIn
from ..utils import utc_now_iso
from ..whatsapp_notify import (notify_customer_booking_accepted,
                               notify_customer_booking_rejected,
                               notify_worker_new_booking)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

_HELP_WORKER = (
    "📋 *KaamNow Worker Commands*\n\n"
    "JOBS – Apne area ke kaam dekhein\n"
    "JOBS 841219 – Kisi bhi pincode ke kaam (temporary)\n"
    "JOBS farm – Category se filter karein\n"
    "1-5 – Job details dekhein\n"
    "APPLY – Interest dikhayein\n"
    "MORE – Aur jobs\n"
    "WITHDRAW – Interest wapas lein\n"
    "STATUS – Meri requests\n"
    "PINCODE 841219 – Apna default pincode save karein\n"
    "HELP – Yeh list\n\n"
    "🌐 kaamnow.com/worker/dashboard"
)

_HELP_CUSTOMER = (
    "📋 *KaamNow Customer Commands*\n\n"
    "MENU – Worker dhundhein\n"
    "HELP – Yeh list\n\n"
    "🌐 kaamnow.com/dashboard"
)

_BUTTONS_UNREGISTERED = [
    {"id": "CUSTOMER", "title": "Mujhe worker chahiye"},
    {"id": "WORKER", "title": "Mujhe kaam chahiye"},
    {"id": "HELP", "title": "Help"},
]
_BUTTONS_CUSTOMER_RESULTS = [
    {"id": "CHANGE_PINCODE", "title": "Change Pincode"},
    {"id": "MORE", "title": "More Workers"},
    {"id": "HELP", "title": "Help"},
]
_BUTTONS_WORKER_RESULTS = [
    {"id": "CHANGE_PINCODE", "title": "Change Pincode"},
    {"id": "MORE", "title": "More Jobs"},
    {"id": "STATUS", "title": "My Applications"},
]
_BUTTONS_WORKER_NO_RESULTS = [
    {"id": "CHANGE_PINCODE", "title": "Change Pincode"},
    {"id": "STATUS", "title": "My Applications"},
    {"id": "HELP", "title": "Help"},
]
_BUTTONS_MISSING_PINCODE = [
    {"id": "CHANGE_PINCODE", "title": "Set Pincode"},
    {"id": "HELP", "title": "Help"},
]
_BUTTONS_CUSTOMER_MENU = [
    {"id": "WORKERS", "title": "Find Workers"},
    {"id": "STATUS", "title": "My Requests"},
    {"id": "HELP", "title": "Help"},
]
_BUTTONS_BOOKING_DONE = [
    {"id": "STATUS", "title": "My Requests"},
    {"id": "MORE", "title": "More Workers"},
    {"id": "MENU", "title": "Menu"},
]
_BUTTONS_NO_OPEN_JOB = [
    {"id": "POST_JOB_START", "title": "Post Job"},
    {"id": "MORE", "title": "More Workers"},
    {"id": "HELP", "title": "Help"},
]
_BUTTONS_POST_JOB_CONFIRM = [
    {"id": "CREATE_JOB_CONFIRM", "title": "Create Job"},
    {"id": "MENU", "title": "Cancel"},
]
_BUTTONS_WORKER_MENU = [
    {"id": "JOBS", "title": "Find Jobs"},
    {"id": "STATUS", "title": "My Applications"},
    {"id": "HELP", "title": "Help"},
]
_BUTTONS_WORKER_JOB_DETAIL = [
    {"id": "APPLY_JOB", "title": "Apply"},
    {"id": "MORE", "title": "More Jobs"},
    {"id": "STATUS", "title": "My Applications"},
]
_BUTTONS_WORKER_APPLY_DONE = [
    {"id": "STATUS", "title": "My Applications"},
    {"id": "MORE", "title": "More Jobs"},
    {"id": "MENU", "title": "Menu"},
]
_BUTTONS_WORKER_JOB_UNAVAILABLE = [
    {"id": "MORE", "title": "More Jobs"},
    {"id": "STATUS", "title": "My Applications"},
    {"id": "CHANGE_PINCODE", "title": "Change Pincode"},
]
_BUTTONS_WORKER_STATUS_EMPTY = [
    {"id": "JOBS", "title": "Find Jobs"},
    {"id": "CHANGE_PINCODE", "title": "Change Pincode"},
    {"id": "HELP", "title": "Help"},
]
_BUTTONS_WORKER_WITHDRAW_CONFIRM = [
    {"id": "WITHDRAW_CONFIRM", "title": "Yes Withdraw"},
    {"id": "STATUS", "title": "My Applications"},
    {"id": "MENU", "title": "Menu"},
]


def _with_reply_buttons(state: dict, buttons: list[dict]) -> dict:
    return {**state, "_reply_buttons": buttons[:3]}


def _with_reply_list(state: dict, reply_list: dict) -> dict:
    return {**state, "_reply_list": reply_list}


def _pop_reply_buttons(state: dict) -> tuple[dict, Optional[list[dict]]]:
    clean_state = dict(state or {})
    buttons = clean_state.pop("_reply_buttons", None)
    return clean_state, buttons


def _pop_reply_list(state: dict) -> tuple[dict, Optional[dict]]:
    clean_state = dict(state or {})
    reply_list = clean_state.pop("_reply_list", None)
    return clean_state, reply_list


_GREETING_ALIASES = {"hi", "hii", "hiii", "hello", "hey", "namaste", "menu", "reset", "start"}
_TYPED_BUTTON_ALIASES = {
    "find jobs": "JOBS",
    "more jobs": "MORE",
    "my applications": "STATUS",
    "change pincode": "CHANGE_PINCODE",
    "find workers": "WORKERS",
    "more workers": "MORE",
    "my requests": "STATUS",
    "mujhe worker chahiye": "CUSTOMER",
    "mujhe kaam chahiye": "WORKER",
    "send request": "REQUEST_WORKER",
    "request worker": "REQUEST_WORKER",
    "book worker": "REQUEST_WORKER",
    "post job": "POST_JOB_START",
    "open app": "OPEN_APP",
    "apply": "APPLY_JOB",
    "apply job": "APPLY_JOB",
    "withdraw application": "WITHDRAW",
    "cancel application": "WITHDRAW",
    "yes withdraw": "WITHDRAW_CONFIRM",
}


def _safe_wa_title(value: str, limit: int = 24) -> str:
    cleaned = re.sub(r"\s+", " ", str(value or "")).strip()
    return cleaned[:limit] if len(cleaned) > limit else cleaned


def _safe_wa_description(value: str, limit: int = 72) -> str:
    cleaned = re.sub(r"\s+", " ", str(value or "")).strip()
    return cleaned[:limit] if len(cleaned) > limit else cleaned


def _normalize_inbound_text(text: str) -> str:
    lowered = str(text or "").strip().lower()
    without_punctuation = re.sub(r"[^\w\s]", " ", lowered)
    return re.sub(r"\s+", " ", without_punctuation).strip()


# ─── Phone helpers ────────────────────────────────────────────────────────────


class NormalizedPhone(TypedDict):
    e164: str
    india10: str
    india91: str
    variants: list[str]


def normalize_whatsapp_phone(phone: str) -> NormalizedPhone:
    """
    Canonical India WhatsApp phone forms for exact DB lookups and Gupshup sends.
    Handles +91, 91, local 10-digit, spaces/dashes, and leading zeroes.
    """
    raw_digits = "".join(c for c in str(phone or "") if c.isdigit())
    digits = raw_digits.lstrip("0")
    if len(digits) >= 12 and digits.startswith("91"):
        india10 = digits[-10:]
    elif len(digits) >= 10:
        india10 = digits[-10:]
    else:
        india10 = digits
    india91 = f"91{india10}" if len(india10) == 10 else digits
    e164 = f"+{india91}" if india91 else ""
    variants = []
    for value in (e164, india91, india10, f"+{raw_digits}" if raw_digits else "", raw_digits):
        if value and value not in variants:
            variants.append(value)
    return {"e164": e164, "india10": india10, "india91": india91, "variants": variants}


def _normalize_phone(phone: str) -> str:
    return normalize_whatsapp_phone(phone)["india10"]


def _full_phone(phone: str) -> str:
    """Return 12-digit phone with 91 prefix."""
    return normalize_whatsapp_phone(phone)["india91"]


async def _lookup_user_by_phone(phone: str) -> Optional[dict]:
    normalized = normalize_whatsapp_phone(phone)
    if len(normalized["india10"]) != 10:
        logger.info(
            "WhatsApp phone lookup masked=%s variants=%s found=false reason=invalid_phone",
            _mask_phone(phone),
            _masked_variants(normalized),
        )
        return None
    phone_fields = ["phone_primary", "phone", "phone_number", "mobile"]
    query = {"$or": [{field: {"$in": normalized["variants"]}} for field in phone_fields]}
    user = await db.users.find_one(query, {"_id": 0})
    logger.info(
        "WhatsApp phone lookup masked=%s variants=%s found=%s",
        _mask_phone(phone),
        _masked_variants(normalized),
        bool(user),
    )
    return user


def _mask_phone(phone: str) -> str:
    digits = "".join(c for c in str(phone or "") if c.isdigit())
    if len(digits) <= 4:
        return "****"
    return f"***{digits[-4:]}"


def _masked_variants(normalized: NormalizedPhone) -> dict:
    return {
        "e164": f"+***{normalized['india10'][-4:]}" if normalized.get("india10") else "",
        "india10": f"******{normalized['india10'][-4:]}" if normalized.get("india10") else "",
        "india91": f"91******{normalized['india10'][-4:]}" if normalized.get("india10") else "",
    }


def _create_session_id(source: str) -> str:
    return f"whatsapp-{_full_phone(source)}"


def _generate_avatar_color(name: str) -> str:
    colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"]
    return colors[sum(ord(c) for c in name) % len(colors)]


def _fetch_pincode_sync(pincode: str) -> Optional[dict]:
    """Synchronous pincode fetch — tries HTTPS then HTTP with browser User-Agent."""
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
    }
    urls = [
        f"https://api.postalpincode.in/pincode/{pincode}",
        f"http://api.postalpincode.in/pincode/{pincode}",
    ]
    for url in urls:
        try:
            resp = requests.get(url, headers=headers, timeout=10, verify=False)
            data = resp.json()
            entry = data[0] if data else None
            if not entry or entry.get("Status") != "Success" or not entry.get("PostOffice"):
                logger.warning(
                    "Pincode %s not found via %s: %s",
                    pincode,
                    url,
                    entry.get("Status") if entry else "no data",
                )
                return None
            pos = entry["PostOffice"]
            head = next((p for p in pos if p.get("BranchType") == "Head Post Office"), pos[0])
            logger.info("Pincode %s → %s, %s", pincode, head["District"], head["State"])
            return {
                "district": head["District"],
                "state": head["State"],
                "block": head["Block"] if head.get("Block") and head["Block"] != "NA" else "",
                "post": head["Name"],
            }
        except Exception as exc:
            logger.warning("Pincode lookup via %s failed: %s", url, exc)
    logger.error("All pincode lookup attempts failed for %s", pincode)
    return None


async def _lookup_pincode(pincode: str) -> Optional[dict]:
    """Async wrapper — runs sync fetch in thread executor."""
    import asyncio

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _fetch_pincode_sync, pincode)


async def _save_bot_state(session_id: str, new_state: dict) -> None:
    await db.bot_sessions.update_one(
        {"session_id": session_id},
        {"$set": {"session_id": session_id, "state": new_state, "updated_at": utc_now_iso()}},
        upsert=True,
    )


# ─── Job helpers ──────────────────────────────────────────────────────────────


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.asin(math.sqrt(a))


async def _fetch_jobs_for_worker(
    worker: dict,
    category: Optional[str] = None,
    offset: int = 0,
    pincode_filter: Optional[str] = None,
) -> tuple[list[dict], bool]:
    """
    Return open jobs sorted by haversine distance from worker, max 200.
    pincode_filter: temporary area search — filters by address.pincode, does NOT
                   modify the worker's saved profile.
    """
    query: dict = {"status": "open", "$expr": {"$lt": ["$filled_count", "$workers_needed"]}}
    if category:
        query["category"] = category
    if pincode_filter:
        query["address.pincode"] = pincode_filter

    jobs = await db.jobs.find(query, {"_id": 0}).limit(200).to_list(200)

    # Filter expired
    today_str = date.today().isoformat()
    jobs = [j for j in jobs if not j.get("job_date") or j["job_date"] >= today_str]

    worker_lat = float(worker.get("lat") or 0) or None
    worker_lng = float(worker.get("lng") or 0) or None

    def _dist(job: dict) -> float:
        if not worker_lat or not worker_lng:
            return 9999.0
        try:
            return _haversine_km(
                worker_lat, worker_lng, float(job.get("lat") or 0), float(job.get("lng") or 0)
            )
        except Exception:
            return 9999.0

    # Skills rank
    worker_skills = {s.strip().lower() for s in (worker.get("skills") or [])}

    def _rank(job: dict) -> tuple:
        dist = _dist(job)
        j_skills = {
            (s.get("skill") or "").strip().lower() for s in (job.get("required_skills") or [])
        } | {(job.get("category") or "").strip().lower()}
        skill_match = -len(worker_skills & j_skills)
        return (skill_match, dist)

    jobs.sort(key=_rank)
    return jobs[offset : offset + 5], len(jobs) > offset + 5  # (page_jobs, has_more)


def _format_job_list(
    jobs: list[dict], worker_lat: Optional[float], worker_lng: Optional[float], offset: int = 0
) -> str:
    if not jobs:
        return "Koi kaam nahi mila. Baad mein dobara try karein. 🙏"
    lines = ["💼 *Kaam available hai:*\n"]
    for i, j in enumerate(jobs, 1):
        dist_str = ""
        if worker_lat and worker_lng:
            try:
                km = _haversine_km(
                    worker_lat, worker_lng, float(j.get("lat") or 0), float(j.get("lng") or 0)
                )
                dist_str = f" | {km:.0f}km"
            except Exception:
                pass
        time_ago = ""
        if j.get("created_at"):
            try:
                from datetime import datetime, timezone

                created = datetime.fromisoformat(j["created_at"].replace("Z", "+00:00"))
                hours = int((datetime.now(timezone.utc) - created).total_seconds() / 3600)
                time_ago = f" | {hours}h ago" if hours < 48 else ""
            except Exception:
                pass
        lines.append(
            f"*{i}.* {j['title']}\n"
            f"   📍 {j.get('village', '')} | ₹{j.get('daily_rate', '?')}/day{dist_str}{time_ago}"
        )
    lines.append("\nNumber type karein details dekhne ke liye (e.g. *1*)")
    return "\n".join(lines)


def _format_job_detail(job: dict, worker_lat: Optional[float], worker_lng: Optional[float]) -> str:
    dist_str = ""
    if worker_lat and worker_lng:
        try:
            km = _haversine_km(
                worker_lat, worker_lng, float(job.get("lat") or 0), float(job.get("lng") or 0)
            )
            dist_str = f"\n📐 Distance: {km:.1f} km"
        except Exception:
            pass
    addr = job.get("address") or {}
    location = ", ".join(
        filter(
            None, [job.get("village"), addr.get("district"), addr.get("state"), addr.get("pincode")]
        )
    )
    return (
        f"📋 *{job['title']}*\n\n"
        f"📁 Category: {job.get('category', '').title()}\n"
        f"💰 Rate: ₹{job.get('daily_rate', '?')}/day\n"
        f"📅 Date: {job.get('job_date', 'TBD')}\n"
        f"👥 Workers needed: {job.get('workers_needed', 1)}\n"
        f"📍 Location: {location}{dist_str}\n"
        f"👤 Customer: {job.get('customer_name', 'Customer')}\n"
        f"Status: {job.get('status', 'open')}\n"
        f"📝 {job.get('description', '')}\n\n"
        f"Interested? Reply *APPLY*"
    )


def get_default_pincode(
    user: Optional[dict], worker_profile: Optional[dict] = None
) -> Optional[str]:
    """Resolve default pincode from existing app/web user and worker records."""
    candidates = [
        ((user or {}).get("address") or {}).get("pincode"),
        (user or {}).get("pincode"),
        (user or {}).get("pin_code"),
        (user or {}).get("postal_code"),
        ((worker_profile or {}).get("address") or {}).get("pincode"),
        (worker_profile or {}).get("pincode"),
        (worker_profile or {}).get("pin_code"),
        (worker_profile or {}).get("postal_code"),
    ]
    for value in candidates:
        digits = "".join(c for c in str(value or "") if c.isdigit())
        if len(digits) == 6:
            return digits
    return None


def _display_name(doc: Optional[dict], fallback: str) -> str:
    name = (doc or {}).get("name") or fallback
    return str(name).strip().split()[0] if str(name).strip() else fallback


def _worker_primary_skill(worker: dict) -> str:
    structured = worker.get("structured_skills") or []
    for item in structured:
        if isinstance(item, dict) and item.get("skill"):
            return str(item["skill"]).title()
    skills = worker.get("skills") or []
    return str(skills[0]).title() if skills else "General"


def _location_label(doc: dict) -> str:
    address = doc.get("address") or {}
    return (
        doc.get("village")
        or address.get("village")
        or doc.get("district")
        or address.get("district")
        or address.get("pincode")
        or "Area"
    )


async def _fetch_workers_for_customer_pincode(
    pincode: str, limit: int = 5, offset: int = 0
) -> list[dict]:
    query = {
        "address.pincode": pincode,
        "$or": [{"available": True}, {"availability_status": "available"}],
    }
    workers = await db.workers.find(query, {"_id": 0}).limit(50).to_list(50)
    workers.sort(
        key=lambda w: (
            -float(w.get("avg_rating", 0) or 0),
            -int(w.get("trust_tier", 0) or 0),
            int(w.get("daily_rate", 999999) or 999999),
        )
    )
    return workers[offset : offset + limit]


async def _fetch_jobs_for_worker_pincode(worker: dict, pincode: str, limit: int = 5) -> list[dict]:
    jobs, _ = await _fetch_jobs_for_worker(worker, pincode_filter=pincode)
    return jobs[:limit]


def _format_customer_worker_list(name: str, pincode: str, workers: list[dict]) -> str:
    if not workers:
        return (
            f"Namaste {name}! Aapke pincode {pincode} mein abhi koi worker nahi mila.\n\n"
            "Kisi aur pincode mein worker dekhna hai?"
        )
    lines = [f"Namaste {name}! Aapke pincode {pincode} ke nearby workers:\n"]
    for idx, worker in enumerate(workers, 1):
        lines.append(
            f"{idx}. {worker.get('name', 'Worker')} — {_worker_primary_skill(worker)} — "
            f"₹{worker.get('daily_rate', '?')}/day — {_location_label(worker)}"
        )
    lines.append("\nKisi aur pincode mein worker chahiye? Reply: PINCODE 841219")
    lines.append("More workers ke liye reply: MORE")
    return "\n".join(lines)


def _format_worker_job_list(name: str, pincode: str, jobs: list[dict]) -> str:
    if not jobs:
        return (
            f"Namaste {name}! Aapke pincode {pincode} mein abhi koi nearby kaam nahi mila.\n\n"
            "Kisi aur pincode mein kaam dekhna hai?"
        )
    lines = [f"Namaste {name}! Aapke pincode {pincode} ke nearby kaam:\n"]
    for idx, job in enumerate(jobs, 1):
        lines.append(
            f"{idx}. {job.get('title', 'Kaam')} — ₹{job.get('daily_rate', '?')}/day — {_location_label(job)}"
        )
    lines.append("\nKisi aur pincode mein kaam dekhna hai? Reply: PINCODE 841219")
    lines.append("More jobs ke liye reply: MORE")
    return "\n".join(lines)


def _job_list_body(name: str, pincode: str) -> str:
    return f"Namaste {name}! Aapke pincode {pincode} ke nearby kaam mil rahe hain."


def _worker_list_body(name: str, pincode: str) -> str:
    return f"Namaste {name}! Aapke pincode {pincode} ke nearby workers mil rahe hain."


def _job_list_sections(jobs: list[dict]) -> list[dict]:
    rows = []
    for job in jobs[:10]:
        location = _location_label(job)
        workers_needed = job.get("workers_needed", 1)
        rows.append(
            {
                "id": f"JOB:{job.get('id')}",
                "title": _safe_wa_title(job.get("title") or job.get("category") or "Kaam"),
                "description": _safe_wa_description(
                    f"₹{job.get('daily_rate', '?')}/day · {location} · {workers_needed} workers"
                ),
            }
        )
    return [{"title": "Nearby Jobs", "rows": rows}]


def _worker_list_sections(workers: list[dict]) -> list[dict]:
    rows = []
    for worker in workers[:10]:
        rows.append(
            {
                "id": f"WORKER:{worker.get('id')}",
                "title": _safe_wa_title(worker.get("name") or "Worker"),
                "description": _safe_wa_description(
                    f"{_worker_primary_skill(worker)} · ₹{worker.get('daily_rate', '?')}/day · {_location_label(worker)}"
                ),
            }
        )
    return [{"title": "Nearby Workers", "rows": rows}]


def _booking_job_sections(jobs: list[dict], worker_id: str) -> list[dict]:
    rows = []
    for job in jobs[:10]:
        addr = job.get("address") or {}
        location = addr.get("pincode") or _location_label(job)
        rows.append(
            {
                "id": f"BOOK_JOB:{job.get('id')}:{worker_id}",
                "title": _safe_wa_title(job.get("title") or job.get("category") or "Job"),
                "description": _safe_wa_description(
                    f"{location} · ₹{job.get('daily_rate', '?')}/day · {job.get('job_date', 'TBD')}"
                ),
            }
        )
    return [{"title": "Open Jobs", "rows": rows}]


def _format_open_jobs_for_booking(jobs: list[dict]) -> str:
    lines = ["Kaunsa job ke liye request bhejni hai?\n"]
    for idx, job in enumerate(jobs, 1):
        addr = job.get("address") or {}
        location = addr.get("pincode") or _location_label(job)
        lines.append(
            f"{idx}. {job.get('title', 'Job')} — ₹{job.get('daily_rate', '?')}/day — {location}"
        )
    return "\n".join(lines)


def _job_reply_list(name: str, pincode: str, jobs: list[dict]) -> Optional[dict]:
    if len(jobs) <= 3:
        return None
    return {
        "body_text": _job_list_body(name, pincode),
        "button_text": "Jobs dekhein",
        "sections": _job_list_sections(jobs),
    }


def _worker_reply_list(name: str, pincode: str, workers: list[dict]) -> Optional[dict]:
    if len(workers) <= 3:
        return None
    return {
        "body_text": _worker_list_body(name, pincode),
        "button_text": "Workers dekhein",
        "sections": _worker_list_sections(workers),
    }


def _maybe_with_reply_list(state: dict, reply_list: Optional[dict]) -> dict:
    return _with_reply_list(state, reply_list) if reply_list else state


async def _registered_customer_hi(
    source_phone: str, state: dict, user: dict, worker: Optional[dict] = None
) -> tuple[str, dict]:
    pincode = get_default_pincode(user, worker)
    name = _display_name(user, "Customer")
    if not pincode:
        logger.info(
            "WhatsApp flow=registered_customer_hi role=customer pincode=missing phone=%s",
            _mask_phone(source_phone),
        )
        return (
            "Aapka pincode missing hai. Kripya pincode update karein.",
            _with_reply_buttons(
                {
                    **state,
                    "step": "awaiting_pincode",
                    "role": "customer",
                    "user_id": user.get("id"),
                    "awaiting_pincode_for": "customer",
                },
                _BUTTONS_MISSING_PINCODE,
            ),
        )

    workers = await _fetch_workers_for_customer_pincode(pincode)
    logger.info(
        "WhatsApp flow=registered_customer_hi role=customer pincode=%s workers_count=%s phone=%s",
        pincode,
        len(workers),
        _mask_phone(source_phone),
    )
    return (
        _format_customer_worker_list(name, pincode, workers),
        _maybe_with_reply_list(
            _with_reply_buttons(
                {
                    **state,
                    "step": "customer_worker_list",
                    "role": "customer",
                    "user_id": user.get("id"),
                    "worker_list": workers,
                    "worker_offset": 5,
                    "worker_pincode_filter": pincode,
                },
                _BUTTONS_CUSTOMER_RESULTS,
            ),
            _worker_reply_list(name, pincode, workers),
        ),
    )


async def _registered_worker_hi(
    source_phone: str, state: dict, user: dict, worker: Optional[dict]
) -> tuple[str, dict]:
    if not worker:
        return (
            "Worker profile nahi mila. Pehle kaamnow.com/worker/onboarding par profile banayein.",
            state,
        )
    pincode = get_default_pincode(user, worker)
    name = _display_name(worker or user, "Worker")
    if not pincode:
        logger.info(
            "WhatsApp flow=registered_worker_hi role=worker pincode=missing phone=%s",
            _mask_phone(source_phone),
        )
        return (
            "Aapka pincode missing hai. Kripya pincode update karein.",
            _with_reply_buttons(
                {
                    **state,
                    "step": "awaiting_pincode",
                    "role": "worker",
                    "user_id": user.get("id"),
                    "worker_id": worker.get("id"),
                    "awaiting_pincode_for": "worker",
                },
                _BUTTONS_MISSING_PINCODE,
            ),
        )

    jobs = await _fetch_jobs_for_worker_pincode(worker, pincode)
    logger.info(
        "WhatsApp flow=registered_worker_hi role=worker pincode=%s jobs_count=%s phone=%s",
        pincode,
        len(jobs),
        _mask_phone(source_phone),
    )
    return (
        _format_worker_job_list(name, pincode, jobs),
        _maybe_with_reply_list(
            _with_reply_buttons(
                {
                    **state,
                    "step": "job_list",
                    "role": "worker",
                    "user_id": user.get("id"),
                    "worker_id": worker.get("id"),
                    "job_list": jobs,
                    "job_offset": 5,
                    "job_category": None,
                    "job_pincode_filter": pincode,
                    "viewed_job": None,
                },
                _BUTTONS_WORKER_RESULTS if jobs else _BUTTONS_WORKER_NO_RESULTS,
            ),
            _job_reply_list(name, pincode, jobs),
        ),
    )


async def _customer_workers_for_pincode(
    source_phone: str, state: dict, pincode: str
) -> tuple[str, dict]:
    user, worker, state = await _identify_user(source_phone, state)
    if not user:
        return await _cmd_onboard(source_phone, "hi", state)
    workers = await _fetch_workers_for_customer_pincode(pincode)
    name = _display_name(user, "Customer")
    logger.info(
        "WhatsApp flow=customer_pincode_search role=customer pincode=%s workers_count=%s phone=%s",
        pincode,
        len(workers),
        _mask_phone(source_phone),
    )
    return (
        _format_customer_worker_list(name, pincode, workers),
        _maybe_with_reply_list(
            _with_reply_buttons(
                {
                    **state,
                    "step": "customer_worker_list",
                    "worker_list": workers,
                    "worker_offset": 5,
                    "worker_pincode_filter": pincode,
                },
                _BUTTONS_CUSTOMER_RESULTS,
            ),
            _worker_reply_list(name, pincode, workers),
        ),
    )


async def _customer_more_workers(source_phone: str, state: dict) -> tuple[str, dict]:
    pincode = state.get("worker_pincode_filter")
    if not pincode:
        user, worker, state = await _identify_user(source_phone, state)
        pincode = get_default_pincode(user, worker)
    if not pincode:
        return (
            "Aapka pincode missing hai. Kripya pincode update karein.",
            _with_reply_buttons(
                {**state, "step": "awaiting_pincode", "awaiting_pincode_for": "customer"},
                _BUTTONS_MISSING_PINCODE,
            ),
        )
    offset = int(state.get("worker_offset", 5) or 5)
    workers = await _fetch_workers_for_customer_pincode(pincode, offset=offset)
    if not workers:
        return (
            f"Pincode {pincode} mein aur workers nahi mile.\n\nKisi aur pincode ke liye reply: PINCODE 841219",
            state,
        )
    user, _, state = await _identify_user(source_phone, state)
    name = _display_name(user, "Customer")
    existing = state.get("worker_list", [])
    return (
        _format_customer_worker_list(name, pincode, workers),
        _maybe_with_reply_list(
            _with_reply_buttons(
                {
                    **state,
                    "step": "customer_worker_list",
                    "worker_list": existing + workers,
                    "worker_offset": offset + 5,
                    "worker_pincode_filter": pincode,
                },
                _BUTTONS_CUSTOMER_RESULTS,
            ),
            _worker_reply_list(name, pincode, workers),
        ),
    )


def _format_worker_brief(worker: dict) -> str:
    return (
        f"👷 *{worker.get('name', 'Worker')}*\n\n"
        f"Kaam: {_worker_primary_skill(worker)}\n"
        f"Rate: ₹{worker.get('daily_rate', '?')}/day\n"
        f"Location: {_location_label(worker)}\n\n"
        "Full booking flow abhi app/website par continue karein: kaamnow.com/marketplace\n"
        "Aur workers ke liye reply: MORE"
    )


async def _show_job_detail_by_id(source_phone: str, job_id: str, state: dict) -> tuple[str, dict]:
    user, worker, state = await _identify_user(source_phone, state)
    if not user:
        return (
            "Pehle KaamNow par worker ke roop mein register karein, phir apply kar sakte hain.",
            state,
        )
    if user.get("role") != "worker" or not worker:
        return ("Sirf registered worker job par apply kar sakte hain.", state)
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        return ("Job nahi mila. MORE ya JOBS try karein.", state)
    lat = float(worker.get("lat") or 0) if worker else None
    lng = float(worker.get("lng") or 0) if worker else None
    buttons = [
        {"id": f"APPLY:{job_id}", "title": "Apply"},
        {"id": "MORE", "title": "More Jobs"},
        {"id": "STATUS", "title": "My Applications"},
    ]
    logger.info("WhatsApp flow=worker_select_job worker_id=%s job_id=%s", worker.get("id"), job_id)
    return (
        _format_job_detail(job, lat, lng),
        _with_reply_buttons(
            {**state, "step": "viewing_job_detail", "selected_job_id": job_id, "viewed_job": job},
            buttons,
        ),
    )


async def _show_worker_detail_by_id(
    source_phone: str, worker_id: str, state: dict
) -> tuple[str, dict]:
    worker = await db.workers.find_one({"id": worker_id}, {"_id": 0})
    if not worker:
        return ("Worker nahi mila. MORE ya WORKERS try karein.", state)
    skills = ", ".join(worker.get("skills", [])[:5]) or _worker_primary_skill(worker)
    rating = worker.get("avg_rating")
    total_jobs = worker.get("total_jobs")
    rating_line = f"\nRating: {rating} ({total_jobs or 0} jobs)" if rating is not None else ""
    msg = (
        f"👷 *{worker.get('name', 'Worker')}*\n\n"
        f"Skills: {skills}\n"
        f"Rate: ₹{worker.get('daily_rate', '?')}/day\n"
        f"Location: {_location_label(worker)}{rating_line}\n\n"
        "Request bhejne ke liye button tap karein."
    )
    buttons = [
        {"id": f"REQUEST:{worker_id}", "title": "Send Request"},
        {"id": "MORE", "title": "More Workers"},
        {"id": "CHANGE_PINCODE", "title": "Change Pincode"},
    ]
    return (
        msg,
        _with_reply_buttons(
            {**state, "step": "customer_worker_detail", "selected_worker_id": worker_id}, buttons
        ),
    )


async def _fetch_customer_open_jobs(customer_id: str) -> list[dict]:
    jobs = (
        await db.jobs.find(
            {
                "customer_id": customer_id,
                "status": {"$nin": ["completed", "cancelled", "closed", "booked", "expired"]},
            },
            {"_id": 0},
        )
        .sort("created_at", -1)
        .limit(20)
        .to_list(20)
    )
    return [
        job
        for job in jobs
        if int(job.get("filled_count") or 0) < int(job.get("workers_needed") or 1)
    ]


async def _create_customer_booking_request(
    user: dict, worker_id: str, job_id: str
) -> tuple[str, dict, bool]:
    duplicate = await db.engagements.find_one(
        {
            "job_id": job_id,
            "worker_id": worker_id,
            "customer_id": user["id"],
            "status": {"$in": ["requested", "accepted"]},
        },
        {"_id": 0},
    )
    if duplicate:
        logger.info(
            "WhatsApp flow=customer_request_worker customer_id=%s worker_id=%s selected_job_id=%s duplicate=true booking_created=false",
            user.get("id"),
            worker_id,
            job_id,
        )
        return (
            "Is worker ko is job ke liye request already bheji ja chuki hai.",
            duplicate,
            True,
        )
    engagement = await create_engagement_request(
        job_id=job_id,
        worker_id=worker_id,
        source="customer_booking",
        user=user,
    )
    logger.info(
        "WhatsApp flow=customer_request_worker customer_id=%s worker_id=%s selected_job_id=%s duplicate=false booking_created=true",
        user.get("id"),
        worker_id,
        job_id,
    )
    return ("Request bhej diya gaya ✅", engagement, False)


async def _confirm_customer_booking(
    source_phone: str, state: dict, user: dict, worker_id: str, job_id: str
) -> tuple[str, dict]:
    if not user or user.get("role") != "customer":
        return ("Sirf registered customer worker request bhej sakte hain.", state)
    worker = await db.workers.find_one({"id": worker_id}, {"_id": 0})
    if not worker:
        return ("Worker nahi mila. MORE ya WORKERS try karein.", state)
    try:
        prefix, engagement, duplicate = await _create_customer_booking_request(
            user, worker_id, job_id
        )
    except HTTPException as exc:
        detail = getattr(exc, "detail", "Request nahi bhej paaye.")
        return (
            f"Request nahi bhej paaye: {detail}",
            _with_reply_buttons(state, _BUTTONS_BOOKING_DONE),
        )
    job_title = engagement.get("job_title") or "Job"
    worker_name = worker.get("name") or engagement.get("worker_name") or "Worker"
    if duplicate:
        msg = f"{prefix}\n\nWorker: {worker_name}\nJob: {job_title}"
    else:
        msg = f"{prefix}\n\nWorker: {worker_name}\nJob: {job_title}"
    return (
        msg,
        _with_reply_buttons(
            {
                **state,
                "step": "customer_worker_list",
                "selected_worker_id": None,
                "last_customer_open_jobs": [],
            },
            _BUTTONS_BOOKING_DONE,
        ),
    )


async def _request_selected_worker(
    source_phone: str, state: dict, user: Optional[dict], worker_id: Optional[str] = None
) -> tuple[str, dict]:
    if not user:
        return ("Pehle KaamNow par register karein, phir worker request bhej sakte hain.", state)
    if user.get("role") != "customer":
        return ("Sirf customers worker request bhej sakte hain.", state)
    worker_id = worker_id or state.get("selected_worker_id")
    if not worker_id:
        return (
            "Pehle worker select karein.",
            _with_reply_buttons(state, _BUTTONS_CUSTOMER_RESULTS),
        )
    worker = await db.workers.find_one({"id": worker_id}, {"_id": 0})
    if not worker:
        return ("Worker nahi mila. MORE ya WORKERS try karein.", state)
    jobs = await _fetch_customer_open_jobs(user["id"])
    logger.info(
        "WhatsApp flow=customer_request_worker customer_id=%s worker_id=%s job_count=%s",
        user.get("id"),
        worker_id,
        len(jobs),
    )
    if len(jobs) == 1:
        return await _confirm_customer_booking(source_phone, state, user, worker_id, jobs[0]["id"])
    if len(jobs) > 1:
        reply_list = None
        if len(jobs) > 3:
            reply_list = {
                "body_text": "Kaunsa job ke liye request bhejni hai?",
                "button_text": "Jobs dekhein",
                "sections": _booking_job_sections(jobs, worker_id),
            }
        next_state = {
            **state,
            "step": "choose_booking_job",
            "selected_worker_id": worker_id,
            "last_customer_open_jobs": jobs,
        }
        return (
            _format_open_jobs_for_booking(jobs),
            _maybe_with_reply_list(next_state, reply_list),
        )
    return (
        "Aapke paas abhi koi open job nahi hai. Request bhejne ke liye pehle job post karna hoga.",
        _with_reply_buttons(
            {**state, "step": "customer_worker_detail", "selected_worker_id": worker_id},
            _BUTTONS_NO_OPEN_JOB,
        ),
    )


async def _start_customer_post_job(state: dict) -> tuple[str, dict]:
    return (
        "Kaunsa kaam chahiye? Example: Mason, Driver, Cook",
        {**state, "step": "customer_post_job_skill", "post_job": {}},
    )


def _post_job_summary(post_job: dict) -> str:
    return (
        "Job summary:\n"
        f"Skill: {post_job.get('skill')}\n"
        f"Pincode: {post_job.get('pincode')}\n"
        f"Rate: ₹{post_job.get('daily_rate')}/day\n"
        f"Workers: {post_job.get('workers_needed')}"
    )


async def _handle_customer_post_job(
    source_phone: str, raw: str, state: dict, user: dict
) -> tuple[str, dict]:
    step = state.get("step")
    post_job = dict(state.get("post_job") or {})
    if step == "customer_post_job_skill":
        if len(raw.strip()) < 2:
            return ("Kaam ka naam bhejein. Example: Mason", state)
        post_job["skill"] = raw.strip()
        return (
            "Job ka pincode kya hai? 6-digit pincode bhejein.",
            {**state, "step": "customer_post_job_pincode", "post_job": post_job},
        )
    if step == "customer_post_job_pincode":
        if not raw.isdigit() or len(raw) != 6:
            return ("Sahi 6-digit pincode bhejein. Example: 841219", state)
        post_job["pincode"] = raw
        return (
            "Daily rate kitna dena hai? Example: 600",
            {**state, "step": "customer_post_job_rate", "post_job": post_job},
        )
    if step == "customer_post_job_rate":
        if not raw.isdigit() or int(raw) < 100:
            return ("Valid daily rate bhejein. Example: 600", state)
        post_job["daily_rate"] = int(raw)
        return (
            "Kitne workers chahiye? Example: 1",
            {**state, "step": "customer_post_job_workers_needed", "post_job": post_job},
        )
    if step == "customer_post_job_workers_needed":
        if not raw.isdigit() or not (1 <= int(raw) <= 20):
            return ("1 se 20 ke beech workers count bhejein.", state)
        post_job["workers_needed"] = int(raw)
        return (
            _post_job_summary(post_job),
            _with_reply_buttons(
                {**state, "step": "customer_post_job_confirm", "post_job": post_job},
                _BUTTONS_POST_JOB_CONFIRM,
            ),
        )
    return (
        "MENU type karein naya request shuru karne ke liye.",
        {**state, "step": "customer_worker_list"},
    )


async def _create_job_from_whatsapp(state: dict, user: dict) -> tuple[str, dict]:
    post_job = state.get("post_job") or {}
    required = ("skill", "pincode", "daily_rate", "workers_needed")
    if not all(post_job.get(key) for key in required):
        return (
            "Job details missing hain. Post Job dobara start karein.",
            _with_reply_buttons(state, _BUTTONS_NO_OPEN_JOB),
        )
    address = dict((user or {}).get("address") or {})
    address["pincode"] = post_job["pincode"]
    skill = str(post_job["skill"]).strip()
    job_id = str(uuid.uuid4())
    job_doc = {
        "id": job_id,
        "customer_id": user["id"],
        "customer_name": user.get("name", "Customer"),
        "title": f"{skill} work",
        "category": skill.lower(),
        "description": f"WhatsApp se job post: {skill}",
        "workers_needed": int(post_job["workers_needed"]),
        "daily_rate": int(post_job["daily_rate"]),
        "job_date": date.today().isoformat(),
        "village": address.get("village") or user.get("village") or "",
        "lat": 0.0,
        "lng": 0.0,
        "required_skills": [{"category": skill, "skill": skill}],
        "address": address,
        "status": "open",
        "filled_count": 0,
        "accepted_worker_ids": [],
        "urgency": "normal",
        "created_at": utc_now_iso(),
        "source": "whatsapp",
    }
    await db.jobs.insert_one(job_doc)
    worker_id = state.get("selected_worker_id")
    logger.info(
        "WhatsApp flow=customer_post_job customer_id=%s selected_job_id=%s worker_id=%s",
        user.get("id"),
        job_id,
        worker_id,
    )
    buttons = (
        [
            {"id": f"REQUEST:{worker_id}", "title": "Send Request"},
            {"id": "MORE", "title": "More Workers"},
            {"id": "MENU", "title": "Menu"},
        ]
        if worker_id
        else _BUTTONS_BOOKING_DONE
    )
    return (
        f"Job create ho gaya ✅\n\n{job_doc['title']} — ₹{job_doc['daily_rate']}/day\n\nAb selected worker ko request bhejein?",
        _with_reply_buttons(
            {
                **state,
                "step": "customer_worker_detail",
                "post_job": {},
                "last_customer_open_jobs": [job_doc],
            },
            buttons,
        ),
    )


# ─── Identity & authentication ────────────────────────────────────────────────


async def _identify_user(
    source_phone: str, state: dict
) -> tuple[Optional[dict], Optional[dict], dict]:
    """
    Returns (user, worker, updated_state).
    If role/user_id already in state, use that. Otherwise look up by phone.
    """
    if state.get("user_id"):
        user = await db.users.find_one({"id": state["user_id"]}, {"_id": 0})
        worker = None
        if state.get("worker_id"):
            worker = await db.workers.find_one({"id": state["worker_id"]}, {"_id": 0})
        logger.info(
            "WhatsApp identity from session phone=%s user_found=%s role=%s",
            _mask_phone(source_phone),
            bool(user),
            (user or {}).get("role") or state.get("role"),
        )
        return user, worker, state

    user = await _lookup_user_by_phone(source_phone)
    if not user:
        logger.info(
            "WhatsApp identity phone=%s user_found=false role=unregistered",
            _mask_phone(source_phone),
        )
        return None, None, state

    worker = None
    if user.get("role") == "worker":
        worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})

    new_state = {
        **state,
        "user_id": user["id"],
        "role": user.get("role", "unknown"),
        "worker_id": worker["id"] if worker else None,
    }
    logger.info(
        "WhatsApp identity phone=%s user_found=true role=%s",
        _mask_phone(source_phone),
        user.get("role", "unknown"),
    )
    return user, worker, new_state


# ─── Worker command handlers ──────────────────────────────────────────────────


async def _cmd_jobs(
    source_phone: str,
    state: dict,
    category: Optional[str] = None,
    offset: int = 0,
    pincode_filter: Optional[str] = None,
) -> tuple[str, dict]:
    user, worker, state = await _identify_user(source_phone, state)
    if not worker:
        return (
            "Worker profile nahi mila. Pehle kaamnow.com/worker/onboarding par profile banayein.",
            state,
        )

    jobs, has_more = await _fetch_jobs_for_worker(worker, category, offset, pincode_filter)

    if not jobs:
        if pincode_filter:
            return (
                f"Pincode *{pincode_filter}* mein koi kaam nahi mila.\n"
                f"Apne area ke liye sirf *JOBS* type karein.",
                state,
            )
        if category:
            return (
                f"Is category '{category}' mein koi kaam nahi mila. JOBS se sab dekhein.",
                state,
            )
        return ("Aapke pincode ke paas koi kaam nahi mila. Thodi der baad try karein. 🙏", state)

    lat = float(worker.get("lat") or 0) or None
    lng = float(worker.get("lng") or 0) or None

    header = ""
    if pincode_filter:
        header = f"📍 *{pincode_filter}* area ke kaam:\n"

    msg = header + _format_job_list(jobs, lat, lng, offset)
    if has_more:
        msg += "\n\n*MORE* type karein aur jobs ke liye."

    name = "Worker"
    pincode_for_list = pincode_filter or get_default_pincode(user, worker) or ""
    if worker:
        name = _display_name(worker or user, "Worker")
    reply_list = _job_reply_list(name, pincode_for_list, jobs) if pincode_for_list else None
    new_state = {
        **state,
        "step": "job_list",
        "job_list": jobs,
        "job_offset": offset + 5,
        "job_category": category,
        "job_pincode_filter": pincode_filter,  # temporary — not saved to profile
        "viewed_job": None,
    }
    new_state = _maybe_with_reply_list(new_state, reply_list)
    return (msg, new_state)


async def _cmd_job_detail(source_phone: str, number: int, state: dict) -> tuple[str, dict]:
    job_list = state.get("job_list", [])
    idx = number - 1
    if not job_list or idx < 0 or idx >= len(job_list):
        return ("Sahi number type karein (e.g. 1, 2, 3). JOBS se list dobara dekhein.", state)

    _, worker, state = await _identify_user(source_phone, state)
    job = job_list[idx]
    lat = float(worker.get("lat") or 0) if worker else None
    lng = float(worker.get("lng") or 0) if worker else None

    msg = _format_job_detail(job, lat, lng)
    logger.info(
        "WhatsApp flow=worker_select_job worker_id=%s job_id=%s",
        (worker or {}).get("id"),
        job.get("id"),
    )
    new_state = _with_reply_buttons(
        {
            **state,
            "step": "viewing_job_detail",
            "selected_job_id": job.get("id"),
            "viewed_job": job,
        },
        [
            {"id": f"APPLY:{job.get('id')}", "title": "Apply"},
            {"id": "MORE", "title": "More Jobs"},
            {"id": "STATUS", "title": "My Applications"},
        ],
    )
    return (msg, new_state)


async def _cmd_apply(source_phone: str, state: dict) -> tuple[str, dict]:
    viewed_job = state.get("viewed_job")
    selected_job_id = state.get("selected_job_id")
    if not viewed_job and selected_job_id:
        viewed_job = await db.jobs.find_one({"id": selected_job_id}, {"_id": 0})
    if not viewed_job:
        return (
            "Pehle koi job select karein details dekhne ke liye.",
            _with_reply_buttons(state, _BUTTONS_WORKER_MENU),
        )

    user, worker, state = await _identify_user(source_phone, state)
    if not user:
        return (
            "Pehle KaamNow par worker ke roop mein register karein, phir apply kar sakte hain.",
            state,
        )
    if user.get("role") != "worker" or not worker:
        return ("Sirf registered worker job par apply kar sakte hain.", state)

    job_available = viewed_job.get("status", "open") == "open"
    if not job_available:
        logger.info(
            "WhatsApp flow=worker_apply_job worker_id=%s job_id=%s job_available=false",
            worker.get("id"),
            viewed_job.get("id"),
        )
        return (
            "Yeh job ab available nahi hai.",
            _with_reply_buttons(state, _BUTTONS_WORKER_JOB_UNAVAILABLE),
        )

    # Check if already applied
    existing = await db.engagements.find_one(
        {
            "job_id": viewed_job["id"],
            "worker_id": worker["id"],
            "status": {"$in": ["requested", "accepted", "completed"]},
        }
    )
    if existing:
        logger.info(
            "WhatsApp flow=worker_apply_job worker_id=%s job_id=%s engagement_id=%s duplicate=true job_available=true",
            worker.get("id"),
            viewed_job.get("id"),
            existing.get("id"),
        )
        return (
            "Aap is job par already apply kar chuke hain.",
            _with_reply_buttons(
                {**state, "active_engagement_id": existing.get("id")}, _BUTTONS_WORKER_APPLY_DONE
            ),
        )

    # Create engagement via the proper function
    try:
        engagement = await create_engagement_request(
            job_id=viewed_job["id"],
            worker_id=worker["id"],
            source="worker_interest",
            user=user,
        )
    except Exception as exc:
        detail = getattr(exc, "detail", str(exc))
        return (
            f"Apply nahi ho saka: {detail}\n\nKoi aur job try karein.",
            _with_reply_buttons(state, _BUTTONS_WORKER_JOB_UNAVAILABLE),
        )

    logger.info(
        "WhatsApp flow=worker_apply_job worker_id=%s job_id=%s engagement_id=%s duplicate=false job_available=true",
        worker.get("id"),
        viewed_job.get("id"),
        engagement.get("id"),
    )
    new_state = _with_reply_buttons(
        {
            **state,
            "step": "applied",
            "active_engagement_id": engagement["id"],
            "selected_job_id": viewed_job.get("id"),
            "viewed_job": None,
        },
        _BUTTONS_WORKER_APPLY_DONE,
    )
    addr = viewed_job.get("address") or {}
    location = addr.get("pincode") or _location_label(viewed_job)
    return (
        f"Apply ho gaya ✅\n\n"
        f"Customer aapka request review karega.\n\n"
        f"Job: {viewed_job['title']}\n"
        f"Location: {location}\n"
        f"Rate: ₹{viewed_job.get('daily_rate', '?')}/day",
        new_state,
    )


async def _cmd_withdraw(source_phone: str, state: dict) -> tuple[str, dict]:
    user, worker, state = await _identify_user(source_phone, state)
    if not worker:
        return ("Worker profile nahi mila.", state)

    engagements = (
        await db.engagements.find(
            {"worker_id": worker["id"], "status": "requested"},
            {"_id": 0},
        )
        .sort("created_at", -1)
        .limit(10)
        .to_list(10)
    )

    if not engagements:
        return ("Koi pending interest nahi mila jise withdraw karein.", state)

    if len(engagements) == 1:
        eng = engagements[0]
        logger.info(
            "WhatsApp flow=worker_withdraw worker_id=%s engagement_id=%s pending_count=1",
            worker.get("id"),
            eng.get("id"),
        )
        return (
            f"Is application ko withdraw karna hai?\n\n{eng.get('job_title', 'Job')}",
            _with_reply_buttons(
                {
                    **state,
                    "step": "confirm_withdraw",
                    "pending_withdraw_results": engagements,
                    "withdraw_engagement_id": eng["id"],
                },
                _BUTTONS_WORKER_WITHDRAW_CONFIRM,
            ),
        )

    lines = ["Kaunsi application withdraw karni hai?\n"]
    for idx, eng in enumerate(engagements, 1):
        lines.append(f"{idx}. {eng.get('job_title', 'Job')} — ₹{eng.get('daily_rate', '?')}/day")
    logger.info(
        "WhatsApp flow=worker_withdraw worker_id=%s pending_count=%s",
        worker.get("id"),
        len(engagements),
    )
    return (
        "\n".join(lines),
        {**state, "step": "choose_withdraw_application", "pending_withdraw_results": engagements},
    )


async def _cmd_withdraw_confirm(
    source_phone: str, state: dict, engagement_id: Optional[str] = None
) -> tuple[str, dict]:
    user, worker, state = await _identify_user(source_phone, state)
    if not worker:
        return ("Worker profile nahi mila.", state)
    eng_id = engagement_id or state.get("withdraw_engagement_id")
    if not eng_id:
        return ("Pehle application select karein.", state)
    eng = await db.engagements.find_one(
        {"id": eng_id, "worker_id": worker["id"], "status": "requested"}, {"_id": 0}
    )
    if not eng:
        return (
            "Pending application nahi mili.",
            _with_reply_buttons(state, _BUTTONS_WORKER_APPLY_DONE),
        )
    await db.engagements.update_one(
        {"id": eng["id"]},
        {
            "$set": {
                "status": "cancelled",
                "cancelled_at": utc_now_iso(),
                "updated_at": utc_now_iso(),
            }
        },
    )

    # Reopen job if needed
    await db.jobs.update_one(
        {"id": eng["job_id"], "status": "booked"},
        {"$set": {"status": "open"}},
    )

    # Notify customer
    try:
        await _notify(
            eng["customer_id"],
            f"Interest wapas liya: {eng.get('job_title')}",
            f"{eng.get('worker_name', 'Worker')} ne interest wapas le liya. Aapka job wapas open hai.",
            "interest_withdrawn",
            eng["id"],
        )
    except Exception:
        pass

    logger.info(
        "WhatsApp flow=worker_withdraw worker_id=%s engagement_id=%s cancelled=true",
        worker.get("id"),
        eng.get("id"),
    )
    new_state = _with_reply_buttons(
        {
            **state,
            "step": "worker_menu",
            "active_engagement_id": None,
            "viewed_job": None,
            "withdraw_engagement_id": None,
        },
        _BUTTONS_WORKER_APPLY_DONE,
    )
    return (
        f"Application withdraw ho gaya.\n\nJob: {eng.get('job_title', 'Job')}",
        new_state,
    )


async def _cmd_status(source_phone: str, state: dict) -> tuple[str, dict]:
    user, worker, state = await _identify_user(source_phone, state)
    if not worker:
        return ("Worker profile nahi mila.", state)

    engagements = (
        await db.engagements.find(
            {"worker_id": worker["id"]},
            {"_id": 0},
        )
        .sort("created_at", -1)
        .limit(30)
        .to_list(30)
    )

    if not engagements:
        logger.info("WhatsApp flow=worker_status worker_id=%s applications=0", worker.get("id"))
        return (
            "Abhi koi active request nahi hai.",
            _with_reply_buttons(state, _BUTTONS_WORKER_STATUS_EMPTY),
        )

    groups = [
        ("Pending", [e for e in engagements if e.get("status") == "requested"][:3]),
        ("Accepted / Active", [e for e in engagements if e.get("status") == "accepted"][:3]),
        (
            "Completed / Cancelled",
            [e for e in engagements if e.get("status") in ("completed", "cancelled", "rejected")][
                :3
            ],
        ),
    ]
    lines = ["📊 *My Applications:*\n"]
    for title, items in groups:
        if not items:
            continue
        lines.append(f"*{title}*")
        for e in items:
            rate = f"₹{e.get('daily_rate', '?')}/day"
            lines.append(f"- {e.get('job_title', 'Job')} — {rate} — {e.get('status')}")
        lines.append("")

    logger.info(
        "WhatsApp flow=worker_status worker_id=%s applications=%s",
        worker.get("id"),
        len(engagements),
    )
    return ("\n".join(lines).strip(), _with_reply_buttons(state, _BUTTONS_WORKER_APPLY_DONE))


async def _cmd_customer_status(user: dict, state: dict) -> tuple[str, dict]:
    engagements = (
        await db.engagements.find(
            {"customer_id": user["id"], "status": {"$in": ["requested", "accepted"]}},
            {"_id": 0},
        )
        .sort("created_at", -1)
        .limit(5)
        .to_list(5)
    )
    if not engagements:
        return (
            "Abhi koi active request nahi hai.",
            _with_reply_buttons(state, _BUTTONS_CUSTOMER_RESULTS),
        )
    lines = ["📊 *Meri Requests:*\n"]
    for engagement in engagements:
        label = "Pending" if engagement.get("status") == "requested" else "Confirmed"
        lines.append(
            f"{label}: {engagement.get('worker_name', 'Worker')} — {engagement.get('job_title', 'Job')}"
        )
    return ("\n".join(lines), _with_reply_buttons(state, _BUTTONS_BOOKING_DONE))


async def _cmd_set_pincode(source_phone: str, pincode: str, state: dict) -> tuple[str, dict]:
    if not pincode.isdigit() or len(pincode) != 6:
        return ("Valid 6-digit pincode bhejein. Example: *PINCODE 841219*", state)

    user, worker, state = await _identify_user(source_phone, state)
    if not worker:
        return ("Worker profile nahi mila.", state)

    # Update worker's address pincode
    address = worker.get("address") or {}
    address["pincode"] = pincode
    await db.workers.update_one(
        {"id": worker["id"]},
        {"$set": {"address": address}},
    )
    updated_worker = {**worker, "address": address}
    reply, new_state = await _registered_worker_hi(source_phone, state, user, updated_worker)
    return (f"✅ Pincode update ho gaya: *{pincode}*\n\n{reply}", new_state)


async def _cmd_show_pincode(source_phone: str, state: dict) -> tuple[str, dict]:
    _, worker, state = await _identify_user(source_phone, state)
    if not worker:
        return ("Worker profile nahi mila.", state)
    pincode = (worker.get("address") or {}).get("pincode") or "Set nahi hai"
    return (
        f"📍 Aapka pincode: *{pincode}*\n\n" f"Change karne ke liye: *PINCODE 841219*",
        state,
    )


# ─── Customer command handlers ────────────────────────────────────────────────


def _bot_reply_customer(state: dict, message: str) -> tuple[str, dict]:
    """Pure state machine for customer flow."""
    msg = message.strip().lower()
    step = state.get("step", "start")

    if msg in ("reset", "restart", "menu"):
        return (
            "Namaste! KaamNow mein aapka swagat hai 🙏\n\n"
            "1️⃣ Mujhe workers chahiye\n2️⃣ Main worker hun\n\n"
            "Reply 1 ya 2.",
            {"step": "intent", "role": state.get("role"), "user_id": state.get("user_id")},
        )

    if step in ("start",):
        return (
            "Namaste! KaamNow mein aapka swagat hai 🙏\n\n"
            "1️⃣ Mujhe workers chahiye\n2️⃣ Main worker hun\n\n"
            "Reply 1 ya 2.",
            {"step": "intent", "role": state.get("role"), "user_id": state.get("user_id")},
        )

    if step == "intent":
        if msg == "1":
            return (
                "Kaun sa kaam chahiye?\n\n"
                "1. Kheti (farm)\n2. Construction\n3. Electrical\n4. Safai\n5. Transport\n6. Other",
                {**state, "step": "category"},
            )
        if msg == "2":
            return (
                "Worker hain aap! 👷\n\n"
                "JOBS – Kaam dhundhen\nHELP – Madad\n\n"
                "Pehle register karein: kaamnow.com/worker/onboarding",
                {**state, "step": "start"},
            )
        return ("1 ya 2 reply karein.", state)

    if step == "category":
        cats = {
            "1": "farm",
            "2": "construction",
            "3": "electrical",
            "4": "cleaning",
            "5": "transport",
            "6": "other",
        }
        if msg in cats:
            return (
                f"{cats[msg].title()} – kitne workers chahiye? (1–20)",
                {**state, "step": "count", "category": cats[msg]},
            )
        return ("1 se 6 mein se reply karein.", state)

    if step == "count":
        try:
            n = int(msg)
            if 1 <= n <= 20:
                return (
                    f"{n} worker(s). Kab chahiye?\n1. Aaj\n2. Kal\n3. Parso",
                    {**state, "step": "date", "count": n},
                )
        except ValueError:
            pass
        return ("1 se 20 ke beech number bhejein.", state)

    if step == "date":
        labels = {"1": "Today", "2": "Tomorrow", "3": "Day after"}
        if msg in labels:
            return (
                "Kaunsa village ya area? (naam type karein)",
                {**state, "step": "village", "when": labels[msg]},
            )
        return ("1, 2 ya 3 reply karein.", state)

    return ("MENU type karein naya request karne ke liye.", {"step": "start"})


# ─── WhatsApp onboarding ──────────────────────────────────────────────────────

_SKILL_MAP = {
    1: ["harvesting", "weeding", "transplanting"],
    2: ["mason", "carpentry", "painting", "plumbing"],
    3: ["electrical", "wiring"],
    4: ["cleaning", "domestic help"],
    5: ["driver", "loading"],
    6: ["helper", "digging"],
}
_CATEGORY_MAP = {
    1: "Farm",
    2: "Construction",
    3: "Construction",
    4: "Home",
    5: "Transport",
    6: "Other",
}


async def _finish_customer_onboard(source_phone: str, state: dict) -> tuple[str, dict]:
    phone_info = normalize_whatsapp_phone(source_phone)
    phone_stored = phone_info["e164"]  # consistent with app-registered users
    existing = await _lookup_user_by_phone(source_phone)
    if existing:
        return await _registered_customer_hi(
            source_phone,
            {
                "step": "customer_menu",
                "user_id": existing["id"],
                "role": existing.get("role", "customer"),
            },
            existing,
        )
    address = {
        "village": state["wa_village"],
        "district": state["wa_district"],
        "state": state["wa_state"],
        "block": state.get("wa_block", ""),
        "pincode": state["wa_pincode"],
    }
    user_id = str(uuid.uuid4())
    await db.users.insert_one(
        {
            "id": user_id,
            "phone_primary": phone_stored,
            "phone_verified": True,
            "name": state["wa_name"],
            "role": "customer",
            "password_hash": None,
            "pincode": state["wa_pincode"],
            "village": state["wa_village"],
            "address": address,
            "photo_url": None,
            "preferred_language": "hi",
            "avatar_color": _generate_avatar_color(state["wa_name"]),
            "created_at": utc_now_iso(),
            "migration_status": "phone_primary",
            "source": "whatsapp",
        }
    )
    user_doc = {
        "id": user_id,
        "name": state["wa_name"],
        "role": "customer",
        "pincode": state["wa_pincode"],
        "address": address,
    }
    reply, next_state = await _registered_customer_hi(
        source_phone,
        {"step": "customer_menu", "user_id": user_id, "role": "customer"},
        user_doc,
    )
    return (f"🎉 *Swagat hai {state['wa_name']}!*\n\nAccount ban gaya ✅\n\n{reply}", next_state)


async def _finish_worker_onboard(source_phone: str, state: dict) -> tuple[str, dict]:
    phone_info = normalize_whatsapp_phone(source_phone)
    phone_stored = phone_info["e164"]
    existing_user = await _lookup_user_by_phone(source_phone)
    if existing_user:
        user_id = existing_user["id"]
        existing_worker = await db.workers.find_one({"user_id": user_id})
        if existing_worker:
            return await _registered_worker_hi(
                source_phone,
                {
                    "step": "worker_menu",
                    "user_id": user_id,
                    "worker_id": existing_worker["id"],
                    "role": "worker",
                },
                existing_user,
                existing_worker,
            )
    else:
        user_id = str(uuid.uuid4())
        address = {
            "village": state["wa_village"],
            "district": state["wa_district"],
            "state": state["wa_state"],
            "block": state.get("wa_block", ""),
            "pincode": state["wa_pincode"],
        }
        await db.users.insert_one(
            {
                "id": user_id,
                "phone_primary": phone_stored,
                "phone_verified": True,
                "name": state["wa_name"],
                "role": "worker",
                "password_hash": None,
                "pincode": state["wa_pincode"],
                "village": state["wa_village"],
                "address": address,
                "photo_url": None,
                "preferred_language": "hi",
                "avatar_color": _generate_avatar_color(state["wa_name"]),
                "created_at": utc_now_iso(),
                "migration_status": "phone_primary",
                "source": "whatsapp",
            }
        )
    worker_id = str(uuid.uuid4())
    address = {
        "village": state["wa_village"],
        "district": state["wa_district"],
        "state": state["wa_state"],
        "block": state.get("wa_block", ""),
        "pincode": state["wa_pincode"],
    }
    await db.workers.insert_one(
        {
            "id": worker_id,
            "user_id": user_id,
            "name": state["wa_name"],
            "skills": state["wa_skills"],
            "structured_skills": state["wa_structured_skills"],
            "daily_rate": state["wa_rate"],
            "village": state["wa_village"],
            "district": state["wa_district"],
            "state": state["wa_state"],
            "address": address,
            "lat": 0.0,
            "lng": 0.0,
            "available": True,
            "availability_status": "available",
            "trust_tier": 1,
            "avg_rating": 0.0,
            "total_jobs": 0,
            "photo_url": None,
            "bio": "",
            "created_at": utc_now_iso(),
            "source": "whatsapp",
        }
    )
    user_doc = {
        "id": user_id,
        "name": state["wa_name"],
        "role": "worker",
        "pincode": state["wa_pincode"],
        "address": address,
    }
    worker_doc = {
        "id": worker_id,
        "user_id": user_id,
        "name": state["wa_name"],
        "skills": state["wa_skills"],
        "structured_skills": state["wa_structured_skills"],
        "daily_rate": state["wa_rate"],
        "village": state["wa_village"],
        "district": state["wa_district"],
        "state": state["wa_state"],
        "address": address,
        "lat": 0.0,
        "lng": 0.0,
    }
    reply, next_state = await _registered_worker_hi(
        source_phone,
        {"step": "worker_menu", "user_id": user_id, "worker_id": worker_id, "role": "worker"},
        user_doc,
        worker_doc,
    )
    return (
        f"🎉 *Profile ban gaya {state['wa_name']}!*\n\n"
        f"👷 Worker Account ✅\n"
        f"📍 {state['wa_village']}, {state['wa_district']}, {state['wa_state']}\n"
        f"💰 ₹{state['wa_rate']}/day\n\n"
        f"{reply}",
        next_state,
    )


async def _cmd_onboard(source_phone: str, message: str, state: dict) -> tuple[str, dict]:
    """State machine for WhatsApp onboarding. Steps prefixed wa_ob_."""
    msg = message.strip()
    msg_up = msg.upper()
    step = state.get("step", "wa_ob_role")

    if step == "wa_ob_role":
        if msg == "1" or msg_up == "CUSTOMER":
            return (
                "Aapka poora naam kya hai?",
                {**state, "step": "wa_ob_name", "wa_role": "customer"},
            )
        if msg == "2" or msg_up == "WORKER":
            return (
                "Aapka poora naam kya hai?",
                {**state, "step": "wa_ob_name", "wa_role": "worker"},
            )
        return (
            "Namaste! KaamNow par aapka swagat hai. Aap kya karna chahte hain?\n\n"
            "- Mujhe worker chahiye\n"
            "- Mujhe kaam chahiye\n"
            "- Help\n\n"
            "Reply: *CUSTOMER* or *WORKER*",
            _with_reply_buttons(state, _BUTTONS_UNREGISTERED),
        )

    if step == "wa_ob_name":
        if len(msg.strip()) < 2:
            return ("Naam kam se kam 2 characters ka hona chahiye. Dobara bhejein:", state)
        return (
            "Aapka area ka *pincode* kya hai? (6 digits)",
            {**state, "step": "wa_ob_pincode", "wa_name": msg.strip()},
        )

    if step == "wa_ob_pincode":
        if not msg.isdigit() or len(msg) != 6:
            return ("Sahi 6-digit pincode bhejein. Example: *411001*", state)
        result = await _lookup_pincode(msg)
        if not result:
            return ("Yeh pincode nahi mila. Sahi pincode bhejein:", state)
        new_state = {
            **state,
            "step": "wa_ob_village",
            "wa_pincode": msg,
            "wa_district": result["district"],
            "wa_state": result["state"],
            "wa_block": result["block"],
            "wa_post": result["post"],
        }
        return (
            f"✅ *{result['district']} District · {result['state']}*\n\n"
            f"Apna village ya area ka naam type karein:",
            new_state,
        )

    if step == "wa_ob_village":
        if len(msg.strip()) < 2:
            return ("Village ka naam kam se kam 2 characters ka hona chahiye:", state)
        new_state = {**state, "wa_village": msg.strip()}
        if state.get("wa_role") == "worker":
            new_state["step"] = "wa_ob_rate"
            return ("Daily rate kitna chahiye? (₹ mein, 100–5000)\nExample: *600*", new_state)
        return await _finish_customer_onboard(source_phone, new_state)

    if step == "wa_ob_rate":
        if not msg.isdigit() or not (100 <= int(msg) <= 5000):
            return ("100 se 5000 ke beech rate bhejein. Example: *600*", state)
        new_state = {**state, "step": "wa_ob_skills", "wa_rate": int(msg)}
        return (
            "Kaunsa kaam karte hain? Number(s) bhejein:\n\n"
            "1️⃣ Kheti / Farm\n"
            "2️⃣ Construction / Nirman\n"
            "3️⃣ Electrical\n"
            "4️⃣ Safai / Cleaning\n"
            "5️⃣ Transport / Driving\n"
            "6️⃣ Other / Helper\n\n"
            "Ek ya zyada: e.g. *2* ya *2,3*",
            new_state,
        )

    if step == "wa_ob_skills":
        nums = []
        for part in msg.replace(" ", ",").split(","):
            part = part.strip()
            if part.isdigit() and 1 <= int(part) <= 6:
                nums.append(int(part))
        if not nums:
            return ("Kam se kam ek number bhejein (1–6). Example: *2* ya *2,3*", state)
        skills = [s for n in nums for s in _SKILL_MAP[n]]
        structured = [
            {"category": _CATEGORY_MAP[n], "skill": s} for n in nums for s in _SKILL_MAP[n]
        ]
        new_state = {**state, "wa_skills": skills, "wa_structured_skills": structured}
        return await _finish_worker_onboard(source_phone, new_state)

    # Fallback: restart onboarding
    return (
        "Namaste! KaamNow par aapka swagat hai. Aap kya karna chahte hain?\n\n"
        "- Mujhe worker chahiye\n"
        "- Mujhe kaam chahiye\n"
        "- Help\n\n"
        "Reply: *CUSTOMER* or *WORKER*",
        _with_reply_buttons({"step": "wa_ob_role"}, _BUTTONS_UNREGISTERED),
    )


# ─── Main message dispatcher ──────────────────────────────────────────────────


async def _handle_message(source_phone: str, message_text: str, state: dict) -> tuple[str, dict]:
    original_raw = message_text.strip()
    normalized_text = _normalize_inbound_text(original_raw)
    raw = _TYPED_BUTTON_ALIASES.get(normalized_text, original_raw)
    msg_up = raw.upper()
    msg_low = raw.lower()
    is_greeting = normalized_text in _GREETING_ALIASES

    # ── Universal commands ──
    if msg_up in ("HELP", "?", "MADAD"):
        role = state.get("role")
        if role == "worker":
            return (_HELP_WORKER, state)
        elif role == "customer":
            return (_HELP_CUSTOMER, state)
        else:
            return (
                "KaamNow mein swagat hai 🙏\n\nRegister karein: kaamnow.com/signup\n\n"
                + _HELP_WORKER,
                state,
            )

    if normalized_text in ("menu", "reset", "start"):
        # Clear job browsing state, keep identity
        clean_state = {k: v for k, v in state.items() if k in ("user_id", "worker_id", "role")}
        clean_state["step"] = "start"
        return await _handle_message(source_phone, "hi", clean_state)

    if msg_up == "CHANGE_PINCODE":
        role = state.get("role")
        next_state = {
            **state,
            "step": "awaiting_pincode",
            "awaiting_pincode_for": role or "unknown",
        }
        return ("Kaunsa pincode dekhna hai? 6-digit pincode bhejein.", next_state)

    if msg_up.startswith("JOB:") or msg_up.startswith("JOB_DETAIL:"):
        job_id = raw.split(":", 1)[1].strip()
        return await _show_job_detail_by_id(source_phone, job_id, state)

    if msg_up.startswith("WORKER:") or msg_up.startswith("WORKER_DETAIL:"):
        worker_id = raw.split(":", 1)[1].strip()
        return await _show_worker_detail_by_id(source_phone, worker_id, state)

    if msg_up.startswith("APPLY:"):
        job_id = raw.split(":", 1)[1].strip()
        job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
        if not job:
            return ("Job nahi mila. MORE ya JOBS try karein.", state)
        return await _cmd_apply(
            source_phone,
            {**state, "viewed_job": job, "selected_job_id": job_id, "step": "viewing_job_detail"},
        )

    # ── Identify user on first contact (or if identity not in state) ──
    user, worker, state = await _identify_user(source_phone, state)

    if msg_up.startswith("BOOK_JOB:"):
        if not user or user.get("role") != "customer":
            return ("Sirf registered customer worker request bhej sakte hain.", state)
        parts = raw.split(":")
        if len(parts) < 3:
            return ("Job selection samajh nahi aaya. Dobara try karein.", state)
        return await _confirm_customer_booking(source_phone, state, user, parts[2], parts[1])

    if msg_up.startswith("REQUEST:") or msg_up == "REQUEST_WORKER":
        worker_id = raw.split(":", 1)[1].strip() if ":" in raw else state.get("selected_worker_id")
        return await _request_selected_worker(source_phone, state, user, worker_id)

    if msg_up == "POST_JOB_START":
        if not user or user.get("role") != "customer":
            return ("Sirf registered customer job post kar sakte hain.", state)
        return await _start_customer_post_job(state)

    if msg_up == "OPEN_APP":
        return (
            "App/web par job post karein: https://kaamnow.com",
            _with_reply_buttons(state, _BUTTONS_CUSTOMER_RESULTS),
        )

    if msg_up == "CREATE_JOB_CONFIRM":
        if not user or user.get("role") != "customer":
            return ("Sirf registered customer job post kar sakte hain.", state)
        return await _create_job_from_whatsapp(state, user)

    if state.get("step") == "awaiting_pincode" and raw.isdigit() and len(raw) == 6:
        if state.get("role") == "worker":
            return await _cmd_set_pincode(source_phone, raw, state)
        if user:
            address = dict((user or {}).get("address") or {})
            address["pincode"] = raw
            await db.users.update_one(
                {"id": user["id"]}, {"$set": {"pincode": raw, "address": address}}
            )
        return await _customer_workers_for_pincode(source_phone, state, raw)

    if not user:
        if (
            msg_up.startswith("REQUEST")
            or msg_up.startswith("BOOK_JOB")
            or msg_up == "POST_JOB_START"
        ):
            return (
                "Pehle KaamNow par register karein, phir worker request bhej sakte hain.",
                state,
            )
        # If mid-onboarding, continue the flow
        if state.get("step", "").startswith("wa_ob_"):
            return await _cmd_onboard(source_phone, raw, state)
        # Any message from unknown number → start onboarding
        logger.info(
            "WhatsApp flow=unregistered_onboarding role=none phone=%s", _mask_phone(source_phone)
        )
        return (
            "Namaste! KaamNow par aapka swagat hai. Aap kya karna chahte hain?\n\n"
            "- Mujhe worker chahiye\n"
            "- Mujhe kaam chahiye\n"
            "- Help\n\n"
            "Reply: *CUSTOMER* or *WORKER*",
            _with_reply_buttons({"step": "wa_ob_role"}, _BUTTONS_UNREGISTERED),
        )

    # ── Worker commands ──
    if state.get("role") == "worker":
        if msg_up.startswith("REQUEST") or msg_up.startswith("BOOK_JOB"):
            return ("Sirf customers worker request bhej sakte hain.", state)

        worker_command_like = (
            msg_up
            in (
                "JOBS",
                "KAAM",
                "FIND JOBS",
                "FIND WORK",
                "MORE",
                "APPLY",
                "APPLY_JOB",
                "STATUS",
                "MY STATUS",
                "MERI STATUS",
                "WITHDRAW",
                "WAPAS",
                "CANCEL",
                "WITHDRAW_CONFIRM",
            )
            or msg_up.startswith(("JOBS ", "KAAM ", "JOB ", "PINCODE", "WITHDRAW_CONFIRM:"))
            or raw.isdigit()
        )
        if is_greeting or (
            state.get("step") in ("start", None, "unregistered") and not worker_command_like
        ):
            return await _registered_worker_hi(source_phone, state, user, worker)

        # JOBS / KAAM [category]
        if msg_up in ("JOBS", "KAAM", "FIND JOBS", "FIND WORK"):
            return await _cmd_jobs(source_phone, state)
        if msg_up.startswith("JOBS ") or msg_up.startswith("KAAM "):
            arg = raw.split(None, 1)[1].strip() if len(raw.split(None, 1)) > 1 else ""
            # "JOBS 841219" → temporary pincode search (6 digits, no letters)
            if arg.isdigit() and len(arg) == 6:
                return await _cmd_jobs(source_phone, state, pincode_filter=arg)
            # "JOBS farm" → category filter
            return await _cmd_jobs(source_phone, state, category=arg.lower() if arg else None)

        if msg_up.startswith("JOB "):
            job_id = raw.split(None, 1)[1].strip()
            return await _show_job_detail_by_id(source_phone, job_id, state)

        # MORE (next page of jobs) — carries forward category AND temp pincode filter
        if msg_up == "MORE":
            offset = state.get("job_offset", 5)
            cat = state.get("job_category")
            pin = state.get("job_pincode_filter")
            return await _cmd_jobs(
                source_phone, state, category=cat, offset=offset, pincode_filter=pin
            )

        # Numbered job selection (when job list is shown)
        if raw.isdigit() and state.get("step") == "job_list":
            return await _cmd_job_detail(source_phone, int(raw), state)

        # Numbered job selection (for quick re-apply from any state)
        if (
            raw.isdigit()
            and state.get("job_list")
            and 1 <= int(raw) <= len(state.get("job_list", []))
        ):
            return await _cmd_job_detail(source_phone, int(raw), state)

        # APPLY
        if msg_up in ("APPLY", "APPLY_JOB", "INTERESTED", "RUCHI HAI", "INTEREST"):
            return await _cmd_apply(source_phone, state)

        # WITHDRAW
        if msg_up in ("WITHDRAW", "WAPAS", "CANCEL"):
            return await _cmd_withdraw(source_phone, state)

        if msg_up.startswith("WITHDRAW_CONFIRM:"):
            engagement_id = raw.split(":", 1)[1].strip()
            return await _cmd_withdraw_confirm(source_phone, state, engagement_id)

        if msg_up == "WITHDRAW_CONFIRM":
            return await _cmd_withdraw_confirm(source_phone, state)

        if raw.isdigit() and state.get("step") == "choose_withdraw_application":
            pending = state.get("pending_withdraw_results") or []
            idx = int(raw) - 1
            if 0 <= idx < len(pending):
                engagement_id = pending[idx]["id"]
                return (
                    f"Is application ko withdraw karna hai?\n\n{pending[idx].get('job_title', 'Job')}",
                    _with_reply_buttons(
                        {
                            **state,
                            "step": "confirm_withdraw",
                            "withdraw_engagement_id": engagement_id,
                        },
                        _BUTTONS_WORKER_WITHDRAW_CONFIRM,
                    ),
                )
            return (f"Number 1–{len(pending)} bhejein.", state)

        # STATUS
        if msg_up in ("STATUS", "MY STATUS", "MERI STATUS"):
            return await _cmd_status(source_phone, state)

        if raw.isdigit() and len(raw) == 6 and state.get("step") == "awaiting_pincode":
            return await _cmd_set_pincode(source_phone, raw, state)

        # PINCODE 841219
        if msg_up.startswith("PINCODE"):
            parts = raw.split()
            pincode_val = parts[1] if len(parts) > 1 else ""
            if not pincode_val:
                return await _cmd_show_pincode(source_phone, state)
            return await _cmd_set_pincode(source_phone, pincode_val, state)

        # ACCEPT booking
        if msg_up == "ACCEPT":
            eng = await db.engagements.find_one(
                {"worker_id": state.get("worker_id"), "status": "requested"},
                sort=[("created_at", -1)],
            )
            if not eng:
                return ("Koi pending booking nahi mili.", state)

            now = utc_now_iso()
            await db.engagements.update_one(
                {"id": eng["id"]},
                {"$set": {"status": "accepted", "accepted_at": now, "updated_at": now}},
            )
            updated_job = await db.jobs.find_one_and_update(
                {"id": eng["job_id"]},
                {
                    "$push": {"accepted_worker_ids": state.get("worker_id")},
                    "$inc": {"filled_count": 1},
                },
                return_document=True,
            )
            if updated_job and updated_job.get("filled_count", 0) >= updated_job.get(
                "workers_needed", 1
            ):
                await db.jobs.update_one({"id": eng["job_id"]}, {"$set": {"status": "booked"}})

            customer_user = await db.users.find_one({"id": eng["customer_id"]}, {"_id": 0})
            if customer_user and customer_user.get("phone"):
                threading.Thread(
                    target=notify_customer_booking_accepted,
                    args=(customer_user["phone"], eng),
                    daemon=True,
                ).start()

            return (
                f"✅ *Booking accept kar liya!*\n\n"
                f"Job: {eng.get('job_title')}\n"
                f"Customer ko WhatsApp bhej diya.\n\n"
                f"STATUS – Meri bookings",
                state,
            )

        # REJECT booking
        if msg_up in ("REJECT", "DECLINE", "NAHI", "NO"):
            eng = await db.engagements.find_one(
                {"worker_id": state.get("worker_id"), "status": "requested"},
                sort=[("created_at", -1)],
            )
            if not eng:
                return ("Koi pending booking nahi mili.", state)

            now = utc_now_iso()
            await db.engagements.update_one(
                {"id": eng["id"]},
                {"$set": {"status": "rejected", "rejected_at": now, "updated_at": now}},
            )
            await db.jobs.update_one(
                {"id": eng["job_id"], "status": "booked"},
                {"$set": {"status": "open"}},
            )

            customer_user = await db.users.find_one({"id": eng["customer_id"]}, {"_id": 0})
            if customer_user and customer_user.get("phone"):
                threading.Thread(
                    target=notify_customer_booking_rejected,
                    args=(customer_user["phone"], eng),
                    daemon=True,
                ).start()

            return (
                f"↩️ *Booking reject kar diya.*\n\n"
                f"Customer ko inform kar diya. Unka kaam wapas open ho gaya.\n\n"
                f"JOBS – Aur kaam dhundhen",
                state,
            )

        # Unknown command for worker
        return (
            "Samajh nahi aaya. 🙏\n\nJOBS – Kaam dhundhen\nHELP – Sabhi commands",
            _with_reply_buttons(state, _BUTTONS_WORKER_MENU),
        )

    # ── Customer commands ──
    if state.get("role") == "customer":
        step = state.get("step", "start")

        if step in (
            "customer_post_job_skill",
            "customer_post_job_pincode",
            "customer_post_job_rate",
            "customer_post_job_workers_needed",
        ):
            return await _handle_customer_post_job(source_phone, raw, state, user)

        if step == "customer_post_job_confirm" and msg_up not in (
            "CREATE_JOB_CONFIRM",
            "MENU",
            "RESET",
            "START",
        ):
            return (
                _post_job_summary(state.get("post_job") or {}),
                _with_reply_buttons(state, _BUTTONS_POST_JOB_CONFIRM),
            )

        if is_greeting or step in ("start", None):
            return await _registered_customer_hi(source_phone, state, user, worker)

        if msg_up == "STATUS":
            return await _cmd_customer_status(user, state)

        if msg_up in ("WORKERS", "FIND WORKERS"):
            return await _registered_customer_hi(source_phone, state, user, worker)

        if msg_up == "MORE":
            return await _customer_more_workers(source_phone, state)

        if msg_up.startswith("PINCODE"):
            parts = raw.split()
            pincode_val = parts[1] if len(parts) > 1 else ""
            if not pincode_val:
                return ("Kisi aur pincode mein worker chahiye? Reply: PINCODE 841219", state)
            if not pincode_val.isdigit() or len(pincode_val) != 6:
                return ("Valid 6-digit pincode bhejein. Example: *PINCODE 841219*", state)
            return await _customer_workers_for_pincode(source_phone, state, pincode_val)

        if raw.isdigit() and len(raw) == 6 and step == "awaiting_pincode":
            if user:
                address = dict((user or {}).get("address") or {})
                address["pincode"] = raw
                await db.users.update_one(
                    {"id": user["id"]}, {"$set": {"pincode": raw, "address": address}}
                )
            return await _customer_workers_for_pincode(source_phone, state, raw)

        if raw.isdigit() and step == "choose_booking_job":
            jobs = state.get("last_customer_open_jobs") or []
            idx = int(raw) - 1
            if 0 <= idx < len(jobs):
                worker_id = state.get("selected_worker_id")
                return await _confirm_customer_booking(
                    source_phone, state, user, worker_id, jobs[idx]["id"]
                )
            return (f"Number 1–{len(jobs)} bhejein.", state)

        if (
            raw.isdigit()
            and state.get("worker_list")
            and 1 <= int(raw) <= len(state.get("worker_list", []))
        ):
            selected_worker = state["worker_list"][int(raw) - 1]
            return await _show_worker_detail_by_id(source_phone, selected_worker.get("id"), state)

        if msg_up.startswith("WORKER "):
            worker_id = raw.split(None, 1)[1].strip()
            return await _show_worker_detail_by_id(source_phone, worker_id, state)

        # Village step (with DB lookup)
        if step == "village":
            return await _handle_village(source_phone, raw, state)

        # Select worker step (with DB)
        if step == "select":
            return await _handle_select(source_phone, raw, state)

        # Pure state machine for all other customer steps
        reply, new_state = _bot_reply_customer(state, message_text)
        if new_state.get("step") in ("start", "customer_menu", "intent"):
            new_state = _with_reply_buttons(new_state, _BUTTONS_CUSTOMER_MENU)
        return (reply, new_state)

    # ── Unknown role fallback ──
    return (
        "Aapka account linked nahi ho saka. kaamnow.com/signup par register karein.\nHELP type karein.",
        state,
    )


# ─── Customer village/select handlers (unchanged from v1) ─────────────────────


async def _handle_village(source_phone: str, village: str, state: dict) -> tuple[str, dict]:
    workers = (
        await db.workers.find(
            {"village": {"$regex": village.strip(), "$options": "i"}, "available": True},
            {"_id": 0, "id": 1, "name": 1, "daily_rate": 1, "skills": 1, "user_id": 1},
        )
        .limit(5)
        .to_list(5)
    )

    if not workers:
        workers = (
            await db.workers.find(
                {"available": True},
                {"_id": 0, "id": 1, "name": 1, "daily_rate": 1, "skills": 1, "user_id": 1},
            )
            .limit(5)
            .to_list(5)
        )

    if not workers:
        return (
            "Is area mein abhi koi worker nahi mila. kaamnow.com/marketplace par dekhein.",
            {**state, "step": "start"},
        )

    lines = [f"✅ {len(workers)} worker(s) mile {village} ke paas:\n"]
    for i, w in enumerate(workers, 1):
        skills_str = ", ".join(w.get("skills", [])[:3]) or "General"
        lines.append(f"{i}. {w['name']} — ₹{w.get('daily_rate', '?')}/day | {skills_str}")
    lines.append("\nKaunsa worker chahiye? Number bhejein (e.g. 1 ya 1,2)")

    return (
        "\n".join(lines),
        {**state, "step": "select", "village": village, "workers_snapshot": workers},
    )


async def _handle_select(source_phone: str, selection: str, state: dict) -> tuple[str, dict]:
    workers_snapshot = state.get("workers_snapshot", [])
    if not workers_snapshot:
        return ("Kuch galat ho gaya. MENU type karein.", {"step": "start"})

    try:
        indices = [
            int(x.strip()) - 1 for x in selection.replace(",", " ").split() if x.strip().isdigit()
        ]
        selected = [workers_snapshot[i] for i in indices if 0 <= i < len(workers_snapshot)]
    except (ValueError, IndexError):
        selected = []

    if not selected:
        return (f"Number 1–{len(workers_snapshot)} bhejein.", state)

    customer = await _lookup_user_by_phone(source_phone)
    if not customer:
        phone_digits = _normalize_phone(source_phone)
        guest_doc = {
            "id": str(uuid.uuid4()),
            "phone_primary": phone_digits,
            "phone_verified": True,
            "name": f"Customer ({phone_digits[-4:]})",
            "role": "customer",
            "created_at": utc_now_iso(),
            "source": "whatsapp",
            "is_guest": True,
            "migration_status": "phone_primary",
        }
        await db.users.insert_one(dict(guest_doc))
        customer = guest_doc
    elif customer.get("role") != "customer":
        return ("Sirf customers booking kar sakte hain.", {"step": "start"})

    today = date.today()
    date_map = {
        "Today": str(today),
        "Tomorrow": str(today + timedelta(days=1)),
        "Day after": str(today + timedelta(days=2)),
    }
    job_date = date_map.get(state.get("when", ""), str(today))
    category = state.get("category", "General")
    village = state.get("village", "")
    count = state.get("count", 1)

    job_id = str(uuid.uuid4())
    job_doc = {
        "id": job_id,
        "customer_id": customer["id"],
        "customer_name": customer.get("name", "Customer"),
        "title": f"{category} workers needed",
        "category": category,
        "description": f"WhatsApp se booking. {count} worker(s) {village} mein.",
        "workers_needed": count,
        "daily_rate": selected[0].get("daily_rate", 500),
        "job_date": job_date,
        "village": village,
        "lat": 0.0,
        "lng": 0.0,
        "status": "open",
        "filled_count": 0,
        "accepted_worker_ids": [],
        "required_skills": [],
        "address": {"village": village},
        "created_at": utc_now_iso(),
        "source": "whatsapp",
    }
    await db.jobs.insert_one(job_doc)

    booked_names = []
    for w in selected:
        now = utc_now_iso()
        engagement = {
            "id": str(uuid.uuid4()),
            "job_id": job_id,
            "worker_id": w["id"],
            "customer_id": customer["id"],
            "source": "customer_booking",
            "status": "requested",
            "worker_name": w.get("name", "Worker"),
            "customer_name": customer.get("name", "Customer"),
            "job_title": job_doc["title"],
            "job_date": job_date,
            "daily_rate": w.get("daily_rate"),
            "worker_rating": None,
            "customer_rating": None,
            "created_by": customer["id"],
            "created_at": now,
            "updated_at": now,
        }
        await db.engagements.insert_one(engagement)
        booked_names.append(w.get("name", "Worker"))

        worker_user = await db.users.find_one({"id": w.get("user_id")}, {"_id": 0})
        if worker_user and worker_user.get("phone"):
            threading.Thread(
                target=notify_worker_new_booking,
                args=(worker_user["phone"], engagement),
                daemon=True,
            ).start()

    names = ", ".join(booked_names)
    return (
        f"🎉 Request bhej diya: {names}\n\n"
        f"📋 {category} | 📅 {job_date} | 📍 {village}\n\n"
        f"Workers 2 ghante mein confirm karenge. WhatsApp par update aayega!",
        {**state, "step": "start"},
    )


# ─── Gupshup API helpers ──────────────────────────────────────────────────────


def _format_gupshup_message(payload: Any) -> str:
    if isinstance(payload, dict):
        message = payload.get("message")
        if isinstance(message, dict):
            return (
                message.get("text")
                or message.get("payload")
                or message.get("caption")
                or message.get("body")
                or ""
            )
        if isinstance(message, str):
            return message
        for key in ("text", "payload", "body"):
            val = payload.get(key)
            if isinstance(val, str):
                return val
            if isinstance(val, dict):
                nested = val.get("message")
                if isinstance(nested, dict):
                    return nested.get("text") or nested.get("payload") or nested.get("body") or ""
        return ""
    return str(payload)


def _normalize_button_action(value: str) -> str:
    action = str(value or "").strip()
    action_up = action.upper()
    mapping = {
        "CUSTOMER": "CUSTOMER",
        "WORKER": "WORKER",
        "CHANGE_PINCODE": "CHANGE_PINCODE",
        "MORE": "MORE",
        "HELP": "HELP",
        "STATUS": "STATUS",
        "JOBS": "JOBS",
        "WORKERS": "WORKERS",
    }
    return mapping.get(action_up, action)


def _extract_button_reply_text(body: dict) -> str:
    candidates: list[Any] = []
    inner = body.get("payload") if isinstance(body.get("payload"), dict) else {}
    payloads = [
        body,
        inner,
        body.get("message") if isinstance(body.get("message"), dict) else {},
        inner.get("payload") if isinstance(inner.get("payload"), dict) else {},
        inner.get("message") if isinstance(inner.get("message"), dict) else {},
    ]
    for item in payloads:
        if not isinstance(item, dict):
            continue
        item_type = str(item.get("type") or "").lower()
        nested = item.get("payload")
        nested_dict = nested if isinstance(nested, dict) else {}
        if item_type in ("button_reply", "quick_reply", "list_reply", "list"):
            candidates.extend(
                [
                    nested_dict.get("id"),
                    nested_dict.get("postbackText"),
                    nested_dict.get("text"),
                    nested_dict.get("title"),
                    item.get("id"),
                    item.get("postbackText"),
                    item.get("text"),
                    item.get("title"),
                ]
            )
        interactive = item.get("interactive") if isinstance(item.get("interactive"), dict) else {}
        button_reply = (
            interactive.get("button_reply")
            if isinstance(interactive.get("button_reply"), dict)
            else {}
        )
        if button_reply:
            candidates.extend([button_reply.get("id"), button_reply.get("title")])
        list_reply = (
            interactive.get("list_reply") if isinstance(interactive.get("list_reply"), dict) else {}
        )
        if list_reply:
            candidates.extend([list_reply.get("id"), list_reply.get("title")])
        if str(interactive.get("type") or "").lower() in (
            "button_reply",
            "quick_reply",
            "list_reply",
            "list",
        ):
            candidates.extend(
                [
                    interactive.get("id"),
                    interactive.get("title"),
                    interactive.get("postbackText"),
                    interactive.get("text"),
                ]
            )

    for candidate in candidates:
        if candidate:
            return _normalize_button_action(str(candidate))
    return ""


def _extract_gupshup_incoming(body: dict) -> tuple[str, str]:
    """
    Handles multiple Gupshup payload formats:
    - Standard: {"type":"message","payload":{"source":"91XX","payload":{"text":"hi"},"sender":{...}}}
    - Legacy:   {"src":"91XX","message":{"text":"hi"}}
    - Form-flat: {"source":"91XX","text":"hi"}
    """
    inner = body.get("payload") if isinstance(body.get("payload"), dict) else {}

    # ── Extract source phone ──
    src = (
        body.get("src")
        or body.get("source")
        or body.get("from")
        or inner.get("source")
        or inner.get("src")
    )
    # Try sender dict at top level or inside payload
    for loc in (body, inner):
        if src:
            break
        sender = loc.get("sender")
        if isinstance(sender, dict):
            src = sender.get("phone") or sender.get("id")
        elif sender and isinstance(sender, str):
            src = sender

    # ── Extract message text ──
    text = _extract_button_reply_text(body) or _format_gupshup_message(body)

    if not text:
        # Gupshup standard: payload.payload.text
        msg_inner = inner.get("payload") or inner.get("message")
        if isinstance(msg_inner, dict):
            text = msg_inner.get("text") or msg_inner.get("body") or msg_inner.get("caption") or ""
        elif isinstance(msg_inner, str):
            text = msg_inner

    if not text and isinstance(body.get("message"), dict):
        m = body["message"]
        text = m.get("text") or m.get("payload") or m.get("body") or ""

    if not text:
        # Last resort: try _format_gupshup_message on the inner payload dict
        text = _extract_button_reply_text(inner) or _format_gupshup_message(inner)

    if not src:
        raise ValueError(
            f"Invalid Gupshup payload — src={src!r} text={text!r} body_keys={list(body.keys())}"
        )
    return str(src), text or ""


def _send_gupshup_text(destination: str, text: str) -> dict:
    if not settings.gupshup_api_url or not settings.gupshup_api_key or not settings.gupshup_source:
        raise RuntimeError("Gupshup settings are not configured")

    payload = {
        "channel": settings.gupshup_channel,
        "source": settings.gupshup_source,
        "destination": _full_phone(destination),
        "message": json.dumps({"type": "text", "text": text}),
    }
    if getattr(settings, "gupshup_app_id", None):
        payload["src.name"] = settings.gupshup_app_id

    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": settings.gupshup_api_key,
    }
    resp = requests.post(settings.gupshup_api_url, data=payload, headers=headers, timeout=10)
    resp.raise_for_status()
    try:
        return resp.json()
    except ValueError:
        return {"text": resp.text}


def _button_fallback_text(body_text: str, buttons: list[dict]) -> str:
    ids = [str(button.get("id") or "").strip() for button in buttons if button.get("id")]
    return f"{body_text}\n\nReply: {', '.join(ids)}"


def _send_gupshup_buttons(destination: str, body_text: str, buttons: list[dict]) -> dict:
    if not settings.gupshup_api_url or not settings.gupshup_api_key or not settings.gupshup_source:
        raise RuntimeError("Gupshup settings are not configured")

    clean_buttons = [
        {
            "id": str(button.get("id", "")).strip(),
            "title": str(button.get("title", "")).strip()[:20],
        }
        for button in (buttons or [])[:3]
        if button.get("id") and button.get("title")
    ]
    if not clean_buttons:
        return _send_gupshup_text(destination, body_text)

    button_payload = {
        "type": "quick_reply",
        "content": {"type": "text", "text": body_text},
        "options": [
            {"type": "text", "title": button["title"], "postbackText": button["id"]}
            for button in clean_buttons
        ],
    }
    payload = {
        "channel": settings.gupshup_channel,
        "source": settings.gupshup_source,
        "destination": _full_phone(destination),
        "message": json.dumps(button_payload),
    }
    if getattr(settings, "gupshup_app_id", None):
        payload["src.name"] = settings.gupshup_app_id

    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": settings.gupshup_api_key,
    }
    logger.info(
        "WhatsApp outbound_kind=reply_buttons to=%s buttons=%s payload_shape=quick_reply",
        _mask_phone(destination),
        clean_buttons,
    )
    try:
        resp = requests.post(settings.gupshup_api_url, data=payload, headers=headers, timeout=10)
        status_code = getattr(resp, "status_code", None)
        response_text = getattr(resp, "text", "")
        logger.info(
            "WhatsApp reply_buttons HTTP status=%s body=%s", status_code, str(response_text)[:500]
        )
        resp.raise_for_status()
        try:
            provider_response = resp.json()
        except ValueError:
            provider_response = {"text": response_text}

        provider_status = str(
            provider_response.get("status") or provider_response.get("success") or ""
        ).lower()
        if provider_status in ("false", "failed", "error"):
            raise RuntimeError(f"Gupshup rejected reply buttons: {provider_response}")

        logger.info(
            "WhatsApp reply_buttons provider_status=%s messageId=%s",
            provider_response.get("status") or provider_response.get("success"),
            provider_response.get("messageId") or provider_response.get("message_id"),
        )
        return {"kind": "reply_buttons", "fallback": False, "provider_response": provider_response}
    except Exception as exc:
        logger.warning("WhatsApp reply_buttons fallback reason=%s", exc)
        fallback_text = _button_fallback_text(body_text, clean_buttons)
        fallback_response = _send_gupshup_text(destination, fallback_text)
        return {
            "kind": "reply_buttons",
            "fallback": True,
            "fallback_reason": str(exc),
            "provider_response": fallback_response,
        }


def _list_fallback_text(fallback_text: str, reply_list: dict) -> str:
    return fallback_text or str(reply_list.get("body_text") or "")


def _send_gupshup_list(
    destination: str,
    body_text: str,
    button_text: str,
    sections: list[dict],
    fallback_text: str = "",
) -> dict:
    if not settings.gupshup_api_url or not settings.gupshup_api_key or not settings.gupshup_source:
        raise RuntimeError("Gupshup settings are not configured")

    clean_sections = []
    row_log = []
    for section in (sections or [])[:10]:
        options = []
        for row in (section.get("rows") or [])[:10]:
            row_id = str(row.get("id") or "").strip()
            title = _safe_wa_title(row.get("title") or "Item")
            description = _safe_wa_description(row.get("description") or "")
            if not row_id:
                continue
            options.append(
                {
                    "type": "text",
                    "title": title,
                    "description": description,
                    "postbackText": row_id,
                }
            )
            row_log.append({"id": row_id, "title": title})
        if options:
            clean_sections.append(
                {
                    "title": _safe_wa_title(section.get("title") or "Results"),
                    "subtitle": _safe_wa_description(section.get("subtitle") or ""),
                    "options": options,
                }
            )

    if not clean_sections:
        return _send_gupshup_text(destination, fallback_text or body_text)

    list_payload = {
        "type": "list",
        "title": _safe_wa_title(button_text, 20),
        "body": body_text,
        "msgid": str(uuid.uuid4()),
        "globalButtons": [{"type": "text", "title": _safe_wa_title(button_text, 20)}],
        "items": clean_sections,
    }
    payload = {
        "channel": settings.gupshup_channel,
        "source": settings.gupshup_source,
        "destination": _full_phone(destination),
        "message": json.dumps(list_payload),
    }
    if getattr(settings, "gupshup_app_id", None):
        payload["src.name"] = settings.gupshup_app_id

    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": settings.gupshup_api_key,
    }
    logger.info(
        "WhatsApp outbound_kind=list to=%s sections=%s rows=%s row_ids_titles=%s payload_shape=list",
        _mask_phone(destination),
        len(clean_sections),
        len(row_log),
        row_log,
    )
    try:
        resp = requests.post(settings.gupshup_api_url, data=payload, headers=headers, timeout=10)
        status_code = getattr(resp, "status_code", None)
        response_text = getattr(resp, "text", "")
        logger.info("WhatsApp list HTTP status=%s body=%s", status_code, str(response_text)[:500])
        resp.raise_for_status()
        try:
            provider_response = resp.json()
        except ValueError:
            provider_response = {"text": response_text}

        provider_status = str(
            provider_response.get("status") or provider_response.get("success") or ""
        ).lower()
        if provider_status in ("false", "failed", "error"):
            raise RuntimeError(f"Gupshup rejected list: {provider_response}")

        logger.info(
            "WhatsApp list provider_status=%s messageId=%s",
            provider_response.get("status") or provider_response.get("success"),
            provider_response.get("messageId") or provider_response.get("message_id"),
        )
        return {"kind": "list", "fallback": False, "provider_response": provider_response}
    except Exception as exc:
        logger.warning("WhatsApp list_fallback reason=%s", exc)
        fallback_response = _send_gupshup_text(
            destination, _list_fallback_text(fallback_text, {"body_text": body_text})
        )
        return {
            "kind": "list",
            "fallback": True,
            "fallback_reason": str(exc),
            "provider_response": fallback_response,
        }


def send_whatsapp(phone: str, text: str) -> None:
    """Fire-and-forget WhatsApp send. Call from threads to avoid blocking async loops."""
    try:
        _send_gupshup_text(phone, text)
        logger.info("WhatsApp sent to %s", phone[-4:])
    except Exception as exc:
        logger.error("WhatsApp send failed to %s: %s", phone[-4:], exc)


# ─── Routes ───────────────────────────────────────────────────────────────────


@router.post("/message")
async def whatsapp_message(
    body: WhatsAppMessageIn, current_user: dict = Depends(get_optional_user)
):
    """Internal REST endpoint for in-app chat bot."""
    if not isinstance(current_user, dict):
        current_user = None
    state_doc = await db.bot_sessions.find_one({"session_id": body.session_id})
    state = state_doc["state"] if state_doc else {"step": "start"}

    # If user is authenticated, inject their identity into state so bot skips phone lookup
    if current_user and not state.get("user_id"):
        worker = await db.workers.find_one({"user_id": current_user["id"]}, {"_id": 0, "id": 1})
        state = {
            **state,
            "user_id": current_user["id"],
            "role": current_user.get("role", "customer"),
            "worker_id": worker["id"] if worker else None,
            "step": state.get("step", "start"),
        }

    reply, new_state = await _handle_message(body.session_id, body.message, state)
    clean_state, reply_list = _pop_reply_list(new_state)
    clean_state, buttons = _pop_reply_buttons(clean_state)
    await _save_bot_state(body.session_id, clean_state)
    return {
        "reply": reply,
        "state": clean_state,
        "buttons": buttons or [],
        "list": reply_list or None,
    }


@router.head("/gupshup")
@router.head("/gupshup/")
async def gupshup_head():
    return Response(status_code=200)


@router.options("/gupshup")
@router.options("/gupshup/")
async def gupshup_options():
    return Response(status_code=200)


@router.get("/gupshup")
@router.get("/gupshup/")
async def gupshup_verify(
    mode: str = None,
    challenge: str = None,
    verify_token: str = None,
    hub_mode: str = None,
    hub_challenge: str = None,
    hub_verify_token: str = None,
):
    # Bare ping with no params — Gupshup URL validation health check
    if not any([mode, challenge, verify_token, hub_mode, hub_challenge, hub_verify_token]):
        return Response(status_code=200)
    if not settings.gupshup_verify_token:
        return Response(status_code=200)
    token = verify_token or hub_verify_token
    response_challenge = challenge or hub_challenge
    if token != settings.gupshup_verify_token:
        return Response(status_code=200)
    return Response(status_code=200)


@router.post("/gupshup")
@router.post("/gupshup/")
async def gupshup_webhook(request: Request):
    if not settings.gupshup_api_url:
        raise HTTPException(status_code=503, detail="WhatsApp provider not configured")

    headers = getattr(request, "headers", {}) or {}
    content_type = headers.get("content-type", "") if hasattr(headers, "get") else ""
    if "application/json" in content_type or not hasattr(request, "form"):
        body = await request.json()
    else:
        form = await request.form()
        raw = dict(form).get("payload", "{}")
        try:
            body = json.loads(raw) if isinstance(raw, str) else dict(form)
        except Exception:
            body = dict(form)
    # Non-message events (user-event, sandbox-start, sent, delivered, read, billing, etc.)
    event_type = body.get("type", "")
    payload_type = (
        body.get("payload", {}).get("type", "") if isinstance(body.get("payload"), dict) else ""
    )
    if event_type != "message" and event_type != "":
        logger.info("Gupshup non-message event: type=%s payload_type=%s", event_type, payload_type)
        return Response(status_code=200)

    logger.info("Gupshup webhook body keys=%s ct=%s", list(body.keys()), content_type[:40])
    try:
        source_phone, message_text = _extract_gupshup_incoming(body)
    except ValueError as e:
        logger.error("Gupshup parse failed: %s | body=%s", e, str(body)[:300])
        return Response(status_code=200)
    normalized_phone = normalize_whatsapp_phone(source_phone)
    logger.info(
        "WhatsApp inbound phone=%s variants=%s text_len=%s",
        _mask_phone(source_phone),
        _masked_variants(normalized_phone),
        len(message_text or ""),
    )

    session_id = _create_session_id(source_phone)
    state_doc = await db.bot_sessions.find_one({"session_id": session_id})
    state = state_doc["state"] if state_doc else {"step": "start"}

    reply, new_state = await _handle_message(source_phone, message_text, state)
    clean_state, reply_list = _pop_reply_list(new_state)
    clean_state, buttons = _pop_reply_buttons(clean_state)
    await _save_bot_state(session_id, clean_state)

    try:
        responses = []
        if reply_list:
            responses.append(
                _send_gupshup_list(
                    source_phone,
                    reply_list["body_text"],
                    reply_list["button_text"],
                    reply_list["sections"],
                    fallback_text=reply,
                )
            )
            if buttons:
                responses.append(_send_gupshup_buttons(source_phone, "Aur options:", buttons))
        else:
            responses.append(
                _send_gupshup_buttons(source_phone, reply, buttons)
                if buttons
                else _send_gupshup_text(source_phone, reply)
            )
        response = responses[0] if len(responses) == 1 else {"responses": responses}
        logger.info("Sent WhatsApp reply to %s", source_phone[-4:])
    except Exception as exc:
        logger.error("WhatsApp send failed: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to send WhatsApp reply")

    return {"status": "ok", "reply": reply, "provider_response": response}
