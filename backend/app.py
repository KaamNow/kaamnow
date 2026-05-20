import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .config import settings
from .db import close_client
from .otp_service import init_otp_service
from .routers import (
    admin_router,
    ai_router,
    auth_router,
    bookings_router,
    chat_router,
    engagements_router,
    faq_router,
    jobs_router,
    legal_router,
    notifications_router,
    payments_router,
    referrals_router,
    reports_router,
    stats_router,
    waitlist_router,
    wallet_router,
    whatsapp_router,
    workers_router,
)
from .seed import seed_data

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

if settings.sentry_dsn:
    try:
        import sentry_sdk

        sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.05)
        logger.info("Sentry initialized.")
    except Exception as exc:
        logger.warning("Sentry initialization skipped: %s", exc)

# Rate limiter — keyed by client IP
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="KaamNow API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Ensure static directory exists
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.middleware("http")
async def csrf_cookie_guard(request: Request, call_next):
    unsafe = request.method.upper() in {"POST", "PUT", "PATCH", "DELETE"}
    uses_cookie_auth = bool(request.cookies.get("access_token")) and not request.headers.get(
        "Authorization"
    )
    if unsafe and uses_cookie_auth:
        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("X-CSRF-Token")
        if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
            return JSONResponse({"detail": "CSRF token required"}, status_code=403)
    return await call_next(request)


