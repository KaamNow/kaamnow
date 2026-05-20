import hashlib
import hmac
from typing import Optional

from .config import settings

_razorpay_client = None


def get_client():
    global _razorpay_client
    if _razorpay_client is not None:
        return _razorpay_client
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        return None
    try:
        import razorpay

        _razorpay_client = razorpay.Client(
            auth=(settings.razorpay_key_id, settings.razorpay_key_secret)
        )
        return _razorpay_client
    except Exception:
        return None


def create_order(amount_rupees: int, receipt: Optional[str] = None) -> dict:
    amount_paise = int(amount_rupees) * 100
    client = get_client()
    if not client:
        return {
            "id": f"order_dev_{receipt or 'kaamnow'}",
            "amount": amount_paise,
            "currency": "INR",
        }
    return client.order.create(
        {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
        }
    )


def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    if not settings.razorpay_key_secret:
        return signature == "dev_signature"
    message = f"{order_id}|{payment_id}".encode()
    digest = hmac.new(settings.razorpay_key_secret.encode(), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, signature)
