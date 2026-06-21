"""Fold connected-source recovery samples into A4 wearable signals (A3 → A4/A6).

Pure, side-effect-free helpers over rows the orchestrator already read from the
training service (``/integrations/sources`` + ``/integrations/recovery``). The
orchestrator copies no raw logs (ai-architecture.md "Context Privacy"); it only
derives the few wearable *signals* the readiness engine reasons over.

A7 consent: only samples from a source the user left **on** are used — if the
recovery-bearing source is off or disconnected, recovery is treated as absent.

A8 honest fallback: with no consented source, no samples, or null fields, every
wearable signal stays ``None`` and readiness falls back to the load-only estimate
in ``app.signals`` — values are never fabricated.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

# How many trailing samples (after the latest) form the personal baseline that
# the latest night's HRV / sleep is compared against for the delta signals.
_BASELINE_WINDOW = 7


@dataclass(frozen=True)
class RecoveryInputs:
    """Consent-gated wearable inputs for ``signals.compute_signals``.

    All ``None`` when there is no consented recovery (the honest fallback).
    """

    sleep_hours: float | None = None
    sleep_delta: str | None = None
    hrv: int | None = None
    hrv_delta_pct: float | None = None
    resting_hr: int | None = None


def _on_source_ids(integration_sources: list[dict[str, Any]]) -> set[str]:
    """Provider ids the user left ON in the connection registry (A7 consent)."""
    return {
        str(s["id"])
        for s in integration_sources
        if s.get("id") is not None and s.get("on")
    }


def _parse_date(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        when = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return when if when.tzinfo else when.replace(tzinfo=UTC)


def _format_sleep_delta(latest: float, baseline: float) -> str | None:
    """A human ``+1h12m`` / ``-0h45m`` string for the latest night vs baseline."""
    diff = latest - baseline
    if abs(diff) < 1 / 60:  # under a minute — call it flat, no fabricated noise
        return "±0m"
    sign = "+" if diff >= 0 else "-"
    minutes = round(abs(diff) * 60)
    hours, mins = divmod(minutes, 60)
    if hours:
        return f"{sign}{hours}h{mins:02d}m"
    return f"{sign}{mins}m"


def fold_recovery(
    integration_sources: list[dict[str, Any]],
    recovery_samples: list[dict[str, Any]],
) -> RecoveryInputs:
    """Derive consent-gated wearable signal inputs from recovery samples.

    ``recovery_samples`` are newest-first (as returned by ``/integrations/recovery``).
    Only samples from a source left **on** are considered; the latest such sample
    supplies the point-in-time HRV / RHR / sleep, and the trailing baseline window
    supplies the HRV-percent and sleep deltas. Returns an all-``None``
    :class:`RecoveryInputs` when nothing is consented or present.
    """
    on_ids = _on_source_ids(integration_sources)
    if not on_ids:
        return RecoveryInputs()

    consented = [s for s in recovery_samples if str(s.get("source")) in on_ids]
    # Newest first already, but don't trust ordering — sort by sample date desc.
    consented.sort(key=lambda s: (_parse_date(s.get("date")) or datetime.min.replace(tzinfo=UTC)),
                   reverse=True)
    if not consented:
        return RecoveryInputs()

    latest = consented[0]
    baseline = consented[1 : 1 + _BASELINE_WINDOW]

    hrv_ms = latest.get("hrv_ms")
    resting_hr = latest.get("resting_hr")
    sleep_hours = latest.get("sleep_hours")

    hrv = int(round(hrv_ms)) if isinstance(hrv_ms, int | float) else None

    hrv_delta_pct: float | None = None
    if isinstance(hrv_ms, int | float):
        prior_hrv = [s["hrv_ms"] for s in baseline if isinstance(s.get("hrv_ms"), int | float)]
        if prior_hrv:
            mean_prior = sum(prior_hrv) / len(prior_hrv)
            if mean_prior > 0:
                hrv_delta_pct = round((hrv_ms - mean_prior) / mean_prior * 100, 0)

    sleep_delta: str | None = None
    if isinstance(sleep_hours, int | float):
        prior_sleep = [
            s["sleep_hours"] for s in baseline if isinstance(s.get("sleep_hours"), int | float)
        ]
        if prior_sleep:
            mean_sleep = sum(prior_sleep) / len(prior_sleep)
            sleep_delta = _format_sleep_delta(float(sleep_hours), mean_sleep)

    return RecoveryInputs(
        sleep_hours=float(sleep_hours) if isinstance(sleep_hours, int | float) else None,
        sleep_delta=sleep_delta,
        hrv=hrv,
        hrv_delta_pct=hrv_delta_pct,
        resting_hr=int(resting_hr) if isinstance(resting_hr, int | float) else None,
    )