app.include_router(admin_router)
app.include_router(ai_router)
app.include_router(auth_router)
app.include_router(workers_router)
app.include_router(jobs_router)
app.include_router(bookings_router)
app.include_router(engagements_router)
app.include_router(chat_router)
app.include_router(notifications_router)
app.include_router(payments_router)
app.include_router(waitlist_router)
app.include_router(stats_router)
app.include_router(whatsapp_router)
app.include_router(reports_router)
app.include_router(referrals_router)
app.include_router(wallet_router)
app.include_router(legal_router)
app.include_router(faq_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _expire_old_engagements() -> None:
    """Background loop: auto-cancel requested engagements older than 24h, every hour."""
    import asyncio
    from datetime import datetime, timedelta

    from .db import db as _db
    from .utils import utc_now_iso

    await asyncio.sleep(60)  # wait for DB to be ready
    while True:
        try:
            cutoff = (datetime.utcnow() - timedelta(hours=24)).isoformat()
            old = await _db.engagements.find(
                {"status": "requested", "created_at": {"$lt": cutoff}},
                {"_id": 0},
            ).to_list(200)

            if old:
                now = utc_now_iso()
                ids = [e["id"] for e in old]
                await _db.engagements.update_many(
                    {"id": {"$in": ids}},
                    {
                        "$set": {
                            "status": "cancelled",
                            "cancelled_at": now,
                            "updated_at": now,
                            "cancel_reason": "auto_expired_24h",
                        }
                    },
                )
                logger.info(f"[Expiry] Auto-cancelled {len(old)} stale engagements")

                # Notify both parties
                from .engagements import _notify

                for e in old:
                    # Notify customer: their request expired
                    await _notify(
                        e["customer_id"],
                        f"Request expired: {e.get('job_title', 'Job')}",
                        "No worker responded in 24 hours. Post again to find workers.",
                        "booking_rejected",
                        e["id"],
                    )
                    # Notify worker: their application expired
                    worker = await _db.workers.find_one(
                        {"id": e["worker_id"]}, {"_id": 0, "user_id": 1}
                    )
                    if worker and worker.get("user_id"):
                        await _notify(
                            worker["user_id"],
                            f"Interest expired: {e.get('job_title', 'Job')}",
                            "Customer didn't respond in 24 hours. Browse other jobs.",
                            "booking_rejected",
                            e["id"],
                        )
        except Exception as exc:
            logger.error(f"[Expiry] Task error: {exc}")
        await asyncio.sleep(3600)  # run every hour


async def _weekly_analytics() -> None:
    """Background loop: send weekly WhatsApp report to admin every Monday 9am IST."""
    import asyncio
    from datetime import datetime, timedelta

    from .db import db as _db
    from .whatsapp_notify import _send as wa_send

    await asyncio.sleep(30)  # wait for startup

    while True:
        try:
            now = datetime.utcnow()
            # IST = UTC+5:30. Target: Monday 03:30 UTC = Monday 09:00 IST
            # Calculate seconds until next Monday 03:30 UTC
            days_ahead = (7 - now.weekday()) % 7  # days until Monday
            next_monday = now.replace(hour=3, minute=30, second=0, microsecond=0) + timedelta(
                days=days_ahead
            )
            if next_monday <= now:
                next_monday += timedelta(days=7)
            wait_secs = (next_monday - now).total_seconds()
            logger.info(f"[Analytics] Next report in {wait_secs/3600:.1f}h")
            await asyncio.sleep(wait_secs)

            # Gather last 7 days stats
            week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
            new_workers = await _db.users.count_documents(
                {
                    "$or": [{"is_worker": True}, {"has_worker_profile": True}, {"role": "worker"}],
                    "created_at": {"$gte": week_ago},
                }
            )
            new_customers = await _db.users.count_documents(
                {"is_customer": {"$ne": False}, "created_at": {"$gte": week_ago}}
            )
            new_jobs = await _db.jobs.count_documents({"created_at": {"$gte": week_ago}})
            completed = await _db.engagements.count_documents(
                {"status": "completed", "created_at": {"$gte": week_ago}}
            )
            requests = await _db.engagements.count_documents(
                {"status": {"$ne": "cancelled"}, "created_at": {"$gte": week_ago}}
            )

            gmv_pipe = [
                {"$match": {"status": "completed", "created_at": {"$gte": week_ago}}},
                {"$group": {"_id": None, "total": {"$sum": "$daily_rate"}}},
            ]
            gmv_docs = await _db.engagements.aggregate(gmv_pipe).to_list(1)
            gmv = gmv_docs[0]["total"] if gmv_docs else 0

            total_workers = await _db.workers.count_documents({})
            total_customers = await _db.users.count_documents({"is_customer": {"$ne": False}})

            msg = (
                f"📊 *KaamNow Weekly Report*\n"
                f"Week of {now.strftime('%d %b %Y')}\n\n"
                f"🆕 New Signups\n"
                f"  Workers: +{new_workers}\n"
                f"  Customers: +{new_customers}\n\n"
                f"💼 Jobs Posted: {new_jobs}\n"
                f"🤝 Engagements: {requests}\n"
                f"✅ Completed: {completed}\n"
                f"💰 GMV: ₹{gmv:,}\n\n"
                f"📈 Total\n"
                f"  Workers: {total_workers}\n"
                f"  Customers: {total_customers}\n\n"
                f"kaamnow.com/admin"
            )

            admin_phone = settings.admin_phone or "+919654945155"
            wa_send(admin_phone, msg)
            logger.info(f"[Analytics] Weekly report sent to {admin_phone}")

        except Exception as exc:
            logger.error(f"[Analytics] Error: {exc}")
            await asyncio.sleep(3600)


async def _expire_wallet_credits() -> None:
    import asyncio
    from datetime import datetime, timedelta

    from .routers.wallet import expire_wallet_credits

    await asyncio.sleep(75)
    while True:
        try:
            now = datetime.utcnow()
            next_midnight_ist = (now + timedelta(hours=18, minutes=30)).replace(
                hour=18, minute=30, second=0, microsecond=0
            )
            if next_midnight_ist <= now:
                next_midnight_ist += timedelta(days=1)
            await asyncio.sleep((next_midnight_ist - now).total_seconds())
            count = await expire_wallet_credits()
            logger.info("[Wallet] Expired %s wallet credits", count)
        except Exception as exc:
            logger.error("[Wallet] Expiry task error: %s", exc)
            await asyncio.sleep(3600)


async def _expire_available_now() -> None:
    import asyncio
    from datetime import datetime, timezone

    from .db import db as _db

    await asyncio.sleep(90)
    while True:
        try:
            now = datetime.now(timezone.utc).isoformat()
            result = await _db.workers.update_many(
                {"is_available_now": True, "available_now_expires_at": {"$lt": now}},
                {"$set": {"is_available_now": False, "available_now_expires_at": None}},
            )
            if result.modified_count:
                logger.info(
                    "[Workers] Cleared %s expired available-now flags", result.modified_count
                )
        except Exception as exc:
            logger.error("[Workers] Available-now expiry error: %s", exc)
        await asyncio.sleep(3600)


async def _send_nudge_notifications() -> None:
    import asyncio
    from datetime import datetime, timedelta

    from .db import db as _db
    from .engagements import _notify

    await asyncio.sleep(120)
    while True:
        try:
            cutoff = (datetime.utcnow() - timedelta(days=7)).isoformat()
            users = (
                await _db.users.find(
                    {"last_nudge_at": {"$lt": cutoff}},
                    {"_id": 0, "id": 1},
                )
                .limit(200)
                .to_list(200)
            )
            for user in users:
                await _notify(
                    user["id"],
                    "KaamNow par naye kaam dekhein",
                    "Aapke area mein naye Local Experts aur jobs mil sakte hain.",
                    "nudge",
                    None,
                )
                await _db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {"last_nudge_at": datetime.utcnow().isoformat()}},
                )
        except Exception as exc:
            logger.error("[Nudge] Task error: %s", exc)
        await asyncio.sleep(24 * 3600)


