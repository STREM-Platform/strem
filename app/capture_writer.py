"""Forwards a *confirmed* capture to the owning service (D3/D4/D6).

The orchestrator owns no training/nutrition write schema — on confirm it forwards
to the source-of-truth service over its own API, carrying the user's bearer token.
Behind a Protocol so tests stub the network. A capture whose detail has no home
in the owning service (e.g. per-meal macros, which the nutrition service tracks
only as day-level ``targets_met``) keeps that detail in the agent action's cited
data; the day is still marked.
"""

from __future__ import annotations

from datetime import date as date_type
from typing import Protocol

import httpx

from app.config import Settings, get_settings


class CaptureWriter(Protocol):
    """Writes a confirmed capture to its owning service; returns the new id."""

    async def write_workout(
        self,
        *,
        token: str,
        session_type: str,
        duration_minutes: int,
        distance_km: float | None,
        notes: str | None,
    ) -> str | None: ...

    async def write_meal(
        self, *, token: str, day: date_type, targets_met: bool, notes: str | None
    ) -> str | None: ...


class HttpCaptureWriter:
    """Posts to strem-training-service / strem-nutrition-service over HTTP."""

    def __init__(self, *, training_base_url: str, nutrition_base_url: str) -> None:
        self._training = training_base_url.rstrip("/")
        self._nutrition = nutrition_base_url.rstrip("/")

    async def write_workout(
        self,
        *,
        token: str,
        session_type: str,
        duration_minutes: int,
        distance_km: float | None,
        notes: str | None,
    ) -> str | None:
        body: dict[str, object] = {
            "session_type": session_type,
            "duration_minutes": duration_minutes,
        }
        if distance_km is not None:
            body["distance_km"] = distance_km
        if notes is not None:
            body["notes"] = notes
        return await self._post(f"{self._training}/training/sessions", body, token)

    async def write_meal(
        self, *, token: str, day: date_type, targets_met: bool, notes: str | None
    ) -> str | None:
        body: dict[str, object] = {"date": day.isoformat(), "targets_met": targets_met}
        if notes is not None:
            body["notes"] = notes
        return await self._post(f"{self._nutrition}/nutrition/days", body, token)

    async def _post(self, url: str, body: dict[str, object], token: str) -> str | None:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url, json=body, headers={"Authorization": f"Bearer {token}"}
            )
        resp.raise_for_status()
        data = resp.json()
        new_id = data.get("id")
        return str(new_id) if new_id is not None else None


_writer: CaptureWriter | None = None


def get_capture_writer() -> CaptureWriter:
    """FastAPI dependency — the configured capture writer (tests override)."""
    global _writer
    if _writer is None:
        settings: Settings = get_settings()
        _writer = HttpCaptureWriter(
            training_base_url=settings.training_service_base_url,
            nutrition_base_url=settings.nutrition_service_base_url,
        )
    return _writer
