import os
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
# Load .env.dev first (dev override), fall back to .env
_env_dev = BASE_DIR / ".env.dev"
_env = BASE_DIR / ".env"
if _env_dev.exists():
    load_dotenv(_env_dev, override=True)
elif _env.exists():
    load_dotenv(_env)


def _clean(value: Optional[str]) -> Optional[str]:
    """Strip surrounding quotes added by Doppler --format env when read via --from-env-file."""
    if value is None:
        return None
    return value.strip().strip('"').strip("'")


def _to_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return _clean(value).lower() in {"1", "true", "yes", "on"}


def _to_int(value: Optional[str], default: int) -> int:
    cleaned = _clean(value)
    if not cleaned:
        return default
    try:
        return int(cleaned)
    except (ValueError, TypeError):
        return default


def _to_float(value: Optional[str], default: float) -> float:
    cleaned = _clean(value)
    if not cleaned:
        return default
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return default


class Settings(BaseModel):
    mongo_url: str
    db_name: str
    jwt_secret: str
    jwt_expiry_days: int = 7
    cookie_secure: bool = False
    cors_origins: str = "*"
    # Security: these MUST be set via env vars in production — no defaults
    admin_phone: str = Field(default="")
    admin_password: str = Field(default="")
    admin_bootstrap_secret: str = Field(default="")

    gupshup_api_url: Optional[str] = None
    gupshup_api_key: Optional[str] = None
    gupshup_source: Optional[str] = None
    gupshup_app_id: Optional[str] = None
    gupshup_channel: str = "whatsapp"
    gupshup_verify_token: Optional[str] = None
    gupshup_template_url: Optional[str] = None
    gupshup_template_namespace: Optional[str] = None
    gupshup_sandbox_mode: bool = False
    show_otp_in_response: bool = False

    gemini_api_key: str = ""
    groq_api_key: str = ""
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    posthog_api_key: str = ""
    sentry_dsn: str = ""

    feature_engagement_flow: bool = False
    feature_otp_auth: bool = False
    feature_whatsapp_notifications: bool = False
    feature_ai: bool = False
    feature_chat: bool = False
    feature_payments: bool = False
    feature_voice: bool = False

    class Config:
        extra = "ignore"

    @property
    def allow_origins(self) -> List[str]:
        if self.cors_origins.strip() == "*" or self.cors_origins.strip() == "":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


def _e(key: str, default: str = "") -> str:
    """Get env var and strip surrounding quotes (Doppler --format env adds them)."""
    return _clean(os.getenv(key)) or default


settings = Settings(
    mongo_url=_e("MONGO_URL"),
    db_name=_e("DB_NAME"),
    jwt_secret=_e("JWT_SECRET"),
    jwt_expiry_days=_to_int(os.getenv("JWT_EXPIRY_DAYS"), 7),
    cookie_secure=_to_bool(os.getenv("COOKIE_SECURE"), False),
    cors_origins=_e("CORS_ORIGINS", "*"),
    admin_phone=_e("ADMIN_PHONE"),
    admin_password=_e("ADMIN_PASSWORD"),
    admin_bootstrap_secret=_e("ADMIN_BOOTSTRAP_SECRET"),
    gupshup_api_url=_e("GUPSHUP_API_URL") or None,
    gupshup_api_key=_e("GUPSHUP_API_KEY") or None,
    gupshup_source=_e("GUPSHUP_SOURCE") or None,
    gupshup_app_id=_e("GUPSHUP_APP_ID") or None,
    gupshup_channel=_e("GUPSHUP_CHANNEL", "whatsapp"),
    gupshup_verify_token=_e("GUPSHUP_VERIFY_TOKEN") or None,
    gupshup_template_url=_e("GUPSHUP_TEMPLATE_URL") or None,
    gupshup_template_namespace=_e("GUPSHUP_TEMPLATE_NAMESPACE") or None,
    gupshup_sandbox_mode=_to_bool(os.getenv("GUPSHUP_SANDBOX_MODE"), False),
    show_otp_in_response=_to_bool(os.getenv("SHOW_OTP_IN_RESPONSE"), False),
    gemini_api_key=_e("GEMINI_API_KEY"),
    groq_api_key=_e("GROQ_API_KEY"),
    razorpay_key_id=_e("RAZORPAY_KEY_ID"),
    razorpay_key_secret=_e("RAZORPAY_KEY_SECRET"),
    posthog_api_key=_e("POSTHOG_API_KEY"),
    sentry_dsn=_e("SENTRY_DSN"),
    feature_engagement_flow=_to_bool(os.getenv("FEATURE_ENGAGEMENT_FLOW"), False),
    feature_otp_auth=_to_bool(os.getenv("FEATURE_OTP_AUTH"), False),
    feature_whatsapp_notifications=_to_bool(os.getenv("FEATURE_WHATSAPP_NOTIFICATIONS"), False),
    feature_ai=_to_bool(os.getenv("FEATURE_AI"), False),
    feature_chat=_to_bool(os.getenv("FEATURE_CHAT"), False),
    feature_payments=_to_bool(os.getenv("FEATURE_PAYMENTS"), False),
    feature_voice=_to_bool(os.getenv("FEATURE_VOICE"), False),
)
