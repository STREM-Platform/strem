"""P2-03: seasonal arc resolution and the read endpoint."""

import asyncio
import uuid
from datetime import date

from app.seasons import resolve_active
from tests.support import ai_app, auth_header


def test_resolves_iron_october() -> None:
    status = resolve_active(date(2026, 10, 15))
    assert status.active is True
    assert status.season is not None
    assert status.season.key == "iron_october"
    assert status.season.xp_multiplier == 1.5


def test_off_season_is_inactive() -> None:
    status = resolve_active(date(2026, 6, 10))
    assert status.active is False
    assert status.season is None


def test_season_endpoint_returns_status() -> None:
    async def scenario() -> None:
        async with ai_app() as harness:
            response = await harness.client.get(
                "/v1/ai/season/current", headers=auth_header(uuid.uuid4())
            )
            assert response.status_code == 200
            assert "active" in response.json()

    asyncio.run(scenario())
