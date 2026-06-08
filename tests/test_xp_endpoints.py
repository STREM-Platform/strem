"""Tests for the XP and medal read endpoints, seeded via award_xp."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta

from app.events import InMemoryPublisher
from app.progression import award_xp
from app.schemas.xp import XPSource
from tests.support import Harness, auth_header, user_app


def run(scenario: Callable[[Harness], Awaitable[None]]) -> None:
    async def _inner() -> None:
        async with user_app() as harness:
            await scenario(harness)

    asyncio.run(_inner())


async def _seed(
    harness: Harness,
    user_id: uuid.UUID,
    source: XPSource,
    amount: int,
    earned_at: datetime | None = None,
) -> None:
    async with harness.sessionmaker() as session:
        await award_xp(
            session,
            InMemoryPublisher(),
            user_id=user_id,
            source=source,
            amount=amount,
            earned_at=earned_at,
        )
        await session.commit()


def test_xp_summary_reports_rank_progress() -> None:
    async def scenario(harness: Harness) -> None:
        user_id = uuid.uuid4()
        await _seed(harness, user_id, XPSource.STRENGTH_SESSION, 50)
        response = await harness.client.get("/v1/users/me/xp", headers=auth_header(user_id))
        assert response.status_code == 200
        body = response.json()
        assert body["total_xp"] == 50
        assert body["rank"] == "Initiate"
        assert body["next_rank"] == "Builder"
        assert body["rank_xp_floor"] == 0
        assert body["rank_xp_ceiling"] == 999
        assert body["xp_into_rank"] == 50
        assert body["xp_to_next_rank"] == 950

    run(scenario)


def test_xp_summary_empty_user_is_initiate_zero() -> None:
    async def scenario(harness: Harness) -> None:
        response = await harness.client.get("/v1/users/me/xp", headers=auth_header(uuid.uuid4()))
        assert response.status_code == 200
        body = response.json()
        assert body["total_xp"] == 0
        assert body["rank"] == "Initiate"

    run(scenario)


def test_xp_history_is_paginated_newest_first() -> None:
    async def scenario(harness: Harness) -> None:
        user_id = uuid.uuid4()
        base = datetime(2026, 6, 1, 12, 0, tzinfo=UTC)
        await _seed(harness, user_id, XPSource.NUTRITION_DAY, 25, base)
        await _seed(harness, user_id, XPSource.STRENGTH_SESSION, 50, base + timedelta(days=1))

        response = await harness.client.get(
            "/v1/users/me/xp/history?limit=1&offset=0", headers=auth_header(user_id)
        )
        assert response.status_code == 200
        body = response.json()
        assert body["pagination"] == {"limit": 1, "offset": 0, "total": 2}
        assert len(body["items"]) == 1
        assert body["items"][0]["source"] == "strength_session"  # newest first
        assert body["items"][0]["new_total"] == 75

    run(scenario)


def test_medals_endpoint_lists_earned_medals() -> None:
    async def scenario(harness: Harness) -> None:
        user_id = uuid.uuid4()
        await _seed(harness, user_id, XPSource.RUNNING_SESSION, 40)
        response = await harness.client.get("/v1/users/me/medals", headers=auth_header(user_id))
        assert response.status_code == 200
        medal_types = {item["medal_type"] for item in response.json()["items"]}
        assert "first_mile" in medal_types
        assert "first_steps" in medal_types

    run(scenario)


def test_profile_reflects_total_xp_and_medals() -> None:
    async def scenario(harness: Harness) -> None:
        user_id = uuid.uuid4()
        await _seed(harness, user_id, XPSource.STRENGTH_SESSION, 50)
        response = await harness.client.get("/v1/users/me", headers=auth_header(user_id))
        assert response.status_code == 200
        body = response.json()
        assert body["total_xp"] == 50
        assert body["rank"] == "Initiate"
        assert any(m["medal_type"] == "first_iron" for m in body["active_medals"])

    run(scenario)


def test_xp_endpoints_require_auth() -> None:
    async def scenario(harness: Harness) -> None:
        assert (await harness.client.get("/v1/users/me/xp")).status_code == 401
        assert (await harness.client.get("/v1/users/me/xp/history")).status_code == 401
        assert (await harness.client.get("/v1/users/me/medals")).status_code == 401

    run(scenario)
