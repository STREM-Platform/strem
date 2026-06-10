"""P2-01: the full 7-rank ladder and the expanded medal catalogue."""

from datetime import date, timedelta

from app.medals import detect_earned_medals
from app.ranks import rank_for_total_xp, rank_progress
from app.schemas.game import MedalType, UserRank
from app.schemas.xp import XPSource


def test_titan_and_ascended_bands() -> None:
    assert rank_for_total_xp(99_999) == UserRank.WARRIOR
    assert rank_for_total_xp(100_000) == UserRank.TITAN
    assert rank_for_total_xp(249_999) == UserRank.TITAN
    assert rank_for_total_xp(250_000) == UserRank.ASCENDED


def test_warrior_now_points_to_titan_and_ascended_is_top() -> None:
    assert rank_progress(40_000).next_rank == UserRank.TITAN
    top = rank_progress(300_000)
    assert top.rank == UserRank.ASCENDED
    assert top.next_rank is None
    assert top.xp_to_next_rank == 0


def test_expanded_volume_and_streak_medals() -> None:
    base = date(2026, 1, 1)
    # 25 running sessions on 25 consecutive days.
    sources = [(XPSource.RUNNING_SESSION.value, base + timedelta(days=i)) for i in range(25)]
    earned = detect_earned_medals(sources_with_dates=sources, onboarding_completed=False)

    assert MedalType.LONG_HAULER in earned  # >= 25 runs
    assert MedalType.FIRST_MILE in earned
    assert MedalType.UNBROKEN in earned  # >= 14-day run
    assert MedalType.RELENTLESS not in earned  # < 30-day run
