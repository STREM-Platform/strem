"""Medal earn-condition evaluation (the ten MVP medals, game-systems.md).

`detect_earned_medals` is a pure function over the user's XP ledger (each entry
reduced to its `source` and the UTC date it was earned) plus onboarding state,
so it is easy to unit-test. Day grouping uses the UTC date of `earned_at`.

Some conditions reference signals this service does not own directly; the
closest faithful proxy from the ledger is used and documented inline:
- `tribe_member` — a `tribe_checkin` cannot occur without tribe membership, so
  the first check-in implies "joined a tribe and completed first check-in".
- `iron_week` — "training" = a `strength_session` or `mobility_recovery` in the
  same ISO week as a `running_session` and a `nutrition_day`.
- `identity_forged` — onboarding completed and 30 distinct active days logged.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date

from app.schemas.game import MedalType
from app.schemas.xp import XPSource

# Sources that count as a "training or running session log" for First Steps.
_TRAINING_OR_RUNNING = {
    XPSource.STRENGTH_SESSION.value,
    XPSource.RUNNING_SESSION.value,
}
# Sources that count as "training" (non-running) for Iron Week.
_TRAINING = {XPSource.STRENGTH_SESSION.value, XPSource.MOBILITY_RECOVERY.value}


def _max_consecutive_run(days: set[date]) -> int:
    """Longest run of consecutive calendar days in the set."""
    if not days:
        return 0
    ordered = sorted(days)
    best = run = 1
    for prev, current in zip(ordered, ordered[1:], strict=False):
        run = run + 1 if (current - prev).days == 1 else 1
        best = max(best, run)
    return best


def detect_earned_medals(
    *,
    sources_with_dates: list[tuple[str, date]],
    onboarding_completed: bool,
) -> set[MedalType]:
    """Return every MVP medal whose earn condition is currently satisfied."""
    earned: set[MedalType] = set()
    if not sources_with_dates and not onboarding_completed:
        return earned

    all_sources = [s for s, _ in sources_with_dates]
    active_days = {d for _, d in sources_with_dates}
    nutrition_days = {d for s, d in sources_with_dates if s == XPSource.NUTRITION_DAY.value}
    tribe_checkins = sum(1 for s in all_sources if s == XPSource.TRIBE_CHECKIN.value)

    # First-log medals.
    if any(s in _TRAINING_OR_RUNNING for s in all_sources):
        earned.add(MedalType.FIRST_STEPS)
    if XPSource.STRENGTH_SESSION.value in all_sources:
        earned.add(MedalType.FIRST_IRON)
    if XPSource.RUNNING_SESSION.value in all_sources:
        earned.add(MedalType.FIRST_MILE)

    # Tribe medals.
    if tribe_checkins >= 1:
        earned.add(MedalType.TRIBE_MEMBER)
    if tribe_checkins >= 14:
        earned.add(MedalType.ACCOUNTABILITY_ANCHOR)

    # Consistency medals.
    if _max_consecutive_run(active_days) >= 7:
        earned.add(MedalType.COMMITTED)
    if _max_consecutive_run(nutrition_days) >= 14:
        earned.add(MedalType.NUTRITION_CONSISTENT)

    # Iron Week: training + running + nutrition in the same ISO week.
    weeks: dict[tuple[int, int], set[str]] = defaultdict(set)
    for source, day in sources_with_dates:
        iso = day.isocalendar()
        weeks[(iso.year, iso.week)].add(source)
    if any(
        (srcs & _TRAINING)
        and XPSource.RUNNING_SESSION.value in srcs
        and XPSource.NUTRITION_DAY.value in srcs
        for srcs in weeks.values()
    ):
        earned.add(MedalType.IRON_WEEK)

    # Engagement-duration medals.
    if len(active_days) >= 30:
        earned.add(MedalType.THIRTY_DAY_MARK)
        if onboarding_completed:
            earned.add(MedalType.IDENTITY_FORGED)

    # Phase 2 expanded catalogue (deeper consistency, volume, and tribe tiers).
    longest_run = _max_consecutive_run(active_days)
    if longest_run >= 14:
        earned.add(MedalType.UNBROKEN)
    if longest_run >= 30:
        earned.add(MedalType.RELENTLESS)
    if all_sources.count(XPSource.RUNNING_SESSION.value) >= 25:
        earned.add(MedalType.LONG_HAULER)
    if all_sources.count(XPSource.STRENGTH_SESSION.value) >= 25:
        earned.add(MedalType.IRON_DEVOTEE)
    if len(nutrition_days) >= 30:
        earned.add(MedalType.WELL_FUELED)
    if tribe_checkins >= 50:
        earned.add(MedalType.TRIBE_PILLAR)

    return earned
