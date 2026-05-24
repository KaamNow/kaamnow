from .admin import router as admin_router
from .ai import router as ai_router
from .auth import router as auth_router
from .chat import router as chat_router
from .faq import router as faq_router
from .jobs import router as jobs_router
from .legal import router as legal_router
from .notifications import router as notifications_router
from .payments import router as payments_router
from .referrals import router as referrals_router
from .reports import router as reports_router
from .service_profiles import router as service_profiles_router
from .stats import router as stats_router
from .waitlist import router as waitlist_router
from .wallet import router as wallet_router
from .whatsapp import router as whatsapp_router
from .work_requests import router as work_requests_router

__all__ = [
    "admin_router",
    "ai_router",
    "auth_router",
    "chat_router",
    "faq_router",
    "jobs_router",
    "legal_router",
    "notifications_router",
    "payments_router",
    "referrals_router",
    "reports_router",
    "service_profiles_router",
    "stats_router",
    "waitlist_router",
    "wallet_router",
    "whatsapp_router",
    "work_requests_router",
]
