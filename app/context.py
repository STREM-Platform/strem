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
