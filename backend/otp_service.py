"""
OTP Delivery Service: Handles multi-channel OTP delivery (WhatsApp → SMS → Voice)
Currently mocked, but structured for MSG91/Exotel integration.

Fallback chain:
  1. WhatsApp OTP (MSG91 WhatsApp Business API)
  2. SMS OTP (fallback if WhatsApp fails after 10-15s)
  3. Voice OTP (final fallback, multi-language TTS)

All currently mock with dummy OTP for testing.
"""

import logging
from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class OTPChannel(str, Enum):
    """OTP delivery channels"""
    WHATSAPP = "whatsapp"
    SMS = "sms"
    VOICE = "voice"


class OTPProvider:
    """Abstract base for OTP providers"""

    async def send(self, phone: str, otp_code: str) -> Dict[str, Any]:
        """Send OTP via this provider. Returns {'success': bool, 'message_id': str, ...}"""
        raise NotImplementedError


class WhatsAppProvider(OTPProvider):
    """
    MSG91 WhatsApp Business API for OTP delivery

    Docs: https://msg91.com/whatsapp/integration
    Features:
      - Instant delivery (<1 second)
      - Visual + audio notification
      - Works on any phone with WhatsApp installed

    Currently MOCKED. To use real provider:
      1. Create MSG91 account at msg91.com
      2. Get API key from dashboard
      3. Set in environment: MSG91_API_KEY, MSG91_SENDER_ID
      4. Replace this mock with real HTTP calls to MSG91 API
    """

    def __init__(self, api_key: Optional[str] = None, sender_id: Optional[str] = None):
        self.api_key = api_key or "MOCK_MSG91_API_KEY"
        self.sender_id = sender_id or "KaamNow"
        self.is_mocked = api_key is None  # If no real API key, use mock

    async def send(self, phone: str, otp_code: str) -> Dict[str, Any]:
        """Send WhatsApp OTP"""

        if self.is_mocked:
            # MOCK: Log and return success
            logger.info(f"[MOCK WhatsApp] Sending OTP {otp_code} to {phone}")
            return {
                "success": True,
                "channel": OTPChannel.WHATSAPP,
                "phone": phone,
                "message_id": f"mock_whatsapp_{phone}_{datetime.now().timestamp()}",
                "timestamp": datetime.utcnow().isoformat(),
                "note": "MOCK - Real MSG91 API not configured"
            }

        # REAL: Call MSG91 WhatsApp API
        # import httpx
        # async with httpx.AsyncClient() as client:
        #     response = await client.post(
        #         "https://api.msg91.com/apiv5/whatsapp/send",
        #         json={
        #             "template": "otp_verification",
        #             "phone": phone.replace("+", ""),
        #             "otp": otp_code,
        #             "sender_id": self.sender_id
        #         },
        #         headers={"authkey": self.api_key}
        #     )
        #     data = response.json()
        #     return {
        #         "success": data.get("success", False),
        #         "channel": OTPChannel.WHATSAPP,
        #         "message_id": data.get("message_id"),
        #         "timestamp": datetime.utcnow().isoformat()
        #     }


class SMSProvider(OTPProvider):
    """
    SMS OTP fallback provider (Exotel or MessageCentral)

    Why SMS fallback:
      - Works on feature phones (no WhatsApp required)
      - Reliable even on 2G networks
      - DLT delays expected (30-60s typical in India)

    Currently MOCKED. To use real provider (e.g., Exotel):
      1. Create Exotel account at exotel.com
      2. Get API key + sender ID
      3. Set in environment: EXOTEL_API_KEY, EXOTEL_SENDER_ID
      4. Replace this mock with real HTTP calls to Exotel API
    """

    def __init__(self, api_key: Optional[str] = None, sender_id: Optional[str] = None):
        self.api_key = api_key or "MOCK_EXOTEL_API_KEY"
        self.sender_id = sender_id or "KaamNow"
        self.is_mocked = api_key is None

    async def send(self, phone: str, otp_code: str) -> Dict[str, Any]:
        """Send SMS OTP"""

        if self.is_mocked:
            # MOCK: Log and return success
            logger.info(f"[MOCK SMS] Sending OTP {otp_code} to {phone} (DLT delay: ~30-60s expected)")
            return {
                "success": True,
                "channel": OTPChannel.SMS,
                "phone": phone,
                "message_id": f"mock_sms_{phone}_{datetime.now().timestamp()}",
                "timestamp": datetime.utcnow().isoformat(),
                "expected_delivery_time": "30-60 seconds (DLT delay)",
                "note": "MOCK - Real Exotel API not configured"
            }

        # REAL: Call Exotel API
        # import httpx
        # async with httpx.AsyncClient() as client:
        #     response = await client.post(
        #         "https://api.exotel.com/v1/sms/send",
        #         json={
        #             "From": self.sender_id,
        #             "To": phone,
        #             "Body": f"Your KaamNow OTP is: {otp_code}. Valid for 15 minutes."
        #         },
        #         headers={"Authorization": f"Bearer {self.api_key}"}
        #     )
        #     data = response.json()
        #     return {
        #         "success": data.get("success", False),
        #         "channel": OTPChannel.SMS,
        #         "message_id": data.get("message_id"),
        #         "timestamp": datetime.utcnow().isoformat()
        #     }


