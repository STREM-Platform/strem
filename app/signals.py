"""Derived training/recovery signals (A4).

Pure, side-effect-free functions over already-fetched rows — the orchestrator
copies no raw logs (ai-architecture.md "Context Privacy"); callers pass the data
they read from the owning services. These turn raw sessions + wearable samples
into the few *signals* the coach reasons over: readiness, load, ACWR, momentum.

No fabrication: when wearable data is absent, recovery fields stay ``None`` (the
FE renders "—") and readiness falls back to a conservative load/streak estimate.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

# Relative per-minute training-load weight by discipline (intensity proxy until
# per-set RPE lands with D1/D2). Strength/hybrid cost more per minute than easy
# aerobic work.
_INTENSITY: dict[str, float] = {
    "strength": 1.0,
    "hybrid": 1.1,
    "hyrox": 1.1,
    "trail_running": 0.9,
    "running": 0.8,
    "cycling": 0.7,
    "swimming": 0.8,
    "mobility": 0.4,
}
_DEFAULT_INTENSITY = 0.8


@dataclass(frozen=True)
class Signals:
    """The derived signals embedded in the context graph (A4 → A6)."""

    readiness: int
    readiness_label: str
    load7: int
    load28: int
    acwr: float
    load_label: str
    momentum: str
    streak_risk: bool
    sleep_hours: str | None = None
    sleep_delta: str | None = None
    hrv: int | None = None
    hrv_delta: str | None = None
    resting_hr: int | None = None


def _parse_dt(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        when = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return when if when.tzinfo else when.replace(tzinfo=UTC)


def training_load(
    sessions: list[dict[str, Any]], window_days: int, *, now: datetime | None = None
) -> int:
    """Summed training load over the trailing ``window_days``.

    Load = duration_minutes × intensity_weight(session_type). Returns whole units.
    """
    cutoff = (now or datetime.now(UTC)) - timedelta(days=window_days)
    total = 0.0
    for s in sessions:
        when = _parse_dt(s.get("logged_at"))
        if when is None or when < cutoff:
            continue
        minutes = s.get("duration_minutes") or 0
        weight = _INTENSITY.get(str(s.get("session_type")), _DEFAULT_INTENSITY)
        total += float(minutes) * weight
    return round(total)


def acwr(load7: int, load28: int) -> float:
    """Acute:chronic workload ratio. Chronic = 28-day load normalised to a week."""
    chronic_weekly = load28 / 4.0
    if chronic_weekly <= 0:
        return 0.0
    return round(load7 / chronic_weekly, 2)


def load_label(ratio: float) -> str:
    """Band the ACWR into a human label (sweet-spot ~0.8–1.3)."""
    if ratio <= 0:
        return "Building"
    if ratio < 0.8:
        return "Detraining"
    if ratio <= 1.3:
        return "Optimal"
    if ratio <= 1.5:
        return "Watch"
    return "Overreaching"


def _readiness_label(score: int) -> str:
    # Bands must match the FE `readinessColor` thresholds in constants/theme.ts.
    if score >= 75:
        return "High"
    if score >= 50:
        return "Moderate"
    return "Low"


def readiness(
    *,
    ratio: float,
    streak_state: str | None,
    hrv_delta_pct: float | None = None,
    sleep_hours: float | None = None,
) -> tuple[int, str]:
    """A 0–100 readiness score + label.

    Starts from a neutral 70 and adjusts: an out-of-range ACWR, a poor night, or a
    suppressed HRV pull it down; an at-risk streak nudges it down slightly. With no
    wearable data only load + streak are used (a conservative estimate, never a
    fabricated HRV/sleep number).
    """
    score = 70.0

    if ratio > 1.5:
        score -= 22
    elif ratio > 1.3:
        score -= 10
    elif 0.8 <= ratio <= 1.3:
        score += 8
    elif 0 < ratio < 0.8:
        score -= 4

    if hrv_delta_pct is not None:
        # Each 1% HRV drop below baseline costs ~1 point (capped).
        score += max(-25.0, min(10.0, hrv_delta_pct))
    if sleep_hours is not None:
        if sleep_hours < 6:
            score -= (6 - sleep_hours) * 8
        elif sleep_hours >= 7.5:
            score += 6
    if streak_state == "at_risk":
        score -= 4

    clamped = max(0, min(100, round(score)))
    return clamped, _readiness_label(clamped)


def momentum(load7: int, load28: int) -> str:
    """Direction of training volume vs. the chronic weekly baseline."""
    chronic_weekly = load28 / 4.0
    if chronic_weekly <= 0:
        return "Building" if load7 > 0 else "Resting"
    delta = (load7 - chronic_weekly) / chronic_weekly
    if delta > 0.1:
        return "Rising"
    if delta < -0.1:
        return "Falling"
    return "Steady"


def compute_signals(
    sessions: list[dict[str, Any]],
    *,
    streak_state: str | None = None,
    sleep_hours: float | None = None,
    sleep_delta: str | None = None,
    hrv: int | None = None,
    hrv_delta_pct: float | None = None,
    resting_hr: int | None = None,
    now: datetime | None = None,
) -> Signals:
    """Assemble the full signal set from training sessions (+ optional wearable data)."""
    load7 = training_load(sessions, 7, now=now)
    load28 = training_load(sessions, 28, now=now)
    ratio = acwr(load7, load28)
    score, label = readiness(
        ratio=ratio, streak_state=streak_state, hrv_delta_pct=hrv_delta_pct, sleep_hours=sleep_hours
    )
    hrv_delta_str = None if hrv_delta_pct is None else f"{hrv_delta_pct:+.0f}%"
    sleep_str: str | None = None
    if sleep_hours is not None:
        sleep_str = f"{int(sleep_hours)}h{int(round((sleep_hours % 1) * 60)):02d}m"
    return Signals(
        readiness=score,
        readiness_label=label,
        load7=load7,
        load28=load28,
        acwr=ratio,
        load_label=load_label(ratio),
        momentum=momentum(load7, load28),
        streak_risk=streak_state == "at_risk",
        sleep_hours=sleep_str,
        sleep_delta=sleep_delta,
        hrv=hrv,
        hrv_delta=hrv_delta_str,
        resting_hr=resting_hr,
    )
