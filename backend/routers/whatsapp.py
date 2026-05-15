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
import threading
import uuid
from datetime import date, timedelta
from typing import Any, Optional

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response

from ..auth import get_optional_user
from ..config import settings
from ..db import db
from ..engagements import (
    _notify,
    cancel_engagement,
    create_engagement_request,
)
from ..schemas import WhatsAppMessageIn
from ..utils import utc_now_iso
from ..whatsapp_notify import (
    notify_customer_booking_accepted,
    notify_customer_booking_rejected,
    notify_worker_new_booking,
)

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


# ─── Phone helpers ────────────────────────────────────────────────────────────

def _normalize_phone(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    return digits[-10:] if len(digits) >= 10 else digits


def _full_phone(phone: str) -> str:
    """Return 12-digit phone with 91 prefix."""
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) == 10:
        return "91" + digits
    return digits


async def _lookup_user_by_phone(phone: str) -> Optional[dict]:
    normalized = _normalize_phone(phone)
    return await db.users.find_one({"phone_primary": {"$regex": normalized, "$options": "i"}}, {"_id": 0})


def _create_session_id(source: str) -> str:
    return f"whatsapp-{source.strip().lstrip('+')}"


def _generate_avatar_color(name: str) -> str:
    colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"]
    return colors[sum(ord(c) for c in name) % len(colors)]


def _fetch_pincode_sync(pincode: str) -> Optional[dict]:
    """Synchronous pincode fetch — tries HTTPS then HTTP with browser User-Agent."""
    headers = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"}
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
                logger.warning("Pincode %s not found via %s: %s", pincode, url, entry.get("Status") if entry else "no data")
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
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
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
            return _haversine_km(worker_lat, worker_lng, float(job.get("lat") or 0), float(job.get("lng") or 0))
        except Exception:
            return 9999.0

    # Skills rank
    worker_skills = {s.strip().lower() for s in (worker.get("skills") or [])}

    def _rank(job: dict) -> tuple:
        dist = _dist(job)
        j_skills = {(s.get("skill") or "").strip().lower() for s in (job.get("required_skills") or [])} | {(job.get("category") or "").strip().lower()}
        skill_match = -len(worker_skills & j_skills)
        return (skill_match, dist)

    jobs.sort(key=_rank)
    return jobs[offset: offset + 5], len(jobs) > offset + 5  # (page_jobs, has_more)


def _format_job_list(jobs: list[dict], worker_lat: Optional[float], worker_lng: Optional[float], offset: int = 0) -> str:
    if not jobs:
        return "Koi kaam nahi mila. Baad mein dobara try karein. 🙏"
    lines = ["💼 *Kaam available hai:*\n"]
    for i, j in enumerate(jobs, 1):
        dist_str = ""
        if worker_lat and worker_lng:
            try:
                km = _haversine_km(worker_lat, worker_lng, float(j.get("lat") or 0), float(j.get("lng") or 0))
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
            km = _haversine_km(worker_lat, worker_lng, float(job.get("lat") or 0), float(job.get("lng") or 0))
            dist_str = f"\n📐 Distance: {km:.1f} km"
        except Exception:
            pass
    addr = job.get("address") or {}
    location = ", ".join(filter(None, [job.get("village"), addr.get("district"), addr.get("state"), addr.get("pincode")]))
    return (
        f"📋 *{job['title']}*\n\n"
        f"📁 Category: {job.get('category', '').title()}\n"
        f"💰 Rate: ₹{job.get('daily_rate', '?')}/day\n"
        f"📅 Date: {job.get('job_date', 'TBD')}\n"
        f"👥 Workers needed: {job.get('workers_needed', 1)}\n"
        f"📍 Location: {location}{dist_str}\n"
        f"📝 {job.get('description', '')}\n\n"
        f"Interested? Reply *APPLY*\n"
        f"Wapas jaane ke liye: *JOBS*"
    )


# ─── Identity & authentication ────────────────────────────────────────────────

