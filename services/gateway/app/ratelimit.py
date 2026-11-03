"""Fixed-window rate limiting for the gateway edge.

Two interchangeable implementations behind one tiny interface:
- `RedisRateLimiter` — shared across gateway instances via Redis `INCR`/`EXPIRE`.
  It **fails open**: if Redis is unreachable the request is allowed, so the
  limiter can never take the gateway down.
- `InMemoryRateLimiter` — per-process fallback used when no Redis is configured,
  and in tests.

Keys are scoped (`ip:<addr>`, `tok:<hash>`) so a single abusive client cannot
exhaust the budget for everyone.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Protocol

from redis.asyncio import Redis
from redis.exceptions import RedisError


@dataclass(frozen=True)
class RateDecision:
    allowed: bool
    retry_after: int


class RateLimiter(Protocol):
    async def hit(self, key: str) -> RateDecision: ...


class InMemoryRateLimiter:
    """Fixed-window counter in process memory (local fallback + tests)."""

    def __init__(self, limit: int, window_seconds: int) -> None:
        self._limit = limit
        self._window = window_seconds
        self._hits: dict[str, tuple[int, float]] = {}

    async def hit(self, key: str) -> RateDecision:
        now = time.monotonic()
        count, reset = self._hits.get(key, (0, now + self._window))
        if now >= reset:
            count, reset = 0, now + self._window
        count += 1
        self._hits[key] = (count, reset)
        if count > self._limit:
            return RateDecision(allowed=False, retry_after=max(1, int(reset - now)))
        return RateDecision(allowed=True, retry_after=0)


class RedisRateLimiter:
    """Fixed-window counter shared across instances via Redis; fails open."""

    def __init__(self, redis: Redis, limit: int, window_seconds: int) -> None:
        self._redis = redis
        self._limit = limit
        self._window = window_seconds

    async def hit(self, key: str) -> RateDecision:
        window = self._window
        now = int(time.time())
        redis_key = f"strem:rl:{key}:{now // window}"
        try:
            count = await self._redis.incr(redis_key)
            if count == 1:
                await self._redis.expire(redis_key, window)
        except (RedisError, OSError):
            # Fail open — availability beats strict limiting at the edge.
            return RateDecision(allowed=True, retry_after=0)
        if count > self._limit:
            return RateDecision(allowed=False, retry_after=window - (now % window))
        return RateDecision(allowed=True, retry_after=0)
