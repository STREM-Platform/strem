"""Unit tests for the A4 signals engine (app/signals.py)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app import signals

NOW = datetime(2026, 6, 18, 12, 0, tzinfo=UTC)


def _session(days_ago: int, minutes: int, kind: str = "strength") -> dict[str, object]:
    return {
        "logged_at": (NOW - timedelta(days=days_ago)).isoformat(),
        "duration_minutes": minutes,
        "session_type": kind,
    }


def test_training_load_windows_and_intensity() -> None:
    rows = [_session(1, 60, "strength"), _session(2, 60, "running"), _session(20, 60, "strength")]
    # 7-day window excludes the 20-day-old session: 60*1.0 + 60*0.8 = 108.
    assert signals.training_load(rows, 7, now=NOW) == 108
    # 28-day window includes it: + 60*1.0 = 168.
    assert signals.training_load(rows, 28, now=NOW) == 168


def test_acwr_and_label_bands() -> None:
    assert signals.acwr(0, 0) == 0.0
    assert signals.load_label(0.0) == "Building"
    assert signals.load_label(0.79) == "Detraining"
    assert signals.load_label(1.0) == "Optimal"
    assert signals.load_label(1.3) == "Optimal"
    assert signals.load_label(1.45) == "Watch"
    assert signals.load_label(1.6) == "Overreaching"


def test_readiness_label_edges_match_fe_thresholds() -> None:
    # FE readinessColor: >=75 High, >=50 Moderate, else Low.
    assert signals._readiness_label(74) == "Moderate"
    assert signals._readiness_label(75) == "High"
    assert signals._readiness_label(49) == "Low"
    assert signals._readiness_label(50) == "Moderate"


def test_readiness_drops_on_poor_sleep_and_high_acwr() -> None:
    fresh, _ = signals.readiness(ratio=1.0, streak_state="active")
    tired, label = signals.readiness(
        ratio=1.6, streak_state="at_risk", hrv_delta_pct=-12, sleep_hours=5.4
    )
    assert tired < fresh
    assert label in {"Low", "Moderate"}


def test_compute_signals_without_wearables_never_fabricates() -> None:
    rows = [_session(1, 50), _session(3, 45, "running")]
    s = signals.compute_signals(rows, streak_state="active", now=NOW)
    assert s.hrv is None and s.hrv_delta is None and s.sleep_hours is None and s.resting_hr is None
    assert 0 <= s.readiness <= 100
    assert s.load_label  # always present
    assert s.streak_risk is False


def test_compute_signals_formats_wearable_fields_when_present() -> None:
    s = signals.compute_signals(
        [_session(1, 50)],
        streak_state="active",
        sleep_hours=5.4,
        hrv=48,
        hrv_delta_pct=-12,
        resting_hr=54,
        now=NOW,
    )
    assert s.sleep_hours == "5h24m"
    assert s.hrv == 48 and s.hrv_delta == "-12%"
    assert s.resting_hr == 54
