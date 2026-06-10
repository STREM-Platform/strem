"""Streak derivation: current run, longest run, and compassionate state."""

from datetime import date, timedelta

from app.streaks import summarize

TODAY = date(2026, 6, 10)


def _days(*offsets: int) -> set[date]:
    """Build an active-day set as offsets back from TODAY (0 = today)."""
    return {TODAY - timedelta(days=offset) for offset in offsets}


def test_no_activity_is_none() -> None:
    assert summarize(set(), TODAY) == (0, 0, "none")


def test_active_today_counts_the_run() -> None:
    current, longest, state = summarize(_days(0, 1, 2), TODAY)
    assert (current, longest, state) == (3, 3, "active")


def test_missed_today_but_active_yesterday_is_at_risk() -> None:
    current, longest, state = summarize(_days(1, 2, 3), TODAY)
    assert (current, longest, state) == (3, 3, "at_risk")


def test_lapsed_more_than_a_day_is_broken_but_keeps_longest() -> None:
    # Active 5..9 days ago (a 5-day run), nothing since -> broken, longest 5.
    current, longest, state = summarize(_days(5, 6, 7, 8, 9), TODAY)
    assert (current, longest, state) == (0, 5, "broken")


def test_current_run_ignores_an_older_longer_run() -> None:
    # Old 4-day run (10..13 ago) plus a current 2-day run (today + yesterday).
    current, longest, state = summarize(_days(0, 1, 10, 11, 12, 13), TODAY)
    assert (current, longest, state) == (2, 4, "active")
