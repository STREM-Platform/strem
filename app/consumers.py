"""Domain-event consumers that turn logged actions and progression into XP.

This module owns the *handling* of a single event (mapping it to XP awards and
applying them idempotently). The Redis Streams transport — consumer groups,
retry, and dead-lettering — lives in `app/worker.py`.

Streams consumed:
- `training.session_logged` / `nutrition.day_logged` / `tribe.checkin_completed`
  → log XP (game-systems.md weights).
- `ai.mission_completed` → `mission_complete` XP (the event's `xp_reward`, 75-150).
- `tribe.challenge_completed` → `challenge_complete` XP, the tribe collective
  pool distributed across the participating members.

After any award, 7-day and 30-day consistency streak bonuses are detected and
awarded once per user. Idempotency: the broker message id is recorded in
`processed_events`, so a redelivered message is a no-op.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events import EventPublisher
from app.models import ProcessedEvent, UserProfile, XPLedgerEntry
from app.progression import award_xp
from app.schemas.enums import OnboardingStatusValue
from app.schemas.xp import XP_FIXED, XPSource

TRAINING_STREAM = "training.session_logged"
NUTRITION_STREAM = "nutrition.day_logged"
TRIBE_STREAM = "tribe.checkin_completed"
MISSION_COMPLETED_STREAM = "ai.mission_completed"
CHALLENGE_COMPLETED_STREAM = "tribe.challenge_completed"
CONSUMED_STREAMS = (
    TRAINING_STREAM,
    NUTRITION_STREAM,
    TRIBE_STREAM,
    MISSION_COMPLETED_STREAM,
    CHALLENGE_COMPLETED_STREAM,
)

# training.session_logged `session_type` -> XP source.
_TRAINING_SOURCE: dict[str, XPSource] = {
    "strength": XPSource.STRENGTH_SESSION,
    "running": XPSource.RUNNING_SESSION,
    "mobility": XPSource.MOBILITY_RECOVERY,
}

# MVP mission/challenge XP bounds (game-systems.md / user contract).
_MISSION_XP_MIN, _MISSION_XP_MAX = 75, 150
# Tribe collective challenge pool (150-500), distributed across participants.
_TRIBE_CHALLENGE_POOL = 300


class MalformedEventError(Exception):
    """Raised when an event payload cannot be mapped to an XP award."""


@dataclass(frozen=True)
class EventXP:
    """The XP award a log event maps to."""

    user_id: uuid.UUID
    source: XPSource
    amount: int


def map_event_to_xp(stream: str, payload: dict[str, Any]) -> EventXP:
    """Map a logging event to its XP source and amount (game-systems.md weights)."""
    user_id = _require_uuid(stream, payload, "user_id")
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
        raise MalformedEventError(f"unhandled log stream {stream!r}")
    return EventXP(user_id=user_id, source=source, amount=XP_FIXED[source])


def _require_uuid(stream: str, payload: dict[str, Any], key: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(payload[key]))
    except (KeyError, ValueError) as exc:
        raise MalformedEventError(f"{stream}: missing or invalid {key}") from exc


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


def _longest_active_run(days: set[date]) -> int:
    if not days:
        return 0
    ordered = sorted(days)
    best = run = 1
    for prev, current in zip(ordered, ordered[1:], strict=False):
        run = run + 1 if (current - prev).days == 1 else 1
        best = max(best, run)
    return best


async def _award_streak_bonuses(
    session: AsyncSession, publisher: EventPublisher, user_id: uuid.UUID
) -> None:
    """Award 7-day / 30-day consistency streak bonuses once per user."""
    timestamps = (
        await session.scalars(
            select(XPLedgerEntry.earned_at).where(XPLedgerEntry.user_id == user_id)
        )
    ).all()
    run = _longest_active_run({ts.date() for ts in timestamps})

    earned = set(
        (
            await session.scalars(
                select(XPLedgerEntry.source).where(
                    XPLedgerEntry.user_id == user_id,
                    XPLedgerEntry.source.in_(
                        [XPSource.STREAK_7_DAY.value, XPSource.STREAK_30_DAY.value]
                    ),
                )
            )
        ).all()
    )
    completed = await _onboarding_completed(session, user_id)

    if run >= 7 and XPSource.STREAK_7_DAY.value not in earned:
        await award_xp(
            session,
            publisher,
            user_id=user_id,
            source=XPSource.STREAK_7_DAY,
            amount=XP_FIXED[XPSource.STREAK_7_DAY],
            source_reference="streak_7_day",
            onboarding_completed=completed,
        )
    if run >= 30 and XPSource.STREAK_30_DAY.value not in earned:
        await award_xp(
            session,
            publisher,
            user_id=user_id,
            source=XPSource.STREAK_30_DAY,
            amount=XP_FIXED[XPSource.STREAK_30_DAY],
            source_reference="streak_30_day",
            onboarding_completed=completed,
        )


async def _award(
    session: AsyncSession,
    publisher: EventPublisher,
    *,
    user_id: uuid.UUID,
    source: XPSource,
    amount: int,
    source_reference: str,
) -> None:
    await award_xp(
        session,
        publisher,
        user_id=user_id,
        source=source,
        amount=amount,
        source_reference=source_reference,
        onboarding_completed=await _onboarding_completed(session, user_id),
    )
    await _award_streak_bonuses(session, publisher, user_id)


async def handle_event(
    session: AsyncSession,
    publisher: EventPublisher,
    *,
    stream: str,
    message_id: str,
    payload: dict[str, Any],
) -> bool:
    """Award XP for one event, idempotently. Returns True if newly applied."""
    if await _already_processed(session, stream, message_id):
        return False

    reference = f"{stream}:{message_id}"
    if stream in (TRAINING_STREAM, NUTRITION_STREAM, TRIBE_STREAM):
        mapping = map_event_to_xp(stream, payload)
        await _award(
            session,
            publisher,
            user_id=mapping.user_id,
            source=mapping.source,
            amount=mapping.amount,
            source_reference=reference,
        )
    elif stream == MISSION_COMPLETED_STREAM:
        user_id = _require_uuid(stream, payload, "user_id")
        amount = _bounded_int(stream, payload, "xp_reward", _MISSION_XP_MIN, _MISSION_XP_MAX)
        await _award(
            session,
            publisher,
            user_id=user_id,
            source=XPSource.MISSION_COMPLETE,
            amount=amount,
            source_reference=reference,
        )
    elif stream == CHALLENGE_COMPLETED_STREAM:
        await _handle_challenge(session, publisher, message_id=message_id, payload=payload)
    else:
        raise MalformedEventError(f"unhandled stream {stream!r}")

    session.add(ProcessedEvent(stream=stream, message_id=message_id))
    await session.commit()
    return True


def _bounded_int(
    stream: str, payload: dict[str, Any], key: str, low: int, high: int
) -> int:
    try:
        value = int(payload[key])
    except (KeyError, ValueError, TypeError) as exc:
        raise MalformedEventError(f"{stream}: missing or invalid {key}") from exc
    return max(low, min(value, high))


async def _handle_challenge(
    session: AsyncSession,
    publisher: EventPublisher,
    *,
    message_id: str,
    payload: dict[str, Any],
) -> None:
    """Distribute the tribe collective challenge pool across participating members."""
    raw_participants = payload.get("participant_user_ids")
    if not isinstance(raw_participants, list) or not raw_participants:
        raise MalformedEventError(f"{CHALLENGE_COMPLETED_STREAM}: missing participant_user_ids")
    try:
        participants = [uuid.UUID(str(p)) for p in raw_participants]
    except ValueError as exc:
        raise MalformedEventError(
            f"{CHALLENGE_COMPLETED_STREAM}: invalid participant id"
        ) from exc

    share = max(_TRIBE_CHALLENGE_POOL // len(participants), 1)
    for participant in participants:
        await _award(
            session,
            publisher,
            user_id=participant,
            source=XPSource.CHALLENGE_COMPLETE,
            amount=share,
            source_reference=f"{CHALLENGE_COMPLETED_STREAM}:{message_id}:{participant}",
        )
