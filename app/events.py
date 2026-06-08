"""Domain-event publishing to Redis Streams.

Per `strem-docs/architecture/event-driven-strategy.md`, MVP uses Redis Streams.
The event name (`user.xp_earned`, `user.rank_achieved`, `user.medal_earned`) is
the stream key; the payload is stored as a single JSON `data` field so consumers
can parse the versioned schema without depending on Redis field layout.

`InMemoryPublisher` lets tests assert published events without a live broker.
"""

from __future__ import annotations

import json
from typing import Any, Protocol


class EventPublisher(Protocol):
    """Publishes a domain event payload to a named stream."""

    async def publish(self, stream: str, payload: dict[str, Any]) -> None: ...


class RedisStreamPublisher:
    """Publishes events to Redis Streams (`XADD <stream> * data <json>`)."""

    def __init__(self, url: str) -> None:
        self._url = url
        self._redis: Any | None = None

    async def publish(self, stream: str, payload: dict[str, Any]) -> None:
        if self._redis is None:
            from redis.asyncio import from_url

            self._redis = from_url(self._url)
        await self._redis.xadd(stream, {"data": json.dumps(payload)})


class InMemoryPublisher:
    """Test/double publisher that records events instead of sending them."""

    def __init__(self) -> None:
        self.events: list[tuple[str, dict[str, Any]]] = []

    async def publish(self, stream: str, payload: dict[str, Any]) -> None:
        self.events.append((stream, payload))

    def of_type(self, stream: str) -> list[dict[str, Any]]:
        """Return payloads published to a given stream."""
        return [payload for name, payload in self.events if name == stream]


# Module-level publisher, configured at application startup.
_publisher: EventPublisher | None = None


def configure_publisher(url: str) -> None:
    """Bind the module-level publisher to a Redis Streams broker."""
    global _publisher
    _publisher = RedisStreamPublisher(url)


def set_publisher(publisher: EventPublisher) -> None:
    """Override the module-level publisher (used by tests)."""
    global _publisher
    _publisher = publisher


def get_publisher() -> EventPublisher:
    """Return the configured publisher (FastAPI dependency)."""
    if _publisher is None:
        raise RuntimeError("Event publisher is not configured. Call configure_publisher().")
    return _publisher