async def _identify_user(source_phone: str, state: dict) -> tuple[Optional[dict], Optional[dict], dict]:
    """
    Returns (user, worker, updated_state).
    If role/user_id already in state, use that. Otherwise look up by phone.
    """
    if state.get("user_id"):
        user = await db.users.find_one({"id": state["user_id"]}, {"_id": 0})
        worker = None
        if state.get("worker_id"):
            worker = await db.workers.find_one({"id": state["worker_id"]}, {"_id": 0})
        return user, worker, state

    user = await _lookup_user_by_phone(source_phone)
    if not user:
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
        return ("Worker profile nahi mila. Pehle kaamnow.com/worker/onboarding par profile banayein.", state)

    jobs, has_more = await _fetch_jobs_for_worker(worker, category, offset, pincode_filter)

    if not jobs:
        if pincode_filter:
            return (
                f"Pincode *{pincode_filter}* mein koi kaam nahi mila.\n"
                f"Apne area ke liye sirf *JOBS* type karein.",
                state,
            )
        if category:
            return (f"Is category '{category}' mein koi kaam nahi mila. JOBS se sab dekhein.", state)
        return ("Aapke pincode ke paas koi kaam nahi mila. Thodi der baad try karein. 🙏", state)

    lat = float(worker.get("lat") or 0) or None
    lng = float(worker.get("lng") or 0) or None

    header = ""
    if pincode_filter:
        header = f"📍 *{pincode_filter}* area ke kaam:\n"

    msg = header + _format_job_list(jobs, lat, lng, offset)
    if has_more:
        msg += "\n\n*MORE* type karein aur jobs ke liye."

    new_state = {
        **state,
        "step": "job_list",
        "job_list": jobs,
        "job_offset": offset + 5,
        "job_category": category,
        "job_pincode_filter": pincode_filter,   # temporary — not saved to profile
        "viewed_job": None,
    }
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
    new_state = {**state, "step": "job_detail", "viewed_job": job}
    return (_reply(msg, [("APPLY", "✅ Apply"), ("JOBS", "🔙 Jobs List")]), new_state)


async def _cmd_apply(source_phone: str, state: dict) -> tuple[str, dict]:
    viewed_job = state.get("viewed_job")
    if not viewed_job:
        return ("Pehle koi job number type karein details dekhne ke liye.", state)

    user, worker, state = await _identify_user(source_phone, state)
    if not worker:
        return ("Worker profile nahi mila.", state)

    # Check if already applied
    existing = await db.engagements.find_one({
        "job_id": viewed_job["id"],
        "worker_id": worker["id"],
        "status": {"$in": ["requested", "accepted"]},
    })
    if existing:
        status_label = "pending approval" if existing["status"] == "requested" else "already booked ✅"
        return (f"Aapne is job mein already interest dikha chuke hain ({status_label}).", state)

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
        return (f"Apply nahi ho saka: {detail}\n\nKoi aur job try karein (JOBS).", state)

    new_state = {**state, "step": "applied", "active_engagement_id": engagement["id"], "viewed_job": None}
    return (
        _reply(
            f"✅ *Interest bhej diya!*\n\nJob: {viewed_job['title']}\nCustomer ko notification gaya. Approve hone par WhatsApp aayega.",
            [("WITHDRAW", "↩️ Withdraw"), ("JOBS", "💼 More Jobs")],
        ),
        new_state,
    )


