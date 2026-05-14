"""
whatsapp_notify.py — Outbound WhatsApp notification helpers for KaamNow

Sends booking/job notifications to workers and customers via Gupshup.
Only fires when FEATURE_WHATSAPP_NOTIFICATIONS=true in env.

Usage:
    from .whatsapp_notify import notify_worker_new_booking, notify_customer_booking_accepted
    await notify_worker_new_booking(worker_phone, booking_data)
"""

import json
import logging

import requests

from .config import settings

logger = logging.getLogger(__name__)


def _is_enabled() -> bool:
    return settings.feature_whatsapp_notifications


def _send(destination: str, text: str) -> bool:
    """
    Send a WhatsApp message via Gupshup.
    Returns True on success, False on failure (non-raising — notifications should never block core flows).
    """
    if not _is_enabled():
        logger.debug("WhatsApp notifications disabled. Would have sent to %s: %s", destination, text[:60])
        return False

    if not all([settings.gupshup_api_url, settings.gupshup_api_key, settings.gupshup_source]):
        logger.warning("Gupshup not configured — notification skipped for %s", destination)
        return False

    # Strip non-digits, ensure country code
    phone = "".join(c for c in destination if c.isdigit())
    if not phone:
        logger.warning("Invalid phone number for WhatsApp notification: %s", destination)
        return False
    if not phone.startswith("91") and len(phone) == 10:
        phone = "91" + phone

    payload = {
        "channel": settings.gupshup_channel,
        "source": settings.gupshup_source,
        "destination": phone,
        "message": json.dumps({"type": "text", "text": text}),
    }
    if getattr(settings, "gupshup_app_id", None):
        payload["src.name"] = settings.gupshup_app_id

    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": settings.gupshup_api_key,
    }

    try:
        resp = requests.post(settings.gupshup_api_url, data=payload, headers=headers, timeout=10)
        resp.raise_for_status()
        logger.info("✅ WhatsApp sent to %s", phone)
        return True
    except Exception as exc:
        logger.error("❌ WhatsApp send failed to %s: %s", phone, exc)
        return False


# ─── Notification Templates ─────────────────────────────────────────────────

def notify_worker_new_booking(phone: str, booking: dict) -> bool:
    """
    Notifies a worker that a customer has booked them.
    Sent when booking status transitions to 'requested'.
    """
    msg = (
        f"🔔 New booking request on KaamNow!\n\n"
        f"📋 Job: {booking.get('job_title', 'Job')}\n"
        f"👤 Customer: {booking.get('customer_name', 'Customer')}\n"
        f"📅 Date: {booking.get('job_date', 'TBD')}\n"
        f"💰 Daily rate: ₹{booking.get('daily_rate', '?')}\n\n"
        f"Reply *ACCEPT* or *REJECT* or visit kaamnow.com/worker/dashboard to respond.\n\n"
        f"_You have 2 hours to respond before it auto-expires._"
    )
    return _send(phone, msg)


def notify_worker_job_alert(phone: str, job: dict) -> bool:
    """
    Sends a job alert to a worker when a matching job is posted nearby.
    """
    msg = (
        f"💼 New job near you on KaamNow!\n\n"
        f"📋 {job.get('title', 'Job posting')}\n"
        f"📍 {job.get('village', 'Nearby')}\n"
        f"💰 ₹{job.get('daily_rate', '?')}/day\n"
        f"👷 Workers needed: {job.get('workers_needed', 1)}\n"
        f"📅 Date: {job.get('job_date', 'TBD')}\n\n"
        f"Reply *INTEREST* to express interest, or visit kaamnow.com/worker/job-feed"
    )
    return _send(phone, msg)


def notify_customer_booking_accepted(phone: str, booking: dict) -> bool:
    """
    Notifies a customer that a worker has accepted their booking.
    """
    msg = (
        f"✅ Great news! Your booking was accepted on KaamNow!\n\n"
        f"👷 Worker: {booking.get('worker_name', 'Worker')}\n"
        f"📋 Job: {booking.get('job_title', 'Job')}\n"
        f"📅 Date: {booking.get('job_date', 'TBD')}\n"
        f"💰 Rate: ₹{booking.get('daily_rate', '?')}/day\n\n"
        f"Visit kaamnow.com/dashboard to view details and mark job as complete."
    )
    return _send(phone, msg)


def notify_customer_booking_rejected(phone: str, booking: dict) -> bool:
    """
    Notifies a customer that a worker rejected their booking.
    """
    msg = (
        f"⚠️ Update from KaamNow:\n\n"
        f"The worker was unable to accept your booking for *{booking.get('job_title', 'your job')}* "
        f"on {booking.get('job_date', 'the requested date')}.\n\n"
        f"Visit kaamnow.com/marketplace to find other available workers nearby."
    )
    return _send(phone, msg)


def notify_worker_job_completed(phone: str, booking: dict) -> bool:
    """Notifies a worker that a job has been marked as completed."""
    msg = (
        f"🎉 Job completed on KaamNow!\n\n"
        f"📋 {booking.get('job_title', 'Your job')} has been marked complete by the customer.\n"
        f"⭐ You'll receive a rating shortly.\n\n"
        f"Keep up the great work! Visit kaamnow.com/worker/dashboard to view your profile."
    )
    return _send(phone, msg)


def notify_customer_work_completed(phone: str, engagement: dict) -> bool:
    """Customer gets WhatsApp when worker marks job complete — prompts rating."""
    msg = (
        f"✅ काम पूरा हो गया!\n\n"
        f"👷 Worker: {engagement.get('worker_name', 'Worker')}\n"
        f"📋 Job: {engagement.get('job_title', 'Your job')}\n"
        f"💰 ₹{engagement.get('daily_rate', '')}/day\n\n"
        f"Worker को rate करें → kaamnow.com/dashboard\n"
        f"काम की बात, KaamNow के साथ 🙏"
    )
    return _send(phone, msg)


def notify_worker_rating_received(phone: str, rating: int, comment: str, job_title: str) -> bool:
    """Worker gets WhatsApp when customer leaves a rating."""
    stars = "⭐" * rating
    msg = (
        f"{stars} आपको {rating}/5 rating मिली!\n\n"
        f"📋 Job: {job_title}\n"
        + (f'💬 "{comment}"\n\n' if comment else "\n")
        + f"काम की बात, KaamNow के साथ 🙏"
    )
    return _send(phone, msg)
