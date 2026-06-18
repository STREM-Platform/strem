"""Cross-domain insight engine (B8).

Deterministic correlations over the rows the contracts actually carry today
(training sessions + day-level nutrition), each gated by a minimum sample size so
the agent never asserts a pattern from too little data. Returns ``[]`` below the
gate. Richer correlations (per-lift load × macros, HRV × PRs) unlock as D5/A3 land.
"""

from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime
from typing import Any

from app.schemas import Insight

# Minimum observations before we'll claim a pattern.
_MIN_SESSIONS = 8
_MIN_TRAINING_DAYS = 8

_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _parse(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        when = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return when if when.tzinfo else when.replace(tzinfo=UTC)


def _endurance_base(sessions: list[dict[str, Any]]) -> Insight | None:
    runs = [s for s in sessions if s.get("session_type") in ("running", "trail_running")]
    if len(sessions) < _MIN_SESSIONS or not runs:
        return None
    share = round(100 * len(runs) / len(sessions))
    if share < 25:
        return None
    return Insight(
        icon="route",
        tone="green",
        title="Your endurance base is building",
        body=f"{share}% of your last {len(sessions)} sessions were runs. The aerobic "
        "work is widening the base your goal needs.",
        chip=f"From {len(sessions)} sessions",
    )


def _fuel_alignment(
    sessions: list[dict[str, Any]], nutrition: list[dict[str, Any]]
) -> Insight | None:
    training_days = {when.date() for s in sessions if (when := _parse(s.get("logged_at")))}
    if len(training_days) < _MIN_TRAINING_DAYS:
        return None
    fueled = {
        d.date()
        for n in nutrition
        if n.get("targets_met") and (d := _parse(f"{n.get('date')}T12:00:00"))
    }
    if not fueled:
        return None
    overlap = len(training_days & fueled)
    pct = round(100 * overlap / len(training_days))
    tone = "green" if pct >= 60 else "amber"
    body = f"On {pct}% of your training days you also hit your fuel targets. " + (
        "Strong alignment — keep it up."
        if pct >= 60
        else "Fuelling the work is the cheapest gain on the table."
    )
    return Insight(
        icon="leaf",
        tone=tone,
        title="Fuel follows your training",
        body=body,
        chip=f"{len(training_days)} training days",
    )


def _consistency_day(sessions: list[dict[str, Any]]) -> Insight | None:
    if len(sessions) < _MIN_SESSIONS:
        return None
    counts = Counter(when.weekday() for s in sessions if (when := _parse(s.get("logged_at"))))
    if not counts:
        return None
    day, n = counts.most_common(1)[0]
    if n < 3:
        return None
    return Insight(
        icon="flame",
        tone="green",
        title=f"{_WEEKDAYS[day]} is your anchor",
        body=f"You train most on {_WEEKDAYS[day]}s — {n} of your last {len(sessions)} "
        "sessions. Anchoring a fixed day is what makes the habit stick.",
        chip=f"{n} of {len(sessions)} sessions",
    )


def build_insights(
    sessions: list[dict[str, Any]], nutrition: list[dict[str, Any]]
) -> list[Insight]:
    """All correlations the current data supports, above the sample gate."""
    candidates = [
        _endurance_base(sessions),
        _fuel_alignment(sessions, nutrition),
        _consistency_day(sessions),
    ]
    return [c for c in candidates if c is not None]