async def _cmd_withdraw(source_phone: str, state: dict) -> tuple[str, dict]:
    user, worker, state = await _identify_user(source_phone, state)
    if not worker:
        return ("Worker profile nahi mila.", state)

    # Find latest requested engagement
    eng = await db.engagements.find_one(
        {"worker_id": worker["id"], "status": "requested"},
        sort=[("created_at", -1)],
    )
    if not eng:
        eng_id = state.get("active_engagement_id")
        if eng_id:
            eng = await db.engagements.find_one({"id": eng_id, "status": "requested"})

    if not eng:
        return ("Koi pending interest nahi mila jise withdraw karein.", state)

    # Cancel it
    await db.engagements.update_one(
        {"id": eng["id"]},
        {"$set": {"status": "cancelled", "cancelled_at": utc_now_iso(), "updated_at": utc_now_iso()}},
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

    new_state = {**state, "step": "start", "active_engagement_id": None, "viewed_job": None}
    return (
        f"↩️ *Interest wapas le liya.*\n\n"
        f"Job: {eng.get('job_title', 'Job')}\n"
        f"Customer ko inform kar diya gaya.\n\n"
        f"JOBS se aur kaam dhundhen.",
        new_state,
    )


async def _cmd_status(source_phone: str, state: dict) -> tuple[str, dict]:
    user, worker, state = await _identify_user(source_phone, state)
    if not worker:
        return ("Worker profile nahi mila.", state)

    engagements = await db.engagements.find(
        {"worker_id": worker["id"], "status": {"$in": ["requested", "accepted"]}},
        {"_id": 0},
    ).sort("created_at", -1).limit(5).to_list(5)

    if not engagements:
        return ("Abhi koi active request nahi hai.\n\nJOBS type karein naya kaam dhundhne ke liye.", state)

    lines = ["📊 *Meri Active Requests:*\n"]
    for e in engagements:
        icon = "⏳" if e["status"] == "requested" else "✅"
        label = "Pending approval" if e["status"] == "requested" else "Confirmed ✅"
        lines.append(f"{icon} *{e.get('job_title', 'Job')}*")
        lines.append(f"   Status: {label}")
        if e["status"] == "accepted" and e.get("customer_phone"):
            lines.append(f"   📞 Customer: {e['customer_phone']}")
        lines.append("")

    if any(e["status"] == "requested" for e in engagements):
        lines.append("WITHDRAW – Latest interest wapas lein")

    return ("\n".join(lines), state)


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

    return (
        f"✅ Pincode update ho gaya: *{pincode}*\n\n"
        f"Ab JOBS type karein is area ke kaam dekhne ke liye.",
        state,
    )


async def _cmd_show_pincode(source_phone: str, state: dict) -> tuple[str, dict]:
    _, worker, state = await _identify_user(source_phone, state)
    if not worker:
        return ("Worker profile nahi mila.", state)
    pincode = (worker.get("address") or {}).get("pincode") or "Set nahi hai"
    return (
        f"📍 Aapka pincode: *{pincode}*\n\n"
        f"Change karne ke liye: *PINCODE 841219*",
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
        cats = {"1": "farm", "2": "construction", "3": "electrical", "4": "cleaning", "5": "transport", "6": "other"}
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
_CATEGORY_MAP = {1: "Farm", 2: "Construction", 3: "Construction", 4: "Home", 5: "Transport", 6: "Other"}


async def _finish_customer_onboard(source_phone: str, state: dict) -> tuple[str, dict]:
    phone_digits = "".join(c for c in source_phone if c.isdigit())
    phone_10 = phone_digits[-10:] if len(phone_digits) >= 10 else phone_digits
    phone_stored = f"+91{phone_10}"  # consistent with app-registered users
    existing = await db.users.find_one({"phone_primary": {"$regex": phone_10, "$options": "i"}})
    if existing:
        return (
            f"✅ Aapka account already hai {state['wa_name']}!\nMENU type karein workers dhundhne ke liye.",
            {"step": "customer_menu", "user_id": existing["id"], "role": existing.get("role", "customer")},
        )
    address = {
        "village": state["wa_village"], "district": state["wa_district"],
        "state": state["wa_state"], "block": state.get("wa_block", ""), "pincode": state["wa_pincode"],
    }
    user_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": user_id, "phone_primary": phone_stored, "phone_verified": True,
        "name": state["wa_name"], "role": "customer", "password_hash": None,
        "pincode": state["wa_pincode"], "village": state["wa_village"], "address": address,
        "photo_url": None, "preferred_language": "hi",
        "avatar_color": _generate_avatar_color(state["wa_name"]),
        "created_at": utc_now_iso(), "migration_status": "phone_primary", "source": "whatsapp",
    })
    return (
        f"🎉 *Swagat hai {state['wa_name']}!*\n\n"
        f"Account ban gaya ✅\n"
        f"📍 {state['wa_village']}, {state['wa_district']}, {state['wa_state']}\n\n"
        f"MENU type karein workers dhundhne ke liye 🙏",
        {"step": "customer_menu", "user_id": user_id, "role": "customer"},
    )


