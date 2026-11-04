"""Daily AI limit per athlete (#8): a public deploy can't burn the API credit.

Every model call counts once per athlete per UTC day. The request dependency
loads today's count into a meter held in a context variable; `LangChainRaceAI`
spends from it before each call and reports itself unavailable once the limit is
reached, so callers fall back to the race engine and say why. The count is saved
when the request ends. Parallel requests can overshoot by a call or two; that is
fine for a cost guard.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from contextvars import ContextVar
from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Annotated

from fastapi import Depends
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import CurrentUserDep, SessionDep, SettingsDep
from app.race.ai.client import AIUnavailable, RaceAI, get_race_ai
from app.race.store import AIUsage

LIMIT_REASON = (
    "You've reached today's AI limit. The race engine keeps everything running, "
    "and the AI race team is back tomorrow."
)


@dataclass
class Meter:
    user_id: uuid.UUID
    day: date
    limit: int  # 0 = no limit
    used: int
    spent: int = 0

    @property
    def left(self) -> int | None:
        return None if not self.limit else max(self.limit - self.used, 0)


_meter: ContextVar[Meter | None] = ContextVar("ai_meter", default=None)


def exhausted() -> str | None:
    """Why the AI is off for this athlete today, or None while calls are left."""
    meter = _meter.get()
    return LIMIT_REASON if meter is not None and meter.left == 0 else None


def spend() -> None:
    """Count one model call, or refuse it when today's limit is used up."""
    meter = _meter.get()
    if meter is None:
        return
    if meter.left == 0:
        raise AIUnavailable(LIMIT_REASON)
    meter.used += 1
    meter.spent += 1


async def used_today(db: AsyncSession, user_id: uuid.UUID, day: date) -> int:
    calls = await db.scalar(
        select(AIUsage.calls).where(AIUsage.user_id == user_id, AIUsage.day == day)
    )
    return calls or 0


async def record(db: AsyncSession, user_id: uuid.UUID, day: date, calls: int) -> None:
    """Add `calls` to the athlete's count for `day` (an increment, so parallel
    requests don't overwrite each other)."""
    bump = (
        update(AIUsage)
        .where(AIUsage.user_id == user_id, AIUsage.day == day)
        .values(calls=AIUsage.calls + calls)
    )
    if (await db.execute(bump)).rowcount == 0:  # type: ignore[attr-defined]
        db.add(AIUsage(user_id=user_id, day=day, calls=calls))
        try:
            await db.commit()
            return
        except IntegrityError:  # a parallel request created the row first
            await db.rollback()
            await db.execute(bump)
    await db.commit()


async def metered_race_ai(
    current: CurrentUserDep,
    db: SessionDep,
    settings: SettingsDep,
    ai: Annotated[RaceAI, Depends(get_race_ai)],
) -> AsyncIterator[RaceAI]:
    """The race AI for this request, with the athlete's daily limit applied."""
    if not settings.ai_daily_limit:
        yield ai
        return
    day = datetime.now(UTC).date()
    meter = Meter(
        current.user_id, day, settings.ai_daily_limit, await used_today(db, current.user_id, day)
    )
    _meter.set(meter)
    try:
        yield ai
    finally:
        if meter.spent:
            # The endpoint has committed its own work; drop anything it left open.
            await db.rollback()
            await record(db, meter.user_id, meter.day, meter.spent)


def current_meter() -> Meter | None:
    return _meter.get()


MeteredAIDep = Annotated[RaceAI, Depends(metered_race_ai)]
