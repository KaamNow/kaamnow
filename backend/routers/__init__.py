from .admin import router as admin_router
from .auth import router as auth_router
from .bookings import router as bookings_router
from .chat import router as chat_router
from .engagements import router as engagements_router
from .faq import router as faq_router
from .jobs import router as jobs_router
from .legal import router as legal_router
from .notifications import router as notifications_router
from .referrals import router as referrals_router
from .reports import router as reports_router
from .stats import router as stats_router
from .waitlist import router as waitlist_router
from .wallet import router as wallet_router
from .whatsapp import router as whatsapp_router
from .workers import router as workers_router

__all__ = [
    "admin_router",
    "auth_router",
    "bookings_router",
    "chat_router",
    "engagements_router",
    "faq_router",
    "jobs_router",
    "legal_router",
    "notifications_router",
    "referrals_router",
    "reports_router",
    "stats_router",
    "waitlist_router",
    "wallet_router",
    "whatsapp_router",
    "workers_router",
]
