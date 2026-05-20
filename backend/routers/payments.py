import uuid

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..config import settings
from ..db import db
from ..engagements import _notify
from ..payment_service import create_order, verify_signature
from ..schemas import PaymentVerifyIn
from ..utils import utc_now_iso

router = APIRouter(prefix="/api/payments", tags=["payments"])


def _ensure_payments_enabled() -> None:
    if not settings.feature_payments:
        raise HTTPException(status_code=503, detail="Payments are disabled")


async def _payment_parties(engagement: dict) -> tuple[str, str]:
    worker = await db.workers.find_one({"id": engagement.get("worker_id")}, {"_id": 0})
    if not worker or not worker.get("user_id"):
        raise HTTPException(status_code=404, detail="Worker not found")
    return engagement["customer_id"], worker["user_id"]


@router.post("/create-order")
async def create_payment_order(body: dict, user: dict = Depends(get_current_user)):
    _ensure_payments_enabled()
    engagement_id = body.get("engagement_id")
    if not engagement_id:
        raise HTTPException(status_code=400, detail="engagement_id required")
    engagement = await db.engagements.find_one({"id": engagement_id}, {"_id": 0})
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")
    if engagement.get("customer_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Only the customer can pay")

    amount = int(engagement.get("payment_amount") or engagement.get("daily_rate") or 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount missing")
    payer_id, payee_id = await _payment_parties(engagement)
    order = create_order(amount, receipt=engagement_id)
    now = utc_now_iso()
    payment = {
        "id": str(uuid.uuid4()),
        "engagement_id": engagement_id,
        "payer_id": payer_id,
        "payee_id": payee_id,
        "amount": amount,
        "currency": "INR",
        "razorpay_order_id": order["id"],
        "razorpay_payment_id": None,
        "status": "created",
        "created_at": now,
        "updated_at": now,
    }
    await db.payments.insert_one(payment)
    await db.engagements.update_one(
        {"id": engagement_id},
        {"$set": {"payment_status": "created", "payment_amount": amount, "updated_at": now}},
    )
    return {
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order.get("currency", "INR"),
        "key_id": settings.razorpay_key_id,
    }


@router.post("/verify")
async def verify_payment(body: PaymentVerifyIn, user: dict = Depends(get_current_user)):
    _ensure_payments_enabled()
    payment = await db.payments.find_one({"razorpay_order_id": body.razorpay_order_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.get("payer_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Only the payer can verify this payment")
    if not verify_signature(
        body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature
    ):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    now = utc_now_iso()
    await db.payments.update_one(
        {"id": payment["id"]},
        {
            "$set": {
                "status": "paid",
                "razorpay_payment_id": body.razorpay_payment_id,
                "updated_at": now,
            }
        },
    )
    await db.engagements.update_one(
        {"id": payment["engagement_id"]},
        {
            "$set": {
                "payment_status": "paid",
                "payment_id": body.razorpay_payment_id,
                "updated_at": now,
            }
        },
    )
    await _notify(
        payment["payee_id"],
        "Payment received",
        f"Rs {payment['amount']} received for your KaamNow job.",
        "payment_received",
        payment["engagement_id"],
    )
    return {"success": True}


@router.get("/history")
async def payment_history(user: dict = Depends(get_current_user)):
    _ensure_payments_enabled()
    items = (
        await db.payments.find(
            {"$or": [{"payer_id": user["id"]}, {"payee_id": user["id"]}]}, {"_id": 0}
        )
        .sort("created_at", -1)
        .limit(100)
        .to_list(100)
    )
    return {"items": items}