async def _finish_worker_onboard(source_phone: str, state: dict) -> tuple[str, dict]:
    phone_digits = "".join(c for c in source_phone if c.isdigit())
    phone_10 = phone_digits[-10:] if len(phone_digits) >= 10 else phone_digits
    phone_stored = f"+91{phone_10}"
    existing_user = await db.users.find_one({"phone_primary": {"$regex": phone_10, "$options": "i"}})
    if existing_user:
        user_id = existing_user["id"]
        existing_worker = await db.workers.find_one({"user_id": user_id})
        if existing_worker:
            return (
                "✅ Aapka profile already hai!\nJOBS type karein kaam dekhne ke liye.",
                {"step": "worker_menu", "user_id": user_id, "worker_id": existing_worker["id"], "role": "worker"},
            )
    else:
        user_id = str(uuid.uuid4())
        address = {
            "village": state["wa_village"], "district": state["wa_district"],
            "state": state["wa_state"], "block": state.get("wa_block", ""), "pincode": state["wa_pincode"],
        }
        await db.users.insert_one({
            "id": user_id, "phone_primary": phone_stored, "phone_verified": True,
            "name": state["wa_name"], "role": "worker", "password_hash": None,
            "pincode": state["wa_pincode"], "village": state["wa_village"], "address": address,
            "photo_url": None, "preferred_language": "hi",
            "avatar_color": _generate_avatar_color(state["wa_name"]),
            "created_at": utc_now_iso(), "migration_status": "phone_primary", "source": "whatsapp",
        })
    worker_id = str(uuid.uuid4())
    address = {
        "village": state["wa_village"], "district": state["wa_district"],
        "state": state["wa_state"], "block": state.get("wa_block", ""), "pincode": state["wa_pincode"],
    }
    await db.workers.insert_one({
        "id": worker_id, "user_id": user_id, "name": state["wa_name"],
        "skills": state["wa_skills"], "structured_skills": state["wa_structured_skills"],
        "daily_rate": state["wa_rate"], "village": state["wa_village"],
        "district": state["wa_district"], "state": state["wa_state"], "address": address,
        "lat": 0.0, "lng": 0.0, "available": True, "availability_status": "available",
        "trust_tier": 1, "avg_rating": 0.0, "total_jobs": 0,
        "photo_url": None, "bio": "", "created_at": utc_now_iso(), "source": "whatsapp",
    })
    return (
        f"🎉 *Profile ban gaya {state['wa_name']}!*\n\n"
        f"👷 Worker Account ✅\n"
        f"📍 {state['wa_village']}, {state['wa_district']}, {state['wa_state']}\n"
        f"💰 ₹{state['wa_rate']}/day\n\n"
        f"JOBS type karein kaam dekhne ke liye 💼\n"
        f"HELP type karein sabhi commands ke liye",
        {"step": "worker_menu", "user_id": user_id, "worker_id": worker_id, "role": "worker"},
    )


