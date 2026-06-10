"""MVP-16 AI wrapper: tribe narrative over the community weekly summary."""

import asyncio
import uuid
from typing import Any

import httpx

from app.config import get_settings
from app.main import create_app
from app.tribe_coach import compose_tribe_narrative, get_tribe_summary_provider
from tests.support import TEST_SETTINGS, auth_header


def test_narrative_mentions_power_and_nudge() -> None:
    summary: dict[str, Any] = {
        "name": "Forge Circle",
        "tribe_power": 425,
        "checkins_this_week": 5,
        "active_member_count": 1,
        "member_count": 3,
        "inactive_members": [{"user_id": "a"}, {"user_id": "b"}],
    }
    text = compose_tribe_narrative(summary)
    assert "Forge Circle" in text
    assert "425" in text
    assert "gone quiet" in text


class _FakeTribeProvider:
    def __init__(self, summary: dict[str, Any] | None) -> None:
        self._summary = summary

    async def for_user(self, bearer_token: str) -> dict[str, Any] | None:
        return self._summary


def _build(summary: dict[str, Any] | None) -> Any:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: TEST_SETTINGS
    app.dependency_overrides[get_tribe_summary_provider] = lambda: _FakeTribeProvider(summary)
    return app


def test_tribe_summary_endpoint_returns_narrative() -> None:
    summary: dict[str, Any] = {
        "tribe_id": str(uuid.uuid4()),
        "name": "Forge Circle",
        "tribe_power": 425,
        "checkins_this_week": 5,
        "active_member_count": 1,
        "member_count": 1,
        "inactive_members": [],
    }

    async def scenario() -> None:
        transport = httpx.ASGITransport(app=_build(summary))
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/v1/ai/coach/tribe-summary", headers=auth_header(uuid.uuid4())
            )
            assert response.status_code == 200
            body = response.json()
            assert body["name"] == "Forge Circle"
            assert "425" in body["narrative"]

    asyncio.run(scenario())


def test_tribe_summary_404_without_tribe() -> None:
    async def scenario() -> None:
        transport = httpx.ASGITransport(app=_build(None))
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/v1/ai/coach/tribe-summary", headers=auth_header(uuid.uuid4())
            )
            assert response.status_code == 404

    asyncio.run(scenario())
