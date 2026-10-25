"""HTTP access to the owning services, always with the athlete's own token."""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass
from typing import Any

import httpx

from app.config import get_settings
from app.errors import AppError


def _dict(value: Any) -> dict[str, Any] | None:
    return dict(value) if isinstance(value, dict) else None


class ServiceUnavailable(AppError):
    def __init__(self, service: str) -> None:
        super().__init__(503, "service_unavailable", f"The {service} service is unavailable.")


@dataclass
class RaceServices:
    """Reads mission/athlete data and writes generated layers back to their owners."""

    user_base: str
    training_base: str
    token: str
    timeout: float = 20.0

    @classmethod
    def for_token(cls, token: str) -> RaceServices:
        settings = get_settings()
        return cls(settings.user_service_base_url, settings.training_service_base_url, token)

    @property
    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"}

    async def _request(
        self,
        method: str,
        base: str,
        path: str,
        *,
        json: Any = None,
        headers: dict[str, str] | None = None,
        params: dict[str, Any] | None = None,
        missing_ok: bool = True,
    ) -> Any:
        service = "user" if base == self.user_base else "training"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.request(
                    method,
                    f"{base.rstrip('/')}{path}",
                    json=json,
                    params=params,
                    headers={**self._headers, **(headers or {})},
                )
        except httpx.RequestError as exc:
            raise ServiceUnavailable(service) from exc
        if response.status_code == 404 and missing_ok:
            code = _code(response)
            if code in ("mission_not_found",):
                raise AppError(404, "mission_not_found", "Race Mission not found.")
            return None
        if response.status_code in (401, 403):
            raise AppError(401, "unauthorized", "Authentication required.")
        if response.status_code >= 400:
            if response.status_code < 500:
                raise AppError(
                    response.status_code,
                    _code(response) or "upstream_rejected",
                    _message(response) or "The request was rejected.",
                )
            raise ServiceUnavailable(service)
        if response.status_code == 204 or not response.content:
            return None
        return response.json()

    # ── Reads ────────────────────────────────────────────────────────────────
    async def mission(self, mission_id: uuid.UUID) -> dict[str, Any]:
        mission = await self._request("GET", self.user_base, f"/race-missions/{mission_id}")
        if mission is None:
            raise AppError(404, "mission_not_found", "Race Mission not found.")
        return dict(mission)

    async def missions(self) -> list[dict[str, Any]]:
        body = await self._request("GET", self.user_base, "/race-missions")
        return list((body or {}).get("items", []))

    async def user(self) -> dict[str, Any] | None:
        return _dict(await self._safe(self._request("GET", self.user_base, "/users/me")))

    async def athlete_profile(self) -> dict[str, Any] | None:
        return _dict(
            await self._safe(self._request("GET", self.user_base, "/users/me/athlete-profile"))
        )

    async def races(self) -> list[dict[str, Any]]:
        body = await self._safe(self._request("GET", self.user_base, "/users/me/races"))
        return list((body or {}).get("items", []))

    async def layers(self, mission_id: uuid.UUID) -> dict[str, dict[str, Any]]:
        body = await self._safe(
            self._request("GET", self.user_base, f"/race-missions/{mission_id}/layers")
        )
        return {item["kind"]: item for item in (body or {}).get("items", [])}

    async def plan(self, mission_id: uuid.UUID) -> dict[str, Any] | None:
        return _dict(
            await self._safe(
                self._request("GET", self.training_base, f"/training/missions/{mission_id}/plan")
            )
        )

    async def progress(self, mission_id: uuid.UUID) -> dict[str, Any] | None:
        return _dict(
            await self._safe(
                self._request(
                    "GET", self.training_base, f"/training/missions/{mission_id}/progress"
                )
            )
        )

    async def course(self, mission_id: uuid.UUID) -> dict[str, Any] | None:
        return _dict(
            await self._safe(
                self._request("GET", self.training_base, f"/training/missions/{mission_id}/course")
            )
        )

    async def sessions(self, limit: int = 120) -> list[dict[str, Any]]:
        body = await self._safe(
            self._request("GET", self.training_base, "/training/sessions", params={"limit": limit})
        )
        return list((body or {}).get("items", []))

    async def race_sessions(self) -> list[dict[str, Any]]:
        body = await self._safe(
            self._request(
                "GET",
                self.training_base,
                "/training/sessions",
                params={"limit": 200, "races_only": "true"},
            )
        )
        return list((body or {}).get("items", []))

    async def checkins(self) -> list[dict[str, Any]]:
        body = await self._safe(
            self._request("GET", self.training_base, "/training/checkins", params={"limit": 21})
        )
        return list((body or {}).get("items", []))

    async def sources(self) -> list[dict[str, Any]]:
        body = await self._safe(self._request("GET", self.training_base, "/integrations/sources"))
        return list((body or {}).get("items", []))

    async def recovery(self) -> list[dict[str, Any]]:
        body = await self._safe(self._request("GET", self.training_base, "/integrations/recovery"))
        return list((body or {}).get("items", []))

    # ── Writes ───────────────────────────────────────────────────────────────
    async def put_plan(self, mission_id: uuid.UUID, body: dict[str, Any]) -> dict[str, Any]:
        result = await self._request(
            "PUT",
            self.training_base,
            f"/training/missions/{mission_id}/plan",
            json=body,
            headers={"If-Match": "*"},
            missing_ok=False,
        )
        return dict(result)

    async def put_layer(
        self, mission_id: uuid.UUID, kind: str, body: dict[str, Any]
    ) -> dict[str, Any]:
        result = await self._request(
            "PUT",
            self.user_base,
            f"/race-missions/{mission_id}/layers/{kind}",
            json=body,
            headers={"If-Match": "*"},
            missing_ok=False,
        )
        return dict(result)

    async def import_races(self, items: list[dict[str, Any]]) -> dict[str, Any] | None:
        return _dict(
            await self._request(
                "POST",
                self.user_base,
                "/users/me/races/import",
                json={"source": "strava", "items": items},
                missing_ok=False,
            )
        )

    async def _safe(self, call: Any) -> Any:
        """Optional context: a failing optional read degrades to 'absent', never fake."""
        try:
            return await asyncio.wait_for(call, timeout=self.timeout)
        except (ServiceUnavailable, TimeoutError):
            return None
        except AppError as error:
            if error.code == "mission_not_found":
                raise
            return None


def _code(response: httpx.Response) -> str | None:
    try:
        value = response.json().get("code")
        return str(value) if value else None
    except (ValueError, AttributeError):
        return None


def _message(response: httpx.Response) -> str | None:
    try:
        value = response.json().get("message")
        return str(value) if value else None
    except (ValueError, AttributeError):
        return None
