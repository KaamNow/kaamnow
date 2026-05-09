from .admin import router as admin_router
from .auth import router as auth_router
from .bookings import router as bookings_router
from .engagements import router as engagements_router
from .jobs import router as jobs_router
from .notifications import router as notifications_router
from .stats import router as stats_router
from .waitlist import router as waitlist_router
from .whatsapp import router as whatsapp_router
from .workers import router as workers_router

__all__ = [
    "admin_router",
    "auth_router",
    "bookings_router",
    "engagements_router",
    "jobs_router",
    "notifications_router",
    "stats_router",
    "waitlist_router",
    "whatsapp_router",
    "workers_router",
]