async def _cmd_onboard(source_phone: str, message: str, state: dict) -> tuple[str, dict]:
    """State machine for WhatsApp onboarding. Steps prefixed wa_ob_."""
    msg = message.strip()
    msg_up = msg.upper()
    step = state.get("step", "wa_ob_role")

    if step == "wa_ob_role":
        if msg == "1":
            return ("Aapka poora naam kya hai?", {**state, "step": "wa_ob_name", "wa_role": "customer"})
        if msg == "2":
            return ("Aapka poora naam kya hai?", {**state, "step": "wa_ob_name", "wa_role": "worker"})
        return (
            _reply(
                "Aap kya hain? 🙏",
                [("1", "👤 Customer"), ("2", "👷 Worker")],
            ),
            state,
        )

    if step == "wa_ob_name":
        if len(msg.strip()) < 2:
            return ("Naam kam se kam 2 characters ka hona chahiye. Dobara bhejein:", state)
        return ("Aapka area ka *pincode* kya hai? (6 digits)", {**state, "step": "wa_ob_pincode", "wa_name": msg.strip()})

    if step == "wa_ob_pincode":
        if not msg.isdigit() or len(msg) != 6:
            return ("Sahi 6-digit pincode bhejein. Example: *411001*", state)
        result = await _lookup_pincode(msg)
        if not result:
            return ("Yeh pincode nahi mila. Sahi pincode bhejein:", state)
        new_state = {
            **state, "step": "wa_ob_village",
            "wa_pincode": msg, "wa_district": result["district"],
            "wa_state": result["state"], "wa_block": result["block"], "wa_post": result["post"],
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
        structured = [{"category": _CATEGORY_MAP[n], "skill": s} for n in nums for s in _SKILL_MAP[n]]
        new_state = {**state, "wa_skills": skills, "wa_structured_skills": structured}
        return await _finish_worker_onboard(source_phone, new_state)

    # Fallback: restart onboarding
    return (
        "Namaste! KaamNow mein swagat hai 🙏\n\n"
        "Aap kya hain?\n\n"
        "1️⃣ Mujhe workers chahiye *(Customer)*\n"
        "2️⃣ Main kaam dhundhta/dhundhti hun *(Worker)*\n\n"
        "Reply *1* ya *2*",
        {"step": "wa_ob_role"},
    )


# ─── Main message dispatcher ──────────────────────────────────────────────────

async def _handle_message(source_phone: str, message_text: str, state: dict) -> tuple[str, dict]:
    raw = message_text.strip()
    msg_up = raw.upper()
    msg_low = raw.lower()

    # ── Normalize button title aliases to commands ──
    _ALIASES = {
        "find jobs": "JOBS", "find job": "JOBS", "💼 find jobs": "JOBS",
        "my status": "STATUS", "meri status": "STATUS", "📊 my status": "STATUS",
        "help": "HELP", "❓ help": "HELP",
        "find workers": "MENU", "🔍 find workers": "MENU",
        "more jobs": "MORE", "💼 more jobs": "MORE",
        "withdraw": "WITHDRAW", "↩️ withdraw": "WITHDRAW",
        "apply": "APPLY", "✅ apply": "APPLY",
        "jobs list": "JOBS", "🔙 jobs list": "JOBS",
        "worker": "2", "👷 worker": "2",
        "customer": "1", "👤 customer": "1",
    }
    if msg_low in _ALIASES:
        raw = _ALIASES[msg_low]
        msg_up = raw.upper()
        msg_low = raw.lower()
        logger.info("Alias normalized: %r → %r", message_text.strip(), raw)

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

    if msg_up in ("MENU", "RESET", "START"):
        # Clear job browsing state, keep identity
        clean_state = {k: v for k, v in state.items() if k in ("user_id", "worker_id", "role")}
        clean_state["step"] = "start"
        return await _handle_message(source_phone, "hi", clean_state)

    # ── Identify user on first contact (or if identity not in state) ──
    user, worker, state = await _identify_user(source_phone, state)

    if not user:
        # If mid-onboarding, continue the flow
        if state.get("step", "").startswith("wa_ob_"):
            return await _cmd_onboard(source_phone, raw, state)
        # Any message from unknown number → start onboarding
        return (
            _reply(
                "Namaste! KaamNow mein swagat hai 🙏\n\nAap kya hain?",
                [("1", "👤 Customer"), ("2", "👷 Worker")],
            ),
            {"step": "wa_ob_role"},
        )

    # ── Worker commands ──
    if state.get("role") == "worker":
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

        # MORE (next page of jobs) — carries forward category AND temp pincode filter
        if msg_up == "MORE":
            offset = state.get("job_offset", 5)
            cat = state.get("job_category")
            pin = state.get("job_pincode_filter")
            return await _cmd_jobs(source_phone, state, category=cat, offset=offset, pincode_filter=pin)

        # Numbered job selection (when job list is shown)
        if raw.isdigit() and state.get("step") == "job_list":
            return await _cmd_job_detail(source_phone, int(raw), state)

        # Numbered job selection (for quick re-apply from any state)
        if raw.isdigit() and state.get("job_list") and 1 <= int(raw) <= len(state.get("job_list", [])):
            return await _cmd_job_detail(source_phone, int(raw), state)

        # APPLY
        if msg_up in ("APPLY", "INTERESTED", "RUCHI HAI", "INTEREST"):
            return await _cmd_apply(source_phone, state)

        # WITHDRAW
        if msg_up in ("WITHDRAW", "WAPAS", "CANCEL"):
            return await _cmd_withdraw(source_phone, state)

        # STATUS
        if msg_up in ("STATUS", "MY STATUS", "MERI STATUS"):
            return await _cmd_status(source_phone, state)

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
                {"$push": {"accepted_worker_ids": state.get("worker_id")}, "$inc": {"filled_count": 1}},
                return_document=True,
            )
            if updated_job and updated_job.get("filled_count", 0) >= updated_job.get("workers_needed", 1):
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

        # First message / unknown → show worker menu
        if state.get("step") in ("start", None, "unregistered") or msg_up in ("HI", "HELLO", "NAMASTE", "HAI"):
            name = user.get("name", "").split()[0] if user.get("name") else "Worker"
            pincode = (worker.get("address") or {}).get("pincode") or "set nahi"
            return (
                _reply(
                    f"Namaste {name}! 👷 KaamNow mein swagat hai.\n📍 Pincode: {pincode}",
                    [("JOBS", "💼 Find Jobs"), ("STATUS", "📊 My Status"), ("HELP", "❓ Help")],
                ),
                {**state, "step": "worker_menu"},
            )

        # Unknown command for worker
        return (
            "Samajh nahi aaya. 🙏\n\nJOBS – Kaam dhundhen\nHELP – Sabhi commands",
            state,
        )

    # ── Customer commands ──
    if state.get("role") == "customer":
        step = state.get("step", "start")

        if msg_up in ("HI", "HELLO", "NAMASTE", "HAI") or step in ("start", None):
            name = user.get("name", "").split()[0] if user.get("name") else "Customer"
            return (
                _reply(
                    f"Namaste {name}! KaamNow mein swagat hai 🙏",
                    [("MENU", "🔍 Find Workers"), ("HELP", "❓ Help")],
                ),
                {**state, "step": "customer_menu"},
            )

        # Village step (with DB lookup)
        if step == "village":
            return await _handle_village(source_phone, raw, state)

        # Select worker step (with DB)
        if step == "select":
            return await _handle_select(source_phone, raw, state)

        # Pure state machine for all other customer steps
        reply, new_state = _bot_reply_customer(state, message_text)
        return (reply, new_state)

    # ── Unknown role fallback ──
    return (
        "Aapka account linked nahi ho saka. kaamnow.com/signup par register karein.\nHELP type karein.",
        state,
    )


