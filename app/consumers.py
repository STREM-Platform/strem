"""Domain-event consumers that turn logged actions into XP.

This module owns the *handling* of a single event (mapping it to an XP award and
applying it idempotently). The Redis Streams transport — consumer groups, retry,
and dead-lettering — lives in `app/worker.py`, so the mapping and idempotency
logic stay easy to unit-test.

Idempotency: the broker message id is the event identity. Each handled event is
recorded in `processed_events` in the same transaction as the XP award, so a
redelivered message is a no-op. The ledger entry's `source_reference` is
`"<stream>:<message_id>"`, tying every award back to the event that caused it.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events import EventPublisher
from app.models import ProcessedEvent, UserProfile
from app.progression import award_xp
from app.schemas.enums import OnboardingStatusValue
from app.schemas.xp import XP_FIXED, XPSource

# Streams this service consumes (event names == stream keys).
TRAINING_STREAM = "training.session_logged"
NUTRITION_STREAM = "nutrition.day_logged"
TRIBE_STREAM = "tribe.checkin_completed"
CONSUMED_STREAMS = (TRAINING_STREAM, NUTRITION_STREAM, TRIBE_STREAM)

# training.session_logged `session_type` -> XP source.
_TRAINING_SOURCE: dict[str, XPSource] = {
    "strength": XPSource.STRENGTH_SESSION,
    "running": XPSource.RUNNING_SESSION,
    "mobility": XPSource.MOBILITY_RECOVERY,
}


class MalformedEventError(Exception):
    """Raised when an event payload cannot be mapped to an XP award."""


@dataclass(frozen=True)
class EventXP:
    """The XP award an event maps to."""

    user_id: uuid.UUID
    source: XPSource
    amount: int


def map_event_to_xp(stream: str, payload: dict[str, Any]) -> EventXP:
    """Map a domain event to its XP source and amount (game-systems.md weights)."""
    try:
        user_id = uuid.UUID(str(payload["user_id"]))
    except (KeyError, ValueError) as exc:
        raise MalformedEventError(f"{stream}: missing or invalid user_id") from exc

    if stream == TRAINING_STREAM:
        session_type = str(payload.get("session_type", ""))
        source = _TRAINING_SOURCE.get(session_type)
        if source is None:
            raise MalformedEventError(f"{stream}: unknown session_type {session_type!r}")
    elif stream == NUTRITION_STREAM:
        source = XPSource.NUTRITION_DAY
    elif stream == TRIBE_STREAM:
        source = XPSource.TRIBE_CHECKIN
    else:
        raise MalformedEventError(f"unhandled stream {stream!r}")

    return EventXP(user_id=user_id, source=source, amount=XP_FIXED[source])


async def _already_processed(session: AsyncSession, stream: str, message_id: str) -> bool:
    existing = await session.scalar(
        select(ProcessedEvent.id).where(
            ProcessedEvent.stream == stream, ProcessedEvent.message_id == message_id
        )
    )
    return existing is not None


async def _onboarding_completed(session: AsyncSession, user_id: uuid.UUID) -> bool:
    status = await session.scalar(
        select(UserProfile.onboarding_status).where(UserProfile.id == user_id)
    )
    return status == OnboardingStatusValue.COMPLETED.value


async def handle_event(
    session: AsyncSession,
    publisher: EventPublisher,
    *,
    stream: str,
    message_id: str,
    payload: dict[str, Any],
) -> bool:
    """Award XP for one event, idempotently. Returns True if newly applied.

    Commits on success (award + processed-event marker in one transaction).
    Raises `MalformedEventError` for unmappable payloads so the caller can
    dead-letter them.
    """
    if await _already_processed(session, stream, message_id):
        return False

    mapping = map_event_to_xp(stream, payload)
    await award_xp(
        session,
        publisher,
        user_id=mapping.user_id,
        source=mapping.source,
        amount=mapping.amount,
        source_reference=f"{stream}:{message_id}",
        onboarding_completed=await _onboarding_completed(session, mapping.user_id),
    )
    session.add(ProcessedEvent(stream=stream, message_id=message_id))
    await session.commit()
    return True
