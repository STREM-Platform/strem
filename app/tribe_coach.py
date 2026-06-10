"""AI tribe summary: identity-grounded narrative over the community read (MVP-16).

The community service owns the weekly tribe accountability data
(`GET /tribes/{id}/weekly-summary`). The orchestrator wraps that collective read
in coach narrative — and surfaces the inactive members as gentle nudge context.
It copies no raw logs; it reads the approved community API per request.
"""

from __future__ import annotations

from typing import Any, Protocol

import httpx

from app.config import get_settings


class TribeSummaryProvider(Protocol):
    """Fetches the caller's tribe weekly summary, or None when they have no tribe."""

    async def for_user(self, bearer_token: str) -> dict[str, Any] | None: ...


class HttpTribeSummaryProvider:
    """Reads /tribes/me + /tribes/{id}/weekly-summary from the community service."""

    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")

    async def for_user(self, bearer_token: str) -> dict[str, Any] | None:
        headers = {"Authorization": f"Bearer {bearer_token}"}
        async with httpx.AsyncClient(timeout=5.0) as client:
            tribe_response = await client.get(f"{self._base_url}/tribes/me", headers=headers)
            if tribe_response.status_code != 200:
                return None
            tribe = tribe_response.json()
            summary_response = await client.get(
                f"{self._base_url}/tribes/{tribe['id']}/weekly-summary", headers=headers
            )
            if summary_response.status_code != 200:
                return None
            summary: dict[str, Any] = summary_response.json()
        summary["name"] = tribe.get("name", "Your tribe")
        return summary


def compose_tribe_narrative(summary: dict[str, Any]) -> str:
    """Compose an identity-grounded weekly tribe narrative from the summary."""
    name = summary.get("name", "Your tribe")
    power = int(summary.get("tribe_power", 0))
    checkins = int(summary.get("checkins_this_week", 0))
    active = int(summary.get("active_member_count", 0))
    members = int(summary.get("member_count", 0))
    inactive = summary.get("inactive_members", [])

    opener = (
        f"{name} carried {power:,} Tribe Power this week — {checkins} "
        f"check-in{'s' if checkins != 1 else ''} across {active} of {members} members."
    )
    if inactive:
        count = len(inactive)
        closer = (
            f" {count} member{'s have' if count != 1 else ' has'} gone quiet. "
            "A short check-in could bring them back — no pressure, just presence."
        )
    else:
        closer = " Everyone showed up. Hold the standard and keep building together."
    return opener + closer


_provider: TribeSummaryProvider | None = None


def get_tribe_summary_provider() -> TribeSummaryProvider:
    """Return the configured tribe-summary provider (FastAPI dependency; tests override)."""
    global _provider
    if _provider is None:
        _provider = HttpTribeSummaryProvider(get_settings().community_service_base_url)
    return _provider
