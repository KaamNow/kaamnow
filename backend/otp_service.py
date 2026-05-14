"""
OTP Delivery Service: Multi-channel OTP delivery (WhatsApp → SMS → Voice)

Primary channel: Gupshup WhatsApp Business API using pre-approved common_otp template.
Fallback chain:
  1. WhatsApp OTP (Gupshup template: common_otp)
  2. SMS OTP (fallback if WhatsApp fails)
  3. Voice OTP (final fallback)
"""

import json
import logging
from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class OTPChannel(str, Enum):
    WHATSAPP = "whatsapp"
    SMS = "sms"
    VOICE = "voice"


class OTPProvider:
    async def send(self, phone: str, otp_code: str) -> Dict[str, Any]:
        raise NotImplementedError


def _normalize_phone(phone: str) -> str:
    """Strip + prefix, ensure 91XXXXXXXXXX format for Gupshup."""
    p = phone.lstrip("+")
    if len(p) == 10:
        p = "91" + p
    return p


class GupshupOTPProvider(OTPProvider):
    """
    Gupshup WhatsApp Business API — uses pre-approved common_otp template.
    Template: "Your OTP for {{1}} is {{2}}. This is valid for {{3}}."

    Requires env vars: GUPSHUP_API_KEY, GUPSHUP_SOURCE, GUPSHUP_TEMPLATE_URL
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        source: Optional[str] = None,
        template_url: Optional[str] = None,
        app_id: Optional[str] = "KaamNow",
    ):
        self.api_key = api_key
        self.source = source or "917834811114"
        self.template_url = template_url or "https://api.gupshup.io/wa/api/v1/template/msg"
        self.app_id = app_id
        self.is_mocked = not api_key

    async def send(self, phone: str, otp_code: str) -> Dict[str, Any]:
        if self.is_mocked:
            logger.info(f"[MOCK WhatsApp] OTP {otp_code} → {phone}")
            return {
                "success": True,
                "channel": OTPChannel.WHATSAPP,
                "phone": phone,
                "message_id": f"mock_wa_{phone}_{datetime.now().timestamp()}",
                "timestamp": datetime.utcnow().isoformat(),
                "note": "MOCK — set GUPSHUP_API_KEY to enable real delivery",
            }

        try:
            import httpx

            destination = _normalize_phone(phone)
            otp_text = (
                f"Your KaamNow OTP is: *{otp_code}*\n"
                f"Valid for 15 minutes.\n"
                f"Do not share this code with anyone.\n\n"
                f"काम की बात, KaamNow के साथ 🙏"
            )
            # Use regular text message API (same as bot) — works in sandbox for opted-in numbers
            msg_url = self.source and "https://api.gupshup.io/wa/api/v1/msg"
            data = {
                "channel": "whatsapp",
                "source": self.source,
                "destination": destination,
                "src.name": self.app_id,
                "message": json.dumps({"type": "text", "text": otp_text}),
            }
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    msg_url,
                    data=data,
                    headers={"apikey": self.api_key},
                )
            resp_json = resp.json() if resp.content else {}
            success = resp.status_code == 202 or resp_json.get("status") == "submitted"
            logger.info(f"[Gupshup OTP] {phone} status={resp.status_code} body={resp_json}")
            return {
                "success": success,
                "channel": OTPChannel.WHATSAPP,
                "phone": phone,
                "message_id": resp_json.get("messageId", ""),
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as exc:
            logger.error(f"[Gupshup OTP] Failed for {phone}: {exc}")
            return {"success": False, "channel": OTPChannel.WHATSAPP, "error": str(exc)}


class SMSProvider(OTPProvider):
    """SMS OTP fallback. Currently mocked."""

    def __init__(self, api_key: Optional[str] = None, sender_id: Optional[str] = None):
        self.api_key = api_key
        self.sender_id = sender_id or "KaamNow"
        self.is_mocked = api_key is None

    async def send(self, phone: str, otp_code: str) -> Dict[str, Any]:
        if self.is_mocked:
            logger.info(f"[MOCK SMS] OTP {otp_code} → {phone}")
            return {
                "success": True,
                "channel": OTPChannel.SMS,
                "phone": phone,
                "message_id": f"mock_sms_{phone}_{datetime.now().timestamp()}",
                "timestamp": datetime.utcnow().isoformat(),
                "note": "MOCK — set EXOTEL_API_KEY to enable real SMS",
            }
        # Real SMS integration (Exotel / Fast2SMS) goes here
        return {"success": False, "channel": OTPChannel.SMS, "error": "SMS provider not configured"}


class VoiceOTPProvider(OTPProvider):
    """Voice OTP fallback (IVR). Currently mocked."""

    LANGUAGE_NAMES = {
        "en": "English", "hi": "हिंदी", "mr": "मराठी",
        "gu": "ગુજરાતી", "ta": "தமிழ்", "te": "తెలుగు",
    }

    def __init__(self, api_key: Optional[str] = None, language: str = "hi"):
        self.api_key = api_key
        self.language = language
        self.is_mocked = api_key is None

    async def send(self, phone: str, otp_code: str, language: str = "hi") -> Dict[str, Any]:
        if self.is_mocked:
            lang_name = self.LANGUAGE_NAMES.get(language, language)
            logger.info(f"[MOCK Voice] OTP {' '.join(list(otp_code))} → {phone} ({lang_name})")
            return {
                "success": True,
                "channel": OTPChannel.VOICE,
                "phone": phone,
                "message_id": f"mock_voice_{phone}_{datetime.now().timestamp()}",
                "timestamp": datetime.utcnow().isoformat(),
                "note": "MOCK — set VOICE_OTP_API_KEY to enable real voice OTP",
            }
        return {"success": False, "channel": OTPChannel.VOICE, "error": "Voice provider not configured"}


class OTPService:
    """
    Multi-channel OTP delivery with fallback.
    Priority: WhatsApp (Gupshup) → SMS → Voice
    """

    def __init__(
        self,
        gupshup_api_key: Optional[str] = None,
        gupshup_source: Optional[str] = None,
        gupshup_template_url: Optional[str] = None,
        gupshup_app_id: Optional[str] = "KaamNow",
        sms_api_key: Optional[str] = None,
        voice_api_key: Optional[str] = None,
        default_language: str = "hi",
    ):
        self.whatsapp = GupshupOTPProvider(
            api_key=gupshup_api_key,
            source=gupshup_source,
            template_url=gupshup_template_url,
            app_id=gupshup_app_id,
        )
        self.sms = SMSProvider(api_key=sms_api_key)
        self.voice = VoiceOTPProvider(api_key=voice_api_key, language=default_language)
        self.default_language = default_language

    async def send_otp(
        self,
        phone: str,
        otp_code: str,
        user_language: Optional[str] = None,
        preferred_channel: Optional[OTPChannel] = None,
    ) -> Dict[str, Any]:
        channels_attempted = []
        language = user_language or self.default_language

        result = await self.whatsapp.send(phone, otp_code)
        channels_attempted.append(OTPChannel.WHATSAPP)
        if result["success"]:
            result["channels_attempted"] = channels_attempted
            return result

        logger.warning(f"[OTP] WhatsApp failed for {phone}, trying SMS…")
        result = await self.sms.send(phone, otp_code)
        channels_attempted.append(OTPChannel.SMS)
        if result["success"]:
            result["channels_attempted"] = channels_attempted
            return result

        logger.warning(f"[OTP] SMS failed for {phone}, trying Voice…")
        result = await self.voice.send(phone, otp_code, language=language)
        channels_attempted.append(OTPChannel.VOICE)
        if result["success"]:
            result["channels_attempted"] = channels_attempted
            return result

        logger.error(f"[OTP] All channels failed for {phone}")
        return {
            "success": False,
            "phone": phone,
            "channels_attempted": channels_attempted,
            "error": "All OTP delivery channels failed. Please try again.",
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def get_channel_status(self) -> Dict[str, Any]:
        return {
            "whatsapp": {"provider": "Gupshup", "mocked": self.whatsapp.is_mocked},
            "sms":       {"provider": "Exotel",  "mocked": self.sms.is_mocked},
            "voice":     {"provider": "IVR",     "mocked": self.voice.is_mocked},
        }


# ── Singleton ──────────────────────────────────────────────────────────────

otp_service: Optional[OTPService] = None


def init_otp_service(
    gupshup_api_key: Optional[str] = None,
    gupshup_source: Optional[str] = None,
    gupshup_template_url: Optional[str] = None,
    gupshup_app_id: Optional[str] = "KaamNow",
    sms_api_key: Optional[str] = None,
    voice_api_key: Optional[str] = None,
    default_language: str = "hi",
    # Legacy params kept for backwards compat with any existing callers
    whatsapp_api_key: Optional[str] = None,
) -> OTPService:
    global otp_service
    otp_service = OTPService(
        gupshup_api_key=gupshup_api_key,
        gupshup_source=gupshup_source,
        gupshup_template_url=gupshup_template_url,
        gupshup_app_id=gupshup_app_id,
        sms_api_key=sms_api_key,
        voice_api_key=voice_api_key,
        default_language=default_language,
    )
    return otp_service


def get_otp_service() -> OTPService:
    global otp_service
    if otp_service is None:
        otp_service = OTPService()
    return otp_service
