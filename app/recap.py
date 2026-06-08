"""Weekly coaching recap: an identity-grounded narrative, not a dashboard.

Generation composes the narrative, applies the safety filter, persists the
recap, and publishes `ai.coach_summary_created`. The read endpoints surface the
latest recap and the history. (Generation is intended to run weekly from a
scheduled worker; it is also called directly in tests.)
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.context import ContextBundle
from app.enums import MissionState
from app.errors import AppError
from app.events import EventPublisher
from app.generator import generate_recap_narrative
from app.models import AIResponseMetadata, Mission, WeeklyRecap
from app.safety import detect_unsafe
from app.schemas import WeeklyRecap as WeeklyRecapSchema

GENERATOR_VERSION = "rule-based-1"


def _to_schema(recap: WeeklyRecap) -> WeeklyRecapSchema:
    return WeeklyRecapSchema.model_validate(recap, from_attributes=True)


async def _completed_count(session: AsyncSession, user_id: uuid.UUID) -> int:
    count = await session.scalar(
        select(func.count())
        .select_from(Mission)
        .where(Mission.user_id == user_id, Mission.state == MissionState.COMPLETED.value)
    )
    return int(count or 0)


async def generate_weekly_recap(
    session: AsyncSession,
    publisher: EventPublisher,
    *,
    user_id: uuid.UUID,
    bundle: ContextBundle,
    week_start: date,
    week_end: date,
) -> WeeklyRecapSchema:
    """Compose, persist, and announce a weekly recap for the user."""
    redirect = detect_unsafe(bundle.identity_statement)
    if redirect is not None:
        narrative = redirect
        safety_flags = "safety_redirect"
    else:
        narrative = generate_recap_narrative(bundle, await _completed_count(session, user_id))
        safety_flags = None

    now = datetime.now(UTC)
    recap = WeeklyRecap(
        user_id=user_id,
        week_start=week_start,
        week_end=week_end,
        narrative=narrative,
        generated_at=now,
    )
    session.add(recap)
    await session.flush()
    session.add(
        AIResponseMetadata(
            user_id=user_id,
            artifact="recap",
            reference_id=recap.id,
            generator_version=GENERATOR_VERSION,
            safety_flags=safety_flags,
        )
    )
    await publisher.publish(
        "ai.coach_summary_created",
        {
            "version": 1,
            "user_id": str(user_id),
            "recap_id": str(recap.id),
            "week_start": week_start.isoformat(),
            "created_at": now.isoformat(),
        },
    )
    return _to_schema(recap)


async def get_latest(session: AsyncSession, *, user_id: uuid.UUID) -> WeeklyRecapSchema:
    recap = await session.scalar(
        select(WeeklyRecap)
        .where(WeeklyRecap.user_id == user_id)
        .order_by(desc(WeeklyRecap.generated_at))
        .limit(1)
    )
    if recap is None:
        raise AppError(404, "no_recap_yet", "No weekly recap has been generated yet.")
    return _to_schema(recap)


async def list_recaps(
    session: AsyncSession, *, user_id: uuid.UUID, limit: int, offset: int
) -> tuple[list[WeeklyRecapSchema], int]:
    total = await session.scalar(
        select(func.count()).select_from(WeeklyRecap).where(WeeklyRecap.user_id == user_id)
    )
    rows = (
        await session.scalars(
            select(WeeklyRecap)
            .where(WeeklyRecap.user_id == user_id)
            .order_by(desc(WeeklyRecap.generated_at), desc(WeeklyRecap.id))
            .limit(limit)
            .offset(offset)
        )
    ).all()
    return [_to_schema(row) for row in rows], int(total or 0)
