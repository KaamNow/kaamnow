from collections import defaultdict, deque
from time import monotonic

from fastapi import HTTPException, Request

_RATE_BUCKETS: dict[str, deque[float]] = defaultdict(deque)


def _client_key(request: Request, scope: str) -> str:
    user_id = getattr(request.state, "user_id", None)
    host = request.client.host if request.client else "unknown"
    return f"{scope}:{user_id or host}"


async def rate_limit(
    request: Request,
    scope: str,
    max_calls: int = 30,
    window_seconds: int = 60,
) -> None:
    now = monotonic()
    bucket = _RATE_BUCKETS[_client_key(request, scope)]
    while bucket and now - bucket[0] > window_seconds:
        bucket.popleft()
    if len(bucket) >= max_calls:
        raise HTTPException(status_code=429, detail="Too many requests")
    bucket.append(now)


async def chat_write_limit(request: Request) -> None:
    await rate_limit(request, "chat_write", max_calls=20, window_seconds=60)


async def report_write_limit(request: Request) -> None:
    await rate_limit(request, "report_write", max_calls=5, window_seconds=300)


async def wallet_read_limit(request: Request) -> None:
    await rate_limit(request, "wallet_read", max_calls=60, window_seconds=60)


async def referral_read_limit(request: Request) -> None:
    await rate_limit(request, "referral_read", max_calls=60, window_seconds=60)
