import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .config import settings
from .db import close_client
from .otp_service import init_otp_service
from .routers import (
    admin_router,
    auth_router,
    bookings_router,
    engagements_router,
    jobs_router,
    notifications_router,
    stats_router,
    waitlist_router,
    whatsapp_router,
    workers_router,
)
from .seed import seed_data

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Rate limiter — keyed by client IP
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="KaamNow API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Ensure static directory exists
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(workers_router)
app.include_router(jobs_router)
app.include_router(bookings_router)
app.include_router(engagements_router)
app.include_router(notifications_router)
app.include_router(waitlist_router)
app.include_router(stats_router)
app.include_router(whatsapp_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.on_event("shutdown")
async def shutdown_db_client() -> None:
    close_client()
