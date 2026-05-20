import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..db import db
from ..engagements import _notify
from ..security import wallet_read_limit
from ..utils import utc_now_iso

router = APIRouter(prefix="/api/wallet", tags=["wallet"])


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


async def credit_wallet(
    user_id: str,
    amount: int,
    reason: str,
    ref_id: Optional[str] = None,
) -> dict:
    if amount <= 0:
        raise ValueError("amount must be positive")

    now = utc_now_iso()
    tx = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "credit",
        "amount": int(amount),
        "reason": reason,
        "ref_id": ref_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=90)).isoformat(),
        "expired": False,
        "created_at": now,
    }
    await db.wallet_transactions.insert_one(tx)
    await db.users.update_one({"id": user_id}, {"$inc": {"wallet_balance": int(amount)}})
    await _notify(
        user_id,
        f"Wallet credited: Rs {amount}",
        "Your KaamNow wallet has new credits.",
        "wallet_credited",
        ref_id or tx["id"],
    )
    tx.pop("_id", None)
    return tx


async def debit_wallet(
    user_id: str,
    amount: int,
    reason: str,
    ref_id: Optional[str] = None,
) -> dict:
    if amount <= 0:
        raise ValueError("amount must be positive")

    user = await db.users.find_one({"id": user_id}, {"_id": 0, "wallet_balance": 1})
    balance = int((user or {}).get("wallet_balance") or 0)
    if balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")

    now = utc_now_iso()
    tx = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "debit",
        "amount": int(amount),
        "reason": reason,
        "ref_id": ref_id,
        "expires_at": None,
        "expired": False,
        "created_at": now,
    }
    await db.wallet_transactions.insert_one(tx)
    await db.users.update_one({"id": user_id}, {"$inc": {"wallet_balance": -int(amount)}})
    tx.pop("_id", None)
    return tx


async def expire_wallet_credits(limit: int = 200) -> int:
    now = datetime.now(timezone.utc)
    candidates = (
        await db.wallet_transactions.find(
            {"type": "credit", "expired": False, "expires_at": {"$lt": now.isoformat()}},
            {"_id": 0},
        )
        .sort("expires_at", 1)
        .limit(limit)
        .to_list(limit)
    )

    expired = 0
    for tx in candidates:
        expires_at = _parse_dt(tx.get("expires_at"))
        if expires_at and expires_at > now:
            continue
        await db.wallet_transactions.update_one(
            {"id": tx["id"]}, {"$set": {"expired": True, "expired_at": utc_now_iso()}}
        )
        user = await db.users.find_one({"id": tx["user_id"]}, {"_id": 0, "wallet_balance": 1})
        balance = int((user or {}).get("wallet_balance") or 0)
        if balance > 0:
            await debit_wallet(
                tx["user_id"],
                min(balance, int(tx.get("amount") or 0)),
                "expiry",
                tx["id"],
            )
        expired += 1
    return expired


@router.get("/balance")
async def get_wallet_balance(
    user: dict = Depends(get_current_user),
    _: None = Depends(wallet_read_limit),
):
    return {"balance": int(user.get("wallet_balance") or 0), "currency": "INR"}


@router.get("/transactions")
async def list_wallet_transactions(
    user: dict = Depends(get_current_user),
    _: None = Depends(wallet_read_limit),
):
    docs = (
        await db.wallet_transactions.find({"user_id": user["id"]}, {"_id": 0})
        .sort("created_at", -1)
        .limit(50)
        .to_list(50)
    )
    return {"items": docs}
