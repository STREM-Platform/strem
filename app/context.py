"""Context assembly for mission/recap generation.

The orchestrator reads identity context from approved service APIs only — it
never copies raw logs into its own database (ai-architecture.md "Context
Privacy"). For MVP the identity layer comes from `strem-user-service`'s profile;
consistency signals default conservatively so a brand-new user only ever gets a
re-entry/maintenance first mission.
"""

from __future__ import annotations

from dataclasses import dataclass
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


class ContextProvider(Protocol):
    """Assembles a context bundle for a user, or None when context is insufficient."""

    async def for_user(self, user_id: str, bearer_token: str) -> ContextBundle | None: ...


class HttpContextProvider:
    """Reads identity context from strem-user-service's profile API."""

    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")

    async def for_user(self, user_id: str, bearer_token: str) -> ContextBundle | None:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{self._base_url}/users/me",
                headers={"Authorization": f"Bearer {bearer_token}"},
            )
        if response.status_code != 200:
            return None
        profile: dict[str, Any] = response.json()
        # Insufficient context until onboarding gives the coach an identity to ground in.
        if not profile.get("onboarding_completed") or not profile.get("identity_statement"):
            return None
        return ContextBundle(
            identity_statement=str(profile["identity_statement"]),
            transformation_goal=profile.get("transformation_goal"),
            training_level=profile.get("training_level"),
            weekly_target_days=profile.get("weekly_target_days"),
            active_days_last_week=0,  # MVP: no logging history is assumed for first generation
        )


_provider: ContextProvider | None = None


def get_context_provider() -> ContextProvider:
    """Return the configured context provider (FastAPI dependency; tests override)."""
    global _provider
    if _provider is None:
        _provider = HttpContextProvider(get_settings().user_service_base_url)
    return _provider
