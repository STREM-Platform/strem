"""Behavioral adaptation engine (P2-04).

Reads the coach's view of recent behavior — distinct active days over the last
week (from the XP ledger) and proximity to the next rank — and proactively
chooses an adaptation: a compassionate re-entry after a lapse, a recovery prompt
when over-reaching, a push when a rank is in reach, or steady-state. Pure and
bounded, on the same safety philosophy as mission generation.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

# A rank is "in reach" within roughly a few focused sessions.
_MILESTONE_XP_WINDOW = 300
_DEFAULT_TARGET_DAYS = 4
_OVER_REACH_MARGIN = 2


class AdaptationSignal(StrEnum):
    RE_ENGAGEMENT = "re_engagement"
    BURNOUT_RISK = "burnout_risk"
    MILESTONE_PROXIMITY = "milestone_proximity"
    STEADY = "steady"


@dataclass(frozen=True)
class AdaptationDecision:
    signal: AdaptationSignal
    headline: str
    action: str


def decide_adaptation(
    *,
    active_days_last_week: int,
    weekly_target_days: int | None,
    xp_to_next_rank: int | None,
) -> AdaptationDecision:
    """Choose the coach's proactive adaptation from recent-behavior signals."""
    target = weekly_target_days or _DEFAULT_TARGET_DAYS

    if active_days_last_week <= 0:
        return AdaptationDecision(
            AdaptationSignal.RE_ENGAGEMENT,
            "Welcome back.",
            "One small action today restarts the streak — there's nothing to make up.",
        )

    if active_days_last_week >= 7 or active_days_last_week > target + _OVER_REACH_MARGIN:
        return AdaptationDecision(
            AdaptationSignal.BURNOUT_RISK,
            "Protect the engine.",
            "You've pushed hard this week. Take a deliberate recovery day so the gains hold.",
        )

    if xp_to_next_rank is not None and 0 < xp_to_next_rank <= _MILESTONE_XP_WINDOW:
        return AdaptationDecision(
            AdaptationSignal.MILESTONE_PROXIMITY,
            "A rank is in reach.",
            "You're close to your next rank — two focused sessions could get you there.",
        )

    return AdaptationDecision(
        AdaptationSignal.STEADY,
        "Hold the standard.",
        "You're on track. Keep the rhythm — consistency is the whole game.",
    )
