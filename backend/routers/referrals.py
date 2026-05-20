from fastapi import APIRouter, Depends

from ..auth import get_current_user
from ..security import referral_read_limit

router = APIRouter(prefix="/api/referrals", tags=["referrals"])


@router.get("/my-code")
async def get_my_referral_code(
    user: dict = Depends(get_current_user),
    _: None = Depends(referral_read_limit),
):
    code = user.get("referral_code") or ""
    return {
        "code": code,
        "count": int(user.get("referral_count") or 0),
        "share_url": f"https://kaamnow.com/join?ref={code}" if code else "",
    }


@router.get("/stats")
async def get_referral_stats(
    user: dict = Depends(get_current_user),
    _: None = Depends(referral_read_limit),
):
    count = int(user.get("referral_count") or 0)
    return {"referral_count": count, "bonus_days_earned": count}