# ─── Customer village/select handlers (unchanged from v1) ─────────────────────

async def _handle_village(source_phone: str, village: str, state: dict) -> tuple[str, dict]:
    workers = await db.workers.find(
        {"village": {"$regex": village.strip(), "$options": "i"}, "available": True},
        {"_id": 0, "id": 1, "name": 1, "daily_rate": 1, "skills": 1, "user_id": 1},
    ).limit(5).to_list(5)

    if not workers:
        workers = await db.workers.find(
            {"available": True},
            {"_id": 0, "id": 1, "name": 1, "daily_rate": 1, "skills": 1, "user_id": 1},
        ).limit(5).to_list(5)

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

    return ("\n".join(lines), {**state, "step": "select", "village": village, "workers_snapshot": workers})


async def _handle_select(source_phone: str, selection: str, state: dict) -> tuple[str, dict]:
    workers_snapshot = state.get("workers_snapshot", [])
    if not workers_snapshot:
        return ("Kuch galat ho gaya. MENU type karein.", {"step": "start"})

    try:
        indices = [int(x.strip()) - 1 for x in selection.replace(",", " ").split() if x.strip().isdigit()]
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
    date_map = {"Today": str(today), "Tomorrow": str(today + timedelta(days=1)), "Day after": str(today + timedelta(days=2))}
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
        "lat": 0.0, "lng": 0.0,
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
            "worker_rating": None, "customer_rating": None,
            "created_by": customer["id"],
            "created_at": now, "updated_at": now,
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
            return message.get("text") or message.get("payload") or message.get("caption") or message.get("body") or ""
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
        body.get("src") or
        body.get("source") or
        body.get("from") or
        inner.get("source") or
        inner.get("src")
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
    text = _format_gupshup_message(body)

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
        text = _format_gupshup_message(inner)

    # Handle button reply payloads (user tapped a quick-reply button)
    # Gupshup sends multiple formats depending on version — try all
    if not text:
        inner_payload = inner.get("payload") if isinstance(inner.get("payload"), dict) else {}

        # Format A: payload.type == "button_reply"
        if inner_payload.get("type") == "button_reply":
            text = inner_payload.get("id") or inner_payload.get("title") or ""

        # Format B: payload.type == "interactive", payload.payload.button_reply
        elif inner.get("type") == "interactive":
            btn_reply = inner_payload.get("button_reply") or inner_payload
            text = btn_reply.get("id") or btn_reply.get("title") or ""

        # Format C: top-level button_reply
        if not text and body.get("type") == "button_reply":
            text = body.get("id") or body.get("title") or ""

        # Format E: Gupshup quick_reply postback
        if not text and inner.get("type") == "quick_reply":
            text = inner_payload.get("postbackText") or inner_payload.get("title") or ""
        if not text and body.get("type") == "quick_reply":
            btn = inner.get("payload") or inner_payload
            text = btn.get("postbackText") or btn.get("title") or ""

        # Format D: payload.interactive.button_reply (v2 format)
        if not text:
            interactive_data = inner.get("interactive") or {}
            btn_reply = interactive_data.get("button_reply") or {}
            text = btn_reply.get("id") or btn_reply.get("title") or ""

        if text:
            logger.info("Button reply extracted: %r", text)

    if not src or not text:
        raise ValueError(f"Invalid Gupshup payload — src={src!r} text={text!r} body_keys={list(body.keys())}")
    return str(src), text