class VoiceOTPProvider(OTPProvider):
    """
    Voice OTP (IVR) fallback - final resort

    Multi-language TTS (Text-To-Speech) for accessibility:
      - Hindi (हिंदी)
      - Marathi (मराठी)
      - Gujarati (ગુજરાતી)
      - Tamil (தமிழ்)
      - Telugu (తెలుగు)
      - Kannada (ಕನ್ನಡ)
      - Malayalam (മലയാളം)
      - Bengali (বাংলা)

    Flow: Bot calls user → reads OTP aloud → user presses DTMF digits to confirm

    Currently MOCKED. To use real provider (e.g., FreJun or Exotel):
      1. Set up voice gateway credentials
      2. Get TTS API key
      3. Set in environment: VOICE_OTP_API_KEY, TTS_API_KEY, TTS_LANGUAGE
      4. Replace this mock with real IVR API calls
    """

    def __init__(self, api_key: Optional[str] = None, language: str = "en"):
        self.api_key = api_key or "MOCK_VOICE_OTP_API_KEY"
        self.language = language  # Language code: en, hi, mr, gu, ta, te, kn, ml, bn
        self.is_mocked = api_key is None

        # Language names for logging
        self.language_names = {
            "en": "English",
            "hi": "हिंदी (Hindi)",
            "mr": "मराठी (Marathi)",
            "gu": "ગુજરાતી (Gujarati)",
            "ta": "தமிழ் (Tamil)",
            "te": "తెలుగు (Telugu)",
            "kn": "ಕನ್ನಡ (Kannada)",
            "ml": "മലയാളം (Malayalam)",
            "bn": "বাংলা (Bengali)"
        }

    async def send(self, phone: str, otp_code: str, language: str = "en") -> Dict[str, Any]:
        """Send Voice OTP via IVR"""

        lang_name = self.language_names.get(language, language)

        if self.is_mocked:
            # MOCK: Log and return success
            formatted_otp = " ".join(list(otp_code))  # "123456" → "1 2 3 4 5 6"
            logger.info(
                f"[MOCK Voice OTP] Calling {phone} with OTP: {formatted_otp} ({lang_name})\n"
                f"  Bot script: 'Your one-time password is {formatted_otp}. Press 5 when ready.'"
            )
            return {
                "success": True,
                "channel": OTPChannel.VOICE,
                "phone": phone,
                "message_id": f"mock_voice_{phone}_{datetime.now().timestamp()}",
                "timestamp": datetime.utcnow().isoformat(),
                "language": language,
                "language_name": lang_name,
                "otp_spoken_as": formatted_otp,
                "note": "MOCK - Real voice gateway not configured"
            }

        # REAL: Call voice OTP gateway (e.g., Exotel IVR API)
        # import httpx
        # async with httpx.AsyncClient() as client:
        #     otp_digits = " ".join(list(otp_code))
        #     # Generate TTS script in specified language
        #     tts_text = self._get_tts_script(otp_digits, language)
        #
        #     response = await client.post(
        #         "https://api.exotel.com/v1/voice/call",
        #         json={
        #             "to": phone,
        #             "action": "playback",
        #             "speech": tts_text,
        #             "language": language
        #         },
        #         headers={"Authorization": f"Bearer {self.api_key}"}
        #     )
        #     data = response.json()
        #     return {
        #         "success": data.get("success", False),
        #         "channel": OTPChannel.VOICE,
        #         "call_id": data.get("call_id"),
        #         "timestamp": datetime.utcnow().isoformat()
        #     }


