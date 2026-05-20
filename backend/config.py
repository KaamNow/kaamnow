import os
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _to_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


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


settings = Settings(
    mongo_url=os.getenv("MONGO_URL", ""),
    db_name=os.getenv("DB_NAME", ""),
    jwt_secret=os.getenv("JWT_SECRET", ""),
    jwt_expiry_days=int(os.getenv("JWT_EXPIRY_DAYS", "7")),
    cookie_secure=_to_bool(os.getenv("COOKIE_SECURE"), False),
    cors_origins=os.getenv("CORS_ORIGINS", "*"),
    admin_phone=os.getenv("ADMIN_PHONE", ""),
    admin_password=os.getenv("ADMIN_PASSWORD", ""),
    admin_bootstrap_secret=os.getenv("ADMIN_BOOTSTRAP_SECRET", ""),
    gupshup_api_url=os.getenv("GUPSHUP_API_URL"),
    gupshup_api_key=os.getenv("GUPSHUP_API_KEY"),
    gupshup_source=os.getenv("GUPSHUP_SOURCE"),
    gupshup_app_id=os.getenv("GUPSHUP_APP_ID"),
    gupshup_channel=os.getenv("GUPSHUP_CHANNEL", "whatsapp"),
    gupshup_verify_token=os.getenv("GUPSHUP_VERIFY_TOKEN"),
    gupshup_template_url=os.getenv("GUPSHUP_TEMPLATE_URL"),
    gupshup_template_namespace=os.getenv("GUPSHUP_TEMPLATE_NAMESPACE"),
    gupshup_sandbox_mode=_to_bool(os.getenv("GUPSHUP_SANDBOX_MODE"), False),
    show_otp_in_response=_to_bool(os.getenv("SHOW_OTP_IN_RESPONSE"), False),
    gemini_api_key=os.getenv("GEMINI_API_KEY", ""),
    groq_api_key=os.getenv("GROQ_API_KEY", ""),
    razorpay_key_id=os.getenv("RAZORPAY_KEY_ID", ""),
    razorpay_key_secret=os.getenv("RAZORPAY_KEY_SECRET", ""),
    posthog_api_key=os.getenv("POSTHOG_API_KEY", ""),
    sentry_dsn=os.getenv("SENTRY_DSN", ""),
    feature_engagement_flow=_to_bool(os.getenv("FEATURE_ENGAGEMENT_FLOW"), False),
    feature_otp_auth=_to_bool(os.getenv("FEATURE_OTP_AUTH"), False),
    feature_whatsapp_notifications=_to_bool(os.getenv("FEATURE_WHATSAPP_NOTIFICATIONS"), False),
    feature_ai=_to_bool(os.getenv("FEATURE_AI"), False),
    feature_chat=_to_bool(os.getenv("FEATURE_CHAT"), False),
    feature_payments=_to_bool(os.getenv("FEATURE_PAYMENTS"), False),
    feature_voice=_to_bool(os.getenv("FEATURE_VOICE"), False),
)
