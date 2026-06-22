"""Context assembly for mission/recap generation.

The orchestrator reads identity context from approved service APIs only — it
never copies raw logs into its own database (ai-architecture.md "Context
Privacy"). For MVP the identity layer comes from `strem-user-service`'s profile;
consistency signals default conservatively so a brand-new user only ever gets a
re-entry/maintenance first mission.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Protocol

import httpx

from app.config import get_settings


@dataclass(frozen=True)
class ContextBundle:
    """The identity + recent-behavior context the coach grounds responses in."""

    identity_statement: str
    transformation_goal: str | None
    training_level: str | None
    weekly_target_days: int | None
    active_days_last_week: int
    xp_to_next_rank: int | None = None


def _distinct_active_days_last_week(history_items: list[dict[str, Any]]) -> int:
    """Count distinct calendar days with XP activity in the last 7 days."""
    cutoff = datetime.now(UTC) - timedelta(days=7)
    days: set[Any] = set()
    for item in history_items:
        raw = item.get("earned_at")
        if not isinstance(raw, str):
            continue
        try:
            when = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            continue
        if when.tzinfo is None:
            when = when.replace(tzinfo=UTC)
        if when >= cutoff:
            days.add(when.date())
    return len(days)


class ContextProvider(Protocol):
    """Assembles a context bundle for a user, or None when context is insufficient."""

    async def for_user(self, user_id: str, bearer_token: str) -> ContextBundle | None: ...


class HttpContextProvider:
    """Reads identity context from strem-user-service's profile API."""

    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")

    async def for_user(self, user_id: str, bearer_token: str) -> ContextBundle | None:
        headers = {"Authorization": f"Bearer {bearer_token}"}
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{self._base_url}/users/me", headers=headers)
            if response.status_code != 200:
                return None
            profile: dict[str, Any] = response.json()
            # Insufficient context until onboarding gives the coach an identity.
            if not profile.get("onboarding_completed") or not profile.get("identity_statement"):
                return None

            # Recent-behavior signals (P2-04): rank proximity + distinct active
            # days over the last week, read from the XP ledger. Degrades to the
            # identity-only bundle if these reads fail.
            xp_to_next_rank: int | None = None
            active_days_last_week = 0
            try:
                xp_response = await client.get(f"{self._base_url}/users/me/xp", headers=headers)
                if xp_response.status_code == 200:
                    xp_to_next_rank = xp_response.json().get("xp_to_next_rank")
                history_response = await client.get(
                    f"{self._base_url}/users/me/xp/history?limit=100", headers=headers
                )
                if history_response.status_code == 200:
                    items = history_response.json().get("items", [])
                    active_days_last_week = _distinct_active_days_last_week(items)
            except httpx.RequestError:
                pass

        return ContextBundle(
            identity_statement=str(profile["identity_statement"]),
            transformation_goal=profile.get("transformation_goal"),
            training_level=profile.get("training_level"),
            weekly_target_days=profile.get("weekly_target_days"),
            active_days_last_week=active_days_last_week,
            xp_to_next_rank=xp_to_next_rank,
        )


_provider: ContextProvider | None = None


def get_context_provider() -> ContextProvider:
    """Return the configured context provider (FastAPI dependency; tests override)."""
    global _provider
    if _provider is None:
        _provider = HttpContextProvider(get_settings().user_service_base_url)
    return _provider


# ── Athlete Context Graph assembly (A6) ──────────────────────────────────────
# The agent context endpoint reads sources + signals from the owning services and
# computes derived signals (A4). Memory (A5) is read from this service's own DB by
# the router and merged in. Still copies no raw logs into the orchestrator DB.

from dataclasses import dataclass as _dataclass  # noqa: E402
from dataclasses import field as _field  # noqa: E402

from app import recovery as _recovery  # noqa: E402
from app import signals as _signals  # noqa: E402
from app.schemas import ContextSignals, ContextSource, MemoryItem  # noqa: E402


@_dataclass(frozen=True)
class GraphSnapshot:
    """The graph minus memory: connected sources + derived signals, plus the raw
    rows the insight engine (B8) correlates over (kept out of the API response)."""

    sources: list[ContextSource]
    signals: ContextSignals
    sessions: list[dict[str, Any]] = _field(default_factory=list)
    nutrition: list[dict[str, Any]] = _field(default_factory=list)
    # Memory derived from the Athlete Baseline profile (#61), merged into the
    # /ai/context memory list so Forge knows the whole person — only SET fields.
    memory: list[MemoryItem] = _field(default_factory=list)


def _to_context_signals(s: _signals.Signals) -> ContextSignals:
    return ContextSignals(
        readiness=s.readiness,
        readiness_label=s.readiness_label,
        sleep_hours=s.sleep_hours,
        sleep_delta=s.sleep_delta,
        hrv=s.hrv,
        hrv_delta=s.hrv_delta,
        resting_hr=s.resting_hr,
        load7=s.load7,
        load28=s.load28,
        acwr=s.acwr,
        load_label=s.load_label,
        momentum=s.momentum,
        streak_risk=s.streak_risk,
    )


