"""Consistency-streak derivation from the append-only XP ledger.

A "streak" is consecutive calendar days on which the user earned any XP — the
same notion the 7-/30-day streak bonuses use (`app/consumers.py`). This module
turns that into a read model the app can show: the current run, the longest run
ever, and a state that lets the UI stay compassionate about a missed day.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import XPLedgerEntry

# active: earned XP today. at_risk: earned yesterday but not yet today (act today
# to keep it). broken: the last active day is older than yesterday. none: no
# activity yet.
StreakState = Literal["active", "at_risk", "broken", "none"]


def longest_run(days: set[date]) -> int:
    """Length of the longest consecutive-day run in `days`."""
    if not days:
        return 0
    ordered = sorted(days)
    best = run = 1
    for prev, current in zip(ordered, ordered[1:], strict=False):
        run = run + 1 if (current - prev).days == 1 else 1
        best = max(best, run)
    return best


def _run_ending_on(days: set[date], anchor: date) -> int:
    run = 0
    cursor = anchor
    while cursor in days:
        run += 1
        cursor -= timedelta(days=1)
    return run


def summarize(days: set[date], today: date) -> tuple[int, int, StreakState]:
    """Current streak, longest streak, and state from a set of active days."""
    longest = longest_run(days)
    if not days:
        return 0, 0, "none"
    yesterday = today - timedelta(days=1)
    if today in days:
        return _run_ending_on(days, today), longest, "active"
    if yesterday in days:
        # The streak is still alive but at risk until something is logged today.
        return _run_ending_on(days, yesterday), longest, "at_risk"
    return 0, longest, "broken"


async def streak_summary(
    session: AsyncSession, user_id: uuid.UUID, *, today: date | None = None
) -> tuple[int, int, StreakState]:
    """Read the ledger and summarize the user's consistency streak."""
    timestamps = (
        await session.scalars(
            select(XPLedgerEntry.earned_at).where(XPLedgerEntry.user_id == user_id)
        )
    ).all()
    days = {ts.date() for ts in timestamps}
    return summarize(days, today or datetime.now(UTC).date())
