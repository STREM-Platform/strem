"""Redis Streams consumer worker: awards XP from domain events.

Run as a separate process: `python -m app.worker`. It subscribes (via a consumer
group) to the logging streams, hands each message to `app.consumers.handle_event`
(idempotent), and acknowledges it. Failure handling follows
`strem-docs/architecture/event-driven-strategy.md`:

- **Idempotency** — dedupe by broker message id in `processed_events`.
- **Retry** — a handler error leaves the message un-acked; it is reclaimed and
  retried on the next reclaim pass.
- **Dead-letter** — a malformed event, or one that fails more than
  `MAX_DELIVERIES` times, is moved to `<stream>.dead` and acked.

The `tribe.checkin_completed` stream is subscribed now and simply stays idle
until the community service (Wave 2) starts publishing.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from app.config import get_settings
from app.consumers import CONSUMED_STREAMS, MalformedEventError, handle_event
from app.db import configure, session_factory
from app.events import RedisStreamPublisher

logger = logging.getLogger("strem_user_service.worker")

GROUP = "user-service"
CONSUMER = "user-service-worker"
DEAD_SUFFIX = ".dead"
MAX_DELIVERIES = 5
BLOCK_MS = 5000
RECLAIM_IDLE_MS = 60_000


async def _ensure_groups(redis: Any) -> None:
    """Create the consumer group on each stream (idempotent, MKSTREAM)."""
    for stream in CONSUMED_STREAMS:
        try:
            await redis.xgroup_create(stream, GROUP, id="0", mkstream=True)
        except Exception as exc:  # noqa: BLE001 - redis raises a generic error for BUSYGROUP
            if "BUSYGROUP" not in str(exc):
                raise


def _decode_payload(fields: dict[str, str]) -> dict[str, Any]:
    data = fields.get("data")
    if data is None:
        raise MalformedEventError("event is missing the 'data' field")
    parsed: dict[str, Any] = json.loads(data)
    return parsed


async def _dead_letter(redis: Any, stream: str, message_id: str, reason: str) -> None:
    await redis.xadd(stream + DEAD_SUFFIX, {"source_id": message_id, "reason": reason})
    await redis.xack(stream, GROUP, message_id)
    logger.warning("dead-lettered %s %s: %s", stream, message_id, reason)


async def _process(redis: Any, publisher: RedisStreamPublisher, stream: str, message_id: str,
                   fields: dict[str, str]) -> None:
    """Handle a single message; ack on success, dead-letter if malformed."""
    try:
        payload = _decode_payload(fields)
    except (MalformedEventError, json.JSONDecodeError) as exc:
        await _dead_letter(redis, stream, message_id, f"unparseable: {exc}")
        return

    try:
        async with session_factory()() as session:
            await handle_event(
                session, publisher, stream=stream, message_id=message_id, payload=payload
            )
    except MalformedEventError as exc:
        await _dead_letter(redis, stream, message_id, str(exc))
        return

    await redis.xack(stream, GROUP, message_id)


async def _read_new(redis: Any, publisher: RedisStreamPublisher) -> None:
    streams = {stream: ">" for stream in CONSUMED_STREAMS}
    response = await redis.xreadgroup(GROUP, CONSUMER, streams, count=20, block=BLOCK_MS)
    for stream, messages in response or []:
        for message_id, fields in messages:
            await _process(redis, publisher, stream, message_id, fields)


async def _reclaim_pending(redis: Any, publisher: RedisStreamPublisher) -> None:
    """Retry stale pending messages; dead-letter ones that exceed MAX_DELIVERIES."""
    for stream in CONSUMED_STREAMS:
        pending = await redis.xpending_range(
            stream, GROUP, idle=RECLAIM_IDLE_MS, min="-", max="+", count=50
        )
        for entry in pending:
            message_id = entry["message_id"]
            if entry["times_delivered"] > MAX_DELIVERIES:
                await _dead_letter(redis, stream, message_id, "exceeded max delivery attempts")
                continue
            claimed = await redis.xclaim(stream, GROUP, CONSUMER, RECLAIM_IDLE_MS, [message_id])
            for claimed_id, fields in claimed:
                await _process(redis, publisher, stream, claimed_id, fields)


async def run_consumer() -> None:
    """Main consume loop. Runs until cancelled."""
    settings = get_settings()
    configure(settings.database_url)
    publisher = RedisStreamPublisher(settings.message_broker_url)

    from redis.asyncio import from_url

    redis: Any = from_url(settings.message_broker_url, decode_responses=True)
    await _ensure_groups(redis)
    logger.info("user-service worker consuming: %s", ", ".join(CONSUMED_STREAMS))

    try:
        while True:
            await _read_new(redis, publisher)
            await _reclaim_pending(redis, publisher)
    finally:
        await redis.aclose()


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_consumer())


if __name__ == "__main__":
    main()