def _fmt_weight(value: Any) -> str:
    """Drop a trailing .0 so 140.0 reads as 140kg."""
    if isinstance(value, int | float):
        return str(int(value)) if float(value).is_integer() else str(value)
    return str(value)


def _profile_memory(profile: dict[str, Any]) -> list[MemoryItem]:
    """Turn the SET fields of the Athlete Baseline profile (#61) into memory facts
    Forge can cite. Only present fields are surfaced — never fabricated (A8)."""
    items: list[MemoryItem] = []
    years = profile.get("years_training")
    if isinstance(years, int):
        plural = "s" if years != 1 else ""
        items.append(MemoryItem(icon="clock", text=f"{years} year{plural} training"))
    for pr in (profile.get("personal_records") or [])[:5]:
        exercise = str(pr.get("exercise", "")).strip()
        if not exercise:
            continue
        if pr.get("weight_kg") is not None:
            reps = pr.get("reps")
            detail = f"{_fmt_weight(pr['weight_kg'])}kg" + (f" × {reps}" if reps else "")
            items.append(MemoryItem(icon="bolt", text=f"PR: {exercise} {detail}"))
        elif pr.get("time"):
            items.append(MemoryItem(icon="timer", text=f"PR: {exercise} {pr['time']}"))
        else:
            items.append(MemoryItem(icon="bolt", text=f"PR: {exercise}"))
    for injury in (profile.get("injuries") or [])[:5]:
        area = str(injury.get("area", "")).strip()
        if area:
            note = injury.get("note")
            items.append(
                MemoryItem(icon="shield", text=f"Injury: {area}" + (f" — {note}" if note else ""))
            )
    equipment = profile.get("equipment_access")
    if isinstance(equipment, str) and equipment:
        items.append(MemoryItem(icon="grid", text=f"Equipment: {equipment.replace('_', ' ')}"))
    diet = profile.get("dietary_constraints") or []
    if diet:
        items.append(MemoryItem(icon="leaf", text="Diet: " + ", ".join(str(d) for d in diet[:5])))
    return items


def _supplement_memory(supplements: list[dict[str, Any]]) -> list[MemoryItem]:
    """Surface the user's current supplement stack (#62) as memory facts Forge can
    reason over (timing/gaps) — context only, never a dose or recommendation (A8)."""
    items: list[MemoryItem] = []
    for supplement in supplements[:8]:
        name = str(supplement.get("name", "")).strip()
        if not name:
            continue
        detail = " · ".join(
            str(supplement[key]) for key in ("dose", "timing") if supplement.get(key)
        )
        text = f"Takes {name} ({detail})" if detail else f"Takes {name}"
        items.append(MemoryItem(icon="leaf", text=text))
    return items


_BIOMARKER_TREND_LABEL = {
    "rising": "rising",
    "falling": "falling",
    "stable": "stable",
    "single": "first reading",
}


def _biomarker_memory(trends: list[dict[str, Any]]) -> list[MemoryItem]:
    """Surface lab/blood-result *trends* (#63) as memory facts — direction and the
    latest value only, never an interpretation. The system prompt requires Forge to
    add a disclaimer and redirect to a clinician; here we only state the trend (A8).
    Only present when the user accepted the Medical Disclaimer and left the
    'biomarkers' source on, since the user service gates the data behind both."""
    items: list[MemoryItem] = []
    for trend in trends[:8]:
        marker = str(trend.get("marker_type", "")).strip()
        if not marker:
            continue
        label = marker.replace("_", " ")
        value = trend.get("latest_value")
        unit = str(trend.get("unit", "")).strip()
        direction = _BIOMARKER_TREND_LABEL.get(str(trend.get("direction")), "")
        amount = f"{value}{(' ' + unit) if unit else ''}".strip()
        suffix = f" ({direction})" if direction else ""
        items.append(MemoryItem(icon="heart", text=f"Lab: {label} {amount}{suffix}"))
    return items


class AthleteContextProvider(Protocol):
    """Assembles sources + signals for a user, or None when context is insufficient."""

    async def for_user(self, user_id: str, bearer_token: str) -> GraphSnapshot | None: ...


