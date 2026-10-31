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
from app.errors import AppError


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
    title: str | None = None
    sport_detail: str | None = None
    elapsed_minutes: int | None = None
    avg_hr: int | None = None
    max_hr: int | None = None
    is_race: bool = False


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

    # First sync imports deep history (races, long efforts) so the race team knows
    # the athlete's past; later syncs re-read a 3-day overlap for late uploads.
    FIRST_SYNC_PAGES = 10
    INCREMENTAL_PAGES = 3
    PAGE_SIZE = 100

    async def fetch(self, access_token: str, *, since: datetime | None) -> SyncResult:
        headers = {"Authorization": f"Bearer {access_token}"}
        params: dict[str, Any] = {"per_page": self.PAGE_SIZE}
        if since is not None:
            params["after"] = int((since - timedelta(days=3)).timestamp())
        pages = self.FIRST_SYNC_PAGES if since is None else self.INCREMENTAL_PAGES
        sessions: list[NormalizedSession] = []
        for page in range(1, pages + 1):
            rows = await _get_json(self._ACTIVITIES_URL, {**params, "page": page}, headers)
            if not isinstance(rows, list) or not rows:
                break
            sessions.extend(s for r in rows if (s := _strava_session(r)))
            if len(rows) < self.PAGE_SIZE:
                break
        return SyncResult(sessions=sessions)

    # ── Routes (training#19): list the athlete's routes, export one as GPX ──
    _ATHLETE_URL = "https://www.strava.com/api/v3/athlete"
    _ROUTES_URL = "https://www.strava.com/api/v3/athletes/{athlete}/routes"
    _GPX_URL = "https://www.strava.com/api/v3/routes/{route}/export_gpx"
    GPX_LIMIT = 4 * 1024 * 1024

    async def routes(self, access_token: str) -> list[dict[str, Any]]:
        headers = {"Authorization": f"Bearer {access_token}"}
        athlete = await _get_json(self._ATHLETE_URL, {}, headers)
        rows = await _get_json(
            self._ROUTES_URL.format(athlete=int(athlete["id"])), {"per_page": 50}, headers
        )
        return [r for r in (_strava_route(row) for row in rows or []) if r]

    async def route_gpx(self, access_token: str, route_id: str) -> bytes:
        headers = {"Authorization": f"Bearer {access_token}"}
        return await _get_bytes(self._GPX_URL.format(route=route_id), headers, self.GPX_LIMIT)


def _strava_route(row: dict[str, Any]) -> dict[str, Any] | None:
    route_id = str(row.get("id_str") or row.get("id") or "")
    if not route_id.isdigit():
        return None
    kind = {1: "ride", 2: "run"}.get(int(row.get("type") or 0), "other")
    return {
        "id": route_id,
        "name": str(row.get("name") or "Strava route")[:160],
        "distance_km": round(float(row.get("distance") or 0) / 1000, 2),
        "elevation_gain_m": round(float(row.get("elevation_gain") or 0)),
        "kind": kind,
        "private": bool(row.get("private")),
        "updated_at": row.get("updated_at"),
    }


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
        rows = await _get_json(self._RECOVERY_URL, {}, {"Authorization": f"Bearer {access_token}"})
        records = rows.get("records", []) if isinstance(rows, dict) else rows
        return SyncResult(recovery=[r for row in records if (r := _whoop_recovery(row))])


# ── HTTP helpers (small, so providers stay declarative) ──────────────────────


def _name(url: str) -> str:
    return "Strava" if "strava" in url else "WHOOP" if "whoop" in url else "The provider"


def _checked(resp: httpx.Response, url: str) -> httpx.Response:
    """Provider answers the app can explain, instead of a bare 500."""
    if resp.status_code in (400, 401, 403):
        raise AppError(
            400,
            "provider_rejected",
            f"{_name(url)} did not accept the connection — connect again.",
        )
    if resp.status_code == 429:
        raise AppError(
            503, "provider_rate_limited", f"{_name(url)} is busy right now — try again shortly."
        )
    if resp.status_code >= 400:
        raise AppError(
            503, "provider_unavailable", f"{_name(url)} had an error — try again shortly."
        )
    return resp