def _send_gupshup_text(destination: str, text: str) -> dict:
    if not settings.gupshup_api_url or not settings.gupshup_api_key or not settings.gupshup_source:
        raise RuntimeError("Gupshup settings are not configured")

    payload = {
        "channel": settings.gupshup_channel,
        "source": settings.gupshup_source,
        "destination": destination,
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


def _send_gupshup_buttons(destination: str, text: str, buttons: list[tuple[str, str]]) -> dict:
    """Send interactive buttons if FEATURE_WHATSAPP_BUTTONS=true, else clean text fallback.
    buttons: list of (id, title) — id is the command bot receives, title shown to user.
    """
    if not settings.gupshup_api_url or not settings.gupshup_api_key or not settings.gupshup_source:
        raise RuntimeError("Gupshup settings are not configured")

    btn_list = buttons[:3]

    if getattr(settings, "feature_whatsapp_buttons", True):
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "apikey": settings.gupshup_api_key,
        }
        base = {
            "channel": settings.gupshup_channel,
            "source": settings.gupshup_source,
            "destination": destination,
        }
        if getattr(settings, "gupshup_app_id", None):
            base["src.name"] = settings.gupshup_app_id

        # Attempt 1: Gupshup native quick_reply format
        qr_payload = {
            "type": "quick_reply",
            "content": {"type": "text", "text": text},
            "options": [
                {"type": "text", "title": btitle[:20], "postbackText": bid}
                for bid, btitle in btn_list
            ],
        }
        try:
            form1 = {**base, "message": json.dumps(qr_payload)}
            resp1 = requests.post(settings.gupshup_api_url, data=form1, headers=headers, timeout=10)
            r1 = resp1.json() if resp1.content else {}
            logger.info("Gupshup quick_reply → HTTP %s status=%s resp=%s",
                        resp1.status_code, r1.get("status"), str(r1)[:120])
            if r1.get("status") == "submitted":
                return r1
        except Exception as exc:
            logger.warning("quick_reply attempt failed: %s", exc)

        logger.warning("quick_reply not submitted by Gupshup — falling back to text")

    # Fallback: clean text with options (always works)
    btn_lines = "\n".join(f"{b[1]}" for b in btn_list)
    return _send_gupshup_text(destination, f"{text}\n\n{btn_lines}")