class HttpAthleteContextProvider:
    """Reads profile/xp from the user service and sessions + connected sources +
    recovery from the training service, then derives signals (A4).

    The in-app log source is always on. Wearable recovery (sleep/HRV/RHR/score)
    is folded into readiness + the ``/ai/context`` signals only when the owning
    source is connected *and* left on (A7 consent); otherwise the recovery fields
    stay ``None`` and readiness falls back to the load-only estimate (A8 — never
    fabricated)."""

    def __init__(self, user_base_url: str, training_base_url: str, nutrition_base_url: str) -> None:
        self._user = user_base_url.rstrip("/")
        self._training = training_base_url.rstrip("/")
        self._nutrition = nutrition_base_url.rstrip("/")

    async def for_user(self, user_id: str, bearer_token: str) -> GraphSnapshot | None:
        headers = {"Authorization": f"Bearer {bearer_token}"}
        async with httpx.AsyncClient(timeout=5.0) as client:
            profile_res = await client.get(f"{self._user}/users/me", headers=headers)
            if profile_res.status_code != 200:
                return None
            profile = profile_res.json()
            if not profile.get("onboarding_completed") or not profile.get("identity_statement"):
                return None

            streak_state: str | None = None
            sessions: list[dict[str, Any]] = []
            nutrition: list[dict[str, Any]] = []
            integration_sources: list[dict[str, Any]] = []
            recovery_samples: list[dict[str, Any]] = []
            athlete_profile: dict[str, Any] = {}
            supplements: list[dict[str, Any]] = []
            biomarker_trends: list[dict[str, Any]] = []
            try:
                xp_res = await client.get(f"{self._user}/users/me/xp", headers=headers)
                if xp_res.status_code == 200:
                    streak_state = xp_res.json().get("streak_state")
                # Athlete Baseline (#61) → memory facts Forge can cite.
                ath_res = await client.get(
                    f"{self._user}/users/me/athlete-profile", headers=headers
                )
                if ath_res.status_code == 200:
                    athlete_profile = ath_res.json()
                # Supplements (#62) → memory facts (informs, never prescribes).
                sup_res = await client.get(
                    f"{self._nutrition}/nutrition/supplements", headers=headers
                )
                if sup_res.status_code == 200:
                    supplements = sup_res.json().get("items", [])
                # Biomarker trends (#63) → memory facts. The user service returns 403
                # unless the Medical Disclaimer is accepted AND the source is on, so a
                # non-200 simply means "no consented lab data" — never an error here.
                bio_res = await client.get(
                    f"{self._user}/users/me/biomarkers", headers=headers
                )
                if bio_res.status_code == 200:
                    biomarker_trends = bio_res.json().get("trends", [])
                sess_res = await client.get(
                    f"{self._training}/training/sessions?limit=50", headers=headers
                )
                if sess_res.status_code == 200:
                    sessions = sess_res.json().get("items", [])
                nut_res = await client.get(
                    f"{self._nutrition}/nutrition/days?limit=40", headers=headers
                )
                if nut_res.status_code == 200:
                    nutrition = nut_res.json().get("items", [])
                # A3: connected-source registry (consent state) + recovery samples,
                # read from the training service. Degrades to load-only if absent.
                src_res = await client.get(
                    f"{self._training}/integrations/sources", headers=headers
                )
                if src_res.status_code == 200:
                    integration_sources = src_res.json().get("items", [])
                rec_res = await client.get(
                    f"{self._training}/integrations/recovery", headers=headers
                )
                if rec_res.status_code == 200:
                    recovery_samples = rec_res.json().get("items", [])
            except httpx.RequestError:
                pass

        # A7 consent: only fold in recovery from sources the user left ON. If the
        # recovery-bearing source is off/disconnected, treat recovery as absent.
        recovery = _recovery.fold_recovery(integration_sources, recovery_samples)
        derived = _signals.compute_signals(
            sessions,
            streak_state=streak_state,
            sleep_hours=recovery.sleep_hours,
            sleep_delta=recovery.sleep_delta,
            hrv=recovery.hrv,
            hrv_delta_pct=recovery.hrv_delta_pct,
            resting_hr=recovery.resting_hr,
        )
        sources = [
            ContextSource(
                id="logs",
                label="In-app logs",
                icon="edit",
                on=True,
                last="Live",
                metric="Sets · Meals · RPE",
            )
        ]
        # Surface the sources the user left ON in "what your coach sees" — an off
        # or disconnected source is not advertised (and feeds no signals).
        sources.extend(
            ContextSource(
                id=str(s["id"]),
                label=str(s.get("label", s["id"])),
                icon=str(s.get("icon", "activity")),
                on=bool(s.get("on", False)),
                last=str(s.get("last", "Never")),
                metric=str(s.get("metric", "")),
            )
            for s in integration_sources
            if s.get("on")
        )
        return GraphSnapshot(
            sources=sources,
            signals=_to_context_signals(derived),
            sessions=sessions,
            nutrition=nutrition,
            memory=(
                _profile_memory(athlete_profile)
                + _supplement_memory(supplements)
                + _biomarker_memory(biomarker_trends)
            ),
        )


_athlete_provider: AthleteContextProvider | None = None


def get_athlete_context_provider() -> AthleteContextProvider:
    """Return the configured athlete-context provider (FastAPI dependency; tests override)."""
    global _athlete_provider
    if _athlete_provider is None:
        settings = get_settings()
        _athlete_provider = HttpAthleteContextProvider(
            settings.user_service_base_url,
            settings.training_service_base_url,
            settings.nutrition_service_base_url,
        )
    return _athlete_provider
