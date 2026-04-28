import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import close_client
from .routers import (
    auth_router,
    bookings_router,
    engagements_router,
    jobs_router,
    stats_router,
    waitlist_router,
    whatsapp_router,
    workers_router,
)
from .seed import seed_data

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="KaamNow API")

# Ensure static directory exists
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(auth_router)
app.include_router(workers_router)
app.include_router(jobs_router)
app.include_router(bookings_router)
app.include_router(engagements_router)
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
    await seed_data()
    logger.info("Seed data ensured.")


@app.on_event("shutdown")
async def shutdown_db_client() -> None:
    close_client()
