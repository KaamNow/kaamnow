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
    # Security: warn loudly if admin credentials are not set in env
    if not settings.admin_email or not settings.admin_password:
        logger.warning(
            "SECURITY WARNING: ADMIN_EMAIL or ADMIN_PASSWORD env vars are not set. "
            "Admin seeding will be skipped. Set these in your .env file before deploying."
        )
    await seed_data()
    logger.info("Seed data ensured.")


@app.on_event("shutdown")
async def shutdown_db_client() -> None:
    close_client()