async def _post_form(url: str, data: dict[str, Any]) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, data=data)
    except httpx.HTTPError as exc:
        raise AppError(
            503, "provider_unreachable", f"{_name(url)} could not be reached — try again."
        ) from exc
    return dict(_checked(resp, url).json())


async def _get_json(url: str, params: dict[str, Any], headers: dict[str, str]) -> Any:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params, headers=headers)
    except httpx.HTTPError as exc:
        raise AppError(
            503, "provider_unreachable", f"{_name(url)} could not be reached — try again."
        ) from exc
    return _checked(resp, url).json()


async def _get_bytes(url: str, headers: dict[str, str], limit: int) -> bytes:
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, headers=headers)
    except httpx.HTTPError as exc:
        raise AppError(
            503, "provider_unreachable", f"{_name(url)} could not be reached — try again."
        ) from exc
    content = _checked(resp, url).content
    if len(content) > limit:
        raise AppError(413, "payload_too_large", "That route is larger than 4 MiB.")
    return content


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


# Strava sport_type (preferred) / legacy type -> STREM session type.
_STRAVA_SPORTS: dict[str, str] = {
    "run": "running",
    "virtualrun": "running",
    "trailrun": "trail_running",
    "ride": "cycling",
    "virtualride": "cycling",
    "gravelride": "cycling",
    "mountainbikeride": "cycling",
    "ebikeride": "cycling",
    "emountainbikeride": "cycling",
    "velomobile": "cycling",
    "swim": "swimming",
    "hike": "hiking",
    "walk": "hiking",
    "snowshoe": "hiking",
    "weighttraining": "strength",
    "crossfit": "strength",
    "workout": "hybrid",
    "hiit": "hybrid",
    "yoga": "mobility",
    "pilates": "mobility",
    "rowing": "rowing",
    "virtualrow": "rowing",
    "canoeing": "rowing",
    "kayaking": "rowing",
    "nordicski": "skiing",
    "backcountryski": "skiing",
    "alpineski": "skiing",
    "rollerski": "skiing",
}
# Strava workout_type values that mean "race" (runs: 1, rides: 11).
_STRAVA_RACE_WORKOUT_TYPES = {1, 11}
_NO_DISTANCE = {"strength", "hybrid", "mobility"}


def _int_or_none(value: Any) -> int | None:
    try:
        return round(float(value)) if value is not None else None
    except (TypeError, ValueError):
        return None


def _strava_session(row: dict[str, Any]) -> NormalizedSession | None:
    sport = str(row.get("sport_type") or row.get("type") or "")
    kind = _STRAVA_SPORTS.get(sport.lower())
    if kind is None or row.get("id") is None:
        return None
    started = row.get("start_date")
    logged_at = (
        datetime.fromisoformat(started.replace("Z", "+00:00")) if started else datetime.now(UTC)
    )
    elapsed = int(row.get("elapsed_time", 0) or 0)
    moving = int(row.get("moving_time", 0) or 0) or elapsed
    distance_m = float(row.get("distance", 0) or 0)
    elev = row.get("total_elevation_gain")
    name = row.get("name")
    title = str(name)[:160] if name else None
    return NormalizedSession(
        external_id=str(row["id"]),
        session_type=kind,
        duration_minutes=max(1, round(moving / 60)),
        distance_km=round(distance_m / 1000, 2)
        if distance_m and kind not in _NO_DISTANCE
        else None,
        elevation_m=round(float(elev)) if elev else None,
        logged_at=logged_at,
        notes=title,
        title=title,
        sport_detail=sport[:40] or None,
        elapsed_minutes=max(1, round(elapsed / 60)) if elapsed else None,
        avg_hr=_int_or_none(row.get("average_heartrate")),
        max_hr=_int_or_none(row.get("max_heartrate")),
        is_race=row.get("workout_type") in _STRAVA_RACE_WORKOUT_TYPES,
    )


def _whoop_recovery(row: dict[str, Any]) -> NormalizedRecovery | None:
    raw_score = row.get("score")
    score: dict[str, Any] = raw_score if isinstance(raw_score, dict) else row
    created = row.get("created_at") or row.get("updated_at")
    day = datetime.fromisoformat(created.replace("Z", "+00:00")) if created else datetime.now(UTC)
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