async def _send_seasonal_suggestions() -> None:
    import asyncio
    from datetime import datetime

    from .db import db as _db
    from .engagements import _notify

    await asyncio.sleep(150)
    while True:
        try:
            now = datetime.utcnow()
            if now.day == 1:
                users = (
                    await _db.users.find({"is_customer": {"$ne": False}}, {"_id": 0, "id": 1})
                    .limit(500)
                    .to_list(500)
                )
                for user in users:
                    await _notify(
                        user["id"],
                        "Seasonal kaam plan karein",
                        "Ghar aur khet ke seasonal kaam ke liye template se job post karein.",
                        "seasonal_suggestion",
                        None,
                    )
        except Exception as exc:
            logger.error("[Seasonal] Task error: %s", exc)
        await asyncio.sleep(24 * 3600)


async def _ensure_indexes() -> None:
    from .db import db as _db

    await _db.users.create_index("referral_code", unique=True, sparse=True)
    await _db.messages.create_index([("engagement_id", 1), ("created_at", 1)])
    await _db.messages.create_index([("receiver_id", 1), ("read", 1)])
    await _db.reports.create_index("reported_user_id")
    await _db.reports.create_index([("status", 1), ("created_at", -1)])
    await _db.wallet_transactions.create_index([("user_id", 1), ("created_at", -1)])
    await _db.wallet_transactions.create_index([("expires_at", 1), ("expired", 1)])
    await _db.faqs.create_index([("category", 1), ("order", 1)])
    await _db.faqs.create_index("is_active")


@app.on_event("startup")
async def on_startup() -> None:
    # Initialize OTP service (WhatsApp → SMS → Voice multi-channel delivery)
    # All providers are currently mocked for testing with dummy OTP.
    # To use real providers, set environment variables:
    #   - MSG91_API_KEY, MSG91_SENDER_ID (for WhatsApp)
    #   - EXOTEL_API_KEY, EXOTEL_SENDER_ID (for SMS)
    #   - VOICE_OTP_API_KEY, TTS_API_KEY (for Voice)
    init_otp_service(
        gupshup_api_key=settings.gupshup_api_key,
        gupshup_source=settings.gupshup_source,
        gupshup_template_url=settings.gupshup_template_url,
        gupshup_app_id=settings.gupshup_app_id or "KaamNow",
        sms_api_key=os.getenv("EXOTEL_API_KEY"),
        voice_api_key=os.getenv("VOICE_OTP_API_KEY"),
        default_language="hi",
    )
    wa_live = "LIVE (Gupshup)" if settings.gupshup_api_key else "mocked"
    logger.info(f"OTP service initialized — WhatsApp: {wa_live}")

    await seed_data()
    logger.info("Seed data loaded.")
    await _ensure_indexes()
    logger.info("Phase 1 indexes ensured.")

    import asyncio

    asyncio.create_task(_expire_old_engagements())
    logger.info("Engagement expiry background task started.")
    asyncio.create_task(_weekly_analytics())
    logger.info("Weekly analytics background task started.")
    asyncio.create_task(_expire_wallet_credits())
    asyncio.create_task(_expire_available_now())
    asyncio.create_task(_send_nudge_notifications())
    asyncio.create_task(_send_seasonal_suggestions())
    logger.info("Phase 1 background tasks started.")


@app.on_event("shutdown")
async def shutdown_db_client() -> None:
    close_client()