def _reply(text: str, buttons: list[tuple[str, str]] | None = None) -> dict | str:
    """Return a reply dict with optional buttons, or plain string if no buttons."""
    if buttons:
        return {"text": text, "buttons": buttons}
    return text


def send_whatsapp(phone: str, text: str) -> None:
    """Fire-and-forget WhatsApp send. Call from threads to avoid blocking async loops."""
    try:
        _send_gupshup_text(phone, text)
        logger.info("WhatsApp sent to %s", phone[-4:])
    except Exception as exc:
        logger.error("WhatsApp send failed to %s: %s", phone[-4:], exc)


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/message")
async def whatsapp_message(body: WhatsAppMessageIn, current_user: dict = Depends(get_optional_user)):
    """Internal REST endpoint for in-app chat bot."""
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
    await _save_bot_state(body.session_id, new_state)
    reply_text = reply["text"] if isinstance(reply, dict) else reply
    reply_buttons = reply.get("buttons") if isinstance(reply, dict) else None
    return {"reply": reply_text, "buttons": reply_buttons, "state": new_state}


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

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
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
    payload_type = body.get("payload", {}).get("type", "") if isinstance(body.get("payload"), dict) else ""
    if event_type != "message" and event_type != "":
        logger.info("Gupshup non-message event: type=%s payload_type=%s", event_type, payload_type)
        return Response(status_code=200)

    logger.info("Gupshup webhook body keys=%s ct=%s", list(body.keys()), content_type[:40])
    try:
        source_phone, message_text = _extract_gupshup_incoming(body)
    except ValueError as e:
        logger.error("Gupshup parse failed: %s | body=%s", e, str(body)[:300])
        return Response(status_code=200)

    session_id = _create_session_id(source_phone)
    state_doc = await db.bot_sessions.find_one({"session_id": session_id})
    state = state_doc["state"] if state_doc else {"step": "start"}

    reply, new_state = await _handle_message(source_phone, message_text, state)
    await _save_bot_state(session_id, new_state)

    try:
        if isinstance(reply, dict) and reply.get("buttons"):
            response = _send_gupshup_buttons(source_phone, reply["text"], reply["buttons"])
        else:
            reply_text = reply["text"] if isinstance(reply, dict) else reply
            response = _send_gupshup_text(source_phone, reply_text)
        logger.info("Sent WhatsApp reply to %s", source_phone[-4:])
    except Exception as exc:
        logger.error("WhatsApp send failed: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to send WhatsApp reply")

    return Response(status_code=200)