class OTPService:
    """
    Multi-channel OTP delivery service with intelligent fallback.

    Priority chain:
      1. Try WhatsApp (fastest, most reliable for smartphone users)
      2. If WhatsApp fails after 10-15s, trigger SMS (works on feature phones)
      3. If SMS unavailable, trigger Voice OTP (works on any phone)

    All channels currently mocked for testing with dummy OTP "123456".
    """

    def __init__(
        self,
        whatsapp_api_key: Optional[str] = None,
        sms_api_key: Optional[str] = None,
        voice_api_key: Optional[str] = None,
        default_language: str = "en"
    ):
        self.whatsapp = WhatsAppProvider(api_key=whatsapp_api_key)
        self.sms = SMSProvider(api_key=sms_api_key)
        self.voice = VoiceOTPProvider(api_key=voice_api_key, language=default_language)
        self.default_language = default_language

    async def send_otp(
        self,
        phone: str,
        otp_code: str,
        user_language: Optional[str] = None,
        preferred_channel: Optional[OTPChannel] = None
    ) -> Dict[str, Any]:
        """
        Send OTP with intelligent fallback.

        Args:
            phone: Phone number with +91 prefix
            otp_code: 6-digit OTP code
            user_language: Optional language preference for voice OTP
            preferred_channel: Optional preferred channel (default: WhatsApp)

        Returns:
            {
                'success': bool,
                'primary_channel': str,  # Channel OTP was sent on
                'channels_attempted': list,  # All channels tried
                'message_id': str,
                'note': str,
                'timestamp': ISO8601
            }
        """

        channels_attempted = []
        language = user_language or self.default_language

        # Primary: WhatsApp
        logger.info(f"[OTP] Attempting to send OTP {otp_code} to {phone}")
        result = await self.whatsapp.send(phone, otp_code)
        channels_attempted.append(OTPChannel.WHATSAPP)

        if result["success"]:
            result["channels_attempted"] = channels_attempted
            logger.info(f"[OTP] ✓ WhatsApp OTP sent to {phone}")
            return result

        # Fallback 1: SMS (if WhatsApp failed)
        logger.warning(f"[OTP] WhatsApp failed for {phone}, trying SMS...")
        result = await self.sms.send(phone, otp_code)
        channels_attempted.append(OTPChannel.SMS)

        if result["success"]:
            result["channels_attempted"] = channels_attempted
            logger.info(f"[OTP] ✓ SMS OTP sent to {phone}")
            return result

        # Fallback 2: Voice (if SMS failed)
        logger.warning(f"[OTP] SMS failed for {phone}, trying Voice OTP...")
        result = await self.voice.send(phone, otp_code, language=language)
        channels_attempted.append(OTPChannel.VOICE)

        if result["success"]:
            result["channels_attempted"] = channels_attempted
            logger.info(f"[OTP] ✓ Voice OTP sent to {phone}")
            return result

        # All channels failed
        logger.error(f"[OTP] ✗ All OTP channels failed for {phone}")
        return {
            "success": False,
            "phone": phone,
            "channels_attempted": channels_attempted,
            "error": "All OTP delivery channels failed. Please try again.",
            "timestamp": datetime.utcnow().isoformat()
        }

    async def get_channel_status(self) -> Dict[str, Any]:
        """Get status of all OTP channels (for debugging)"""
        return {
            "whatsapp": {
                "provider": "MSG91",
                "mocked": self.whatsapp.is_mocked,
                "status": "configured" if not self.whatsapp.is_mocked else "mocked"
            },
            "sms": {
                "provider": "Exotel",
                "mocked": self.sms.is_mocked,
                "status": "configured" if not self.sms.is_mocked else "mocked"
            },
            "voice": {
                "provider": "Exotel IVR",
                "mocked": self.voice.is_mocked,
                "status": "configured" if not self.voice.is_mocked else "mocked",
                "languages_supported": list(self.voice.language_names.keys())
            },
            "timestamp": datetime.utcnow().isoformat()
        }


# Singleton instance (initialized in app.py)
otp_service: Optional[OTPService] = None


def init_otp_service(
    whatsapp_api_key: Optional[str] = None,
    sms_api_key: Optional[str] = None,
    voice_api_key: Optional[str] = None,
    default_language: str = "en"
) -> OTPService:
    """Initialize global OTP service"""
    global otp_service
    otp_service = OTPService(
        whatsapp_api_key=whatsapp_api_key,
        sms_api_key=sms_api_key,
        voice_api_key=voice_api_key,
        default_language=default_language
    )
    return otp_service


def get_otp_service() -> OTPService:
    """Get global OTP service instance"""
    global otp_service
    if otp_service is None:
        otp_service = OTPService()  # Initialize with defaults (all mocked)
    return otp_service
