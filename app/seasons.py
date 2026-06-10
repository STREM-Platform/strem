"""Seasonal arcs (P2-03).

Themed, time-boxed seasons with an XP multiplier — the renewable narrative
momentum from the roadmap ("Seasonal Arcs"). This module owns the season
calendar and resolves which season (if any) is active on a given date. Other
services consume the active season to apply XP multipliers, gate seasonal
challenges, and adapt coach narrative (the per-repo epic checklist).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from app.schemas import Season, SeasonStatus


@dataclass(frozen=True)
class _SeasonWindow:
    key: str
    name: str
    theme: str
    xp_multiplier: float
    start_month: int
    start_day: int
    end_month: int
    end_day: int


# Two seasons per year (roadmap "Seasonal Arcs (V2 Launch)"). Windows recur
# annually; no season wraps a year boundary in the MVP calendar.
SEASON_CALENDAR: tuple[_SeasonWindow, ...] = (
    _SeasonWindow(
        key="iron_october",
        name="Iron October",
        theme="Forge unbreakable strength.",
        xp_multiplier=1.5,
        start_month=10,
        start_day=1,
        end_month=11,
        end_day=15,
    ),
    _SeasonWindow(
        key="winter_ascension",
        name="Winter Ascension",
        theme="Rise through the cold months.",
        xp_multiplier=1.5,
        start_month=1,
        start_day=5,
        end_month=3,
        end_day=1,
    ),
)


def resolve_active(today: date) -> SeasonStatus:
    """Return the season active on `today`, or an inactive status (off-season)."""
    for window in SEASON_CALENDAR:
        starts_on = date(today.year, window.start_month, window.start_day)
        ends_on = date(today.year, window.end_month, window.end_day)
        if starts_on <= today <= ends_on:
            return SeasonStatus(
                active=True,
                season=Season(
                    key=window.key,
                    name=window.name,
                    theme=window.theme,
                    xp_multiplier=window.xp_multiplier,
                    starts_on=starts_on,
                    ends_on=ends_on,
                ),
            )
    return SeasonStatus(active=False, season=None)
