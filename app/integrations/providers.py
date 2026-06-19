"""External provider clients (A3): Whoop and Strava server-OAuth + sync.

Each provider exchanges an OAuth ``code`` for tokens, refreshes them, and fetches
activities/recovery, normalizing into this service's domain (runs become training
sessions; recovery becomes recovery samples). The ``Provider`` protocol keeps the
network behind an interface so the sync/connect logic is testable with stubs.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any, Protocol

import httpx

from app.config import Settings


class ProviderId(StrEnum):
    WHOOP = "whoop"
    STRAVA = "strava"
    HEALTH = "health"


# Display catalog for the connection registry (label/icon/metric per provider).
PROVIDER_CATALOG: dict[str, dict[str, str]] = {
    ProviderId.WHOOP: {"label": "Whoop", "icon": "heart", "metric": "Sleep · HRV · Recovery"},
    ProviderId.STRAVA: {"label": "Strava", "icon": "route", "metric": "Runs · Pace · Elevation"},
    ProviderId.HEALTH: {"label": "Apple Health", "icon": "activity", "metric": "Steps · Workouts"},
}


@dataclass(frozen=True)
class TokenSet:
    access_token: str
    refresh_token: str | None = None
    scope: str | None = None
    expires_at: datetime | None = None


@dataclass(frozen=True)
class NormalizedSession:
    external_id: str
    session_type: str
    duration_minutes: int
    logged_at: datetime
    distance_km: float | None = None
    elevation_m: int | None = None
    notes: str | None = None


@dataclass(frozen=True)
class NormalizedRecovery:
    date: datetime
    hrv_ms: float | None = None
    resting_hr: int | None = None
    sleep_hours: float | None = None
    recovery_score: int | None = None


@dataclass(frozen=True)
class SyncResult:
    sessions: list[NormalizedSession] = field(default_factory=list)
    recovery: list[NormalizedRecovery] = field(default_factory=list)


class Provider(Protocol):
    """An external data source: OAuth token lifecycle + a normalized sync."""

    id: str

    async def exchange_code(self, code: str, redirect_uri: str) -> TokenSet: ...

    async def refresh(self, refresh_token: str) -> TokenSet: ...

    async def fetch(self, access_token: str, *, since: datetime | None) -> SyncResult: ...


def _expiry(expires_in: int | None) -> datetime | None:
    if not expires_in:
        return None
    return datetime.now(UTC) + timedelta(seconds=expires_in)


class StravaProvider:
    """Strava runs → training sessions (with elevation gain, feeding D5)."""

    id = ProviderId.STRAVA.value
    _TOKEN_URL = "https://www.strava.com/oauth/token"
    _ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities"

    def __init__(self, client_id: str, client_secret: str) -> None:
        self._client_id = client_id
        self._client_secret = client_secret

    async def exchange_code(self, code: str, redirect_uri: str) -> TokenSet:
        data = {
            "client_id": self._client_id,
            "client_secret": self._client_secret,
            "code": code,
            "grant_type": "authorization_code",
        }
        return _strava_token(await _post_form(self._TOKEN_URL, data))

    async def refresh(self, refresh_token: str) -> TokenSet:
        data = {
            "client_id": self._client_id,
            "client_secret": self._client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        return _strava_token(await _post_form(self._TOKEN_URL, data))

    async def fetch(self, access_token: str, *, since: datetime | None) -> SyncResult:
        params: dict[str, Any] = {"per_page": 50}
        if since is not None:
            params["after"] = int(since.timestamp())
        rows = await _get_json(
            self._ACTIVITIES_URL, params, {"Authorization": f"Bearer {access_token}"}
        )
        return SyncResult(sessions=[s for r in rows if (s := _strava_session(r))])


class WhoopProvider:
    """Whoop recovery (sleep / HRV / resting HR / recovery score) for A4."""

    id = ProviderId.WHOOP.value
    _TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token"
    _RECOVERY_URL = "https://api.prod.whoop.com/developer/v1/recovery"

    def __init__(self, client_id: str, client_secret: str) -> None:
        self._client_id = client_id
        self._client_secret = client_secret

    async def exchange_code(self, code: str, redirect_uri: str) -> TokenSet:
        data = {
            "client_id": self._client_id,
            "client_secret": self._client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        }
        return _oauth_token(await _post_form(self._TOKEN_URL, data))

    async def refresh(self, refresh_token: str) -> TokenSet:
        data = {
            "client_id": self._client_id,
            "client_secret": self._client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        return _oauth_token(await _post_form(self._TOKEN_URL, data))

    async def fetch(self, access_token: str, *, since: datetime | None) -> SyncResult:
        rows = await _get_json(
            self._RECOVERY_URL, {}, {"Authorization": f"Bearer {access_token}"}
        )
        records = rows.get("records", []) if isinstance(rows, dict) else rows
        return SyncResult(recovery=[r for row in records if (r := _whoop_recovery(row))])


# ── HTTP helpers (small, so providers stay declarative) ──────────────────────


async def _post_form(url: str, data: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(url, data=data)
    resp.raise_for_status()
    return dict(resp.json())


async def _get_json(url: str, params: dict[str, Any], headers: dict[str, str]) -> Any:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params=params, headers=headers)
    resp.raise_for_status()
    return resp.json()


def _oauth_token(payload: dict[str, Any]) -> TokenSet:
    return TokenSet(
        access_token=str(payload["access_token"]),
        refresh_token=payload.get("refresh_token"),
        scope=payload.get("scope"),
        expires_at=_expiry(payload.get("expires_in")),
    )


def _strava_token(payload: dict[str, Any]) -> TokenSet:
    expires_at = payload.get("expires_at")
    return TokenSet(
        access_token=str(payload["access_token"]),
        refresh_token=payload.get("refresh_token"),
        scope=payload.get("scope"),
        expires_at=datetime.fromtimestamp(expires_at, tz=UTC) if expires_at else None,
    )


def _strava_session(row: dict[str, Any]) -> NormalizedSession | None:
    if str(row.get("type", "")).lower() not in ("run", "trailrun", "ride", "swim"):
        return None
    kind = {"run": "running", "trailrun": "trail_running", "ride": "cycling", "swim": "swimming"}
    started = row.get("start_date")
    logged_at = datetime.fromisoformat(started.replace("Z", "+00:00")) if started else datetime.now(
        UTC
    )
    moving = int(row.get("moving_time", 0)) or int(row.get("elapsed_time", 0))
    distance_m = float(row.get("distance", 0) or 0)
    elev = row.get("total_elevation_gain")
    return NormalizedSession(
        external_id=str(row["id"]),
        session_type=kind[str(row["type"]).lower()],
        duration_minutes=max(1, round(moving / 60)),
        distance_km=round(distance_m / 1000, 2) if distance_m else None,
        elevation_m=round(float(elev)) if elev else None,
        logged_at=logged_at,
        notes=row.get("name"),
    )


def _whoop_recovery(row: dict[str, Any]) -> NormalizedRecovery | None:
    raw_score = row.get("score")
    score: dict[str, Any] = raw_score if isinstance(raw_score, dict) else row
    created = row.get("created_at") or row.get("updated_at")
    day = (
        datetime.fromisoformat(created.replace("Z", "+00:00")) if created else datetime.now(UTC)
    )
    return NormalizedRecovery(
        date=day,
        hrv_ms=score.get("hrv_rmssd_milli"),
        resting_hr=score.get("resting_heart_rate"),
        recovery_score=score.get("recovery_score"),
    )


def build_provider_registry(settings: Settings) -> dict[str, Provider]:
    """Construct the configured providers (those with credentials)."""
    registry: dict[str, Provider] = {}
    if settings.strava_client_id and settings.strava_client_secret:
        registry[ProviderId.STRAVA.value] = StravaProvider(
            settings.strava_client_id, settings.strava_client_secret
        )
    if settings.whoop_client_id and settings.whoop_client_secret:
        registry[ProviderId.WHOOP.value] = WhoopProvider(
            settings.whoop_client_id, settings.whoop_client_secret
        )
    return registry


_registry: dict[str, Provider] | None = None


def get_provider_registry() -> dict[str, Provider]:
    """FastAPI dependency — the configured provider clients (tests override)."""
    global _registry
    if _registry is None:
        from app.config import get_settings

        _registry = build_provider_registry(get_settings())
    return _registry
