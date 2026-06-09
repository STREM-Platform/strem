"""Tests for Redis worker polling behavior."""

import asyncio

from redis.exceptions import TimeoutError as RedisTimeoutError

from app import worker
from app.events import InMemoryPublisher


class TimeoutRedis:
    async def xreadgroup(self, *_: object, **__: object) -> None:
        raise RedisTimeoutError("idle poll timed out")


def test_read_new_treats_redis_timeout_as_idle_poll() -> None:
    asyncio.run(worker._read_new(TimeoutRedis(), InMemoryPublisher()))
