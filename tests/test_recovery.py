"""A3 → A4/A6: folding consented wearable recovery into readiness + /ai/context.

Covers the pure ``fold_recovery`` helper and the live ``HttpAthleteContextProvider``
fetch path against a stubbed training/user service (``httpx.MockTransport``), so we
assert (a) readiness reflects recovery when present + consent on, and (b) it falls
back / nulls when recovery is absent or the source is off — never fabricated.
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import patch

import httpx

from app import recovery
from app.context import GraphSnapshot, HttpAthleteContextProvider

NOW = datetime(2026, 6, 18, 12, 0, tzinfo=UTC)


def _sample(days_ago: int, *, hrv: float | None, rhr: int | None, sleep: float | None,
            source: str = "whoop") -> dict[str, Any]:
    return {
        "id": f"rec-{days_ago}",
        "source": source,
        "date": (NOW - timedelta(days=days_ago)).isoformat(),
        "hrv_ms": hrv,
        "resting_hr": rhr,
        "sleep_hours": sleep,
        "recovery_score": 60,
    }


def _source(provider: str, on: bool) -> dict[str, Any]:
    return {"id": provider, "label": provider.title(), "icon": "heart",
            "on": on, "last": "1h ago", "metric": "Sleep · HRV · Recovery"}


# ── fold_recovery (pure) ──────────────────────────────────────────────────────
def test_fold_recovery_uses_latest_sample_and_deltas() -> None:
    sources = [_source("whoop", on=True)]
    samples = [
        _sample(0, hrv=40, rhr=58, sleep=5.5),  # latest — suppressed vs baseline
        _sample(1, hrv=50, rhr=52, sleep=7.5),
        _sample(2, hrv=50, rhr=52, sleep=7.5),
    ]
    out = recovery.fold_recovery(sources, samples)
    assert out.hrv == 40
    assert out.resting_hr == 58
    assert out.sleep_hours == 5.5
    # Latest HRV 40 vs baseline mean 50 → -20%.
    assert out.hrv_delta_pct == -20
    # Latest sleep 5.5h vs baseline 7.5h → -2h00m.
    assert out.sleep_delta == "-2h00m"


def test_fold_recovery_consent_off_yields_nothing() -> None:
    sources = [_source("whoop", on=False)]
    samples = [_sample(0, hrv=40, rhr=58, sleep=5.5)]
    out = recovery.fold_recovery(sources, samples)
    assert out == recovery.RecoveryInputs()


def test_fold_recovery_ignores_samples_from_off_sources() -> None:
    # Whoop is off; a (hypothetical) on source produced no recovery → absent.
    sources = [_source("whoop", on=False), _source("strava", on=True)]
    samples = [_sample(0, hrv=40, rhr=58, sleep=5.5, source="whoop")]
    out = recovery.fold_recovery(sources, samples)
    assert out.hrv is None and out.sleep_hours is None and out.resting_hr is None


def test_fold_recovery_no_samples_is_absent() -> None:
    out = recovery.fold_recovery([_source("whoop", on=True)], [])
    assert out == recovery.RecoveryInputs()


def test_fold_recovery_partial_fields_never_fabricated() -> None:
    # Only sleep present; HRV/RHR null in the source data → stay None, no guess.
    sources = [_source("whoop", on=True)]
    out = recovery.fold_recovery(sources, [_sample(0, hrv=None, rhr=None, sleep=8.0)])
    assert out.sleep_hours == 8.0
    assert out.hrv is None and out.hrv_delta_pct is None and out.resting_hr is None


# ── HttpAthleteContextProvider live fetch path ────────────────────────────────
_PROFILE = {"onboarding_completed": True, "identity_statement": "I am a hybrid athlete."}


def _handler(
    *, sources: list[dict[str, Any]], samples: list[dict[str, Any]]
) -> Callable[[httpx.Request], httpx.Response]:
    def handle(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.endswith("/users/me"):
            return httpx.Response(200, json=_PROFILE)
        if path.endswith("/users/me/xp"):
            return httpx.Response(200, json={"streak_state": "active"})
        if path.endswith("/training/sessions"):
            return httpx.Response(200, json={"items": []})
        if path.endswith("/nutrition/days"):
            return httpx.Response(200, json={"items": []})
        if path.endswith("/integrations/sources"):
            return httpx.Response(200, json={"items": sources})
        if path.endswith("/integrations/recovery"):
            return httpx.Response(200, json={"items": samples})
        return httpx.Response(404, json={})

    return handle


def _snapshot(
    sources: list[dict[str, Any]], samples: list[dict[str, Any]]
) -> GraphSnapshot | None:
    provider = HttpAthleteContextProvider(
        "http://user.test/v1", "http://training.test/v1", "http://nutrition.test/v1"
    )
    transport = httpx.MockTransport(_handler(sources=sources, samples=samples))
    real_client = httpx.AsyncClient

    def _client_factory(*args: Any, **kwargs: Any) -> httpx.AsyncClient:
        kwargs.pop("timeout", None)
        return real_client(transport=transport, timeout=5.0)

    async def _run() -> GraphSnapshot | None:
        with patch("app.context.httpx.AsyncClient", _client_factory):
            return await provider.for_user("user-1", "tok")

    return asyncio.run(_run())


def test_context_folds_recovery_when_connected_and_on() -> None:
    samples = [
        _sample(0, hrv=40, rhr=58, sleep=5.4),
        _sample(1, hrv=55, rhr=50, sleep=7.6),
        _sample(2, hrv=55, rhr=50, sleep=7.6),
    ]
    snap = _snapshot([_source("whoop", on=True)], samples)
    assert snap is not None
    sig = snap.signals
    # Wearable fields populated (the FE's sleep/HRV/RHR chips).
    assert sig.hrv == 40
    assert sig.resting_hr == 58
    assert sig.sleep_hours == "5h24m"
    assert sig.hrv_delta is not None and sig.sleep_delta is not None
    # The Whoop source is surfaced in "what your coach sees".
    assert any(s.id == "whoop" and s.on for s in snap.sources)


def test_recovery_pulls_readiness_below_load_only() -> None:
    poor = [
        _sample(0, hrv=38, rhr=60, sleep=5.0),
        _sample(1, hrv=55, rhr=50, sleep=7.8),
        _sample(2, hrv=55, rhr=50, sleep=7.8),
    ]
    with_recovery = _snapshot([_source("whoop", on=True)], poor)
    load_only = _snapshot([_source("whoop", on=False)], poor)  # consent off → fallback
    assert with_recovery is not None and load_only is not None
    # A suppressed-HRV, poor-sleep night must pull readiness below the load-only
    # estimate — readiness now reflects real recovery, not a guess.
    assert with_recovery.signals.readiness < load_only.signals.readiness


def test_context_nulls_recovery_when_consent_off() -> None:
    samples = [_sample(0, hrv=40, rhr=58, sleep=5.4)]
    snap = _snapshot([_source("whoop", on=False)], samples)
    assert snap is not None
    sig = snap.signals
    assert sig.hrv is None and sig.sleep_hours is None and sig.resting_hr is None
    assert sig.hrv_delta is None and sig.sleep_delta is None
    # An off source is not surfaced as a connected source.
    assert all(s.id != "whoop" for s in snap.sources)


def test_context_nulls_recovery_when_no_samples() -> None:
    snap = _snapshot([_source("whoop", on=True)], [])
    assert snap is not None
    sig = snap.signals
    assert sig.hrv is None and sig.sleep_hours is None and sig.resting_hr is None
