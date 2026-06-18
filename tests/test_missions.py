"""Tests for mission generation, difficulty adaptation, lifecycle, and events."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import replace

from app.context import ContextBundle
from tests.support import DEFAULT_BUNDLE, Harness, ai_app, auth_header


def run(scenario: Callable[[Harness], Awaitable[None]], bundle: ContextBundle | None) -> None:
    async def _inner() -> None:
        async with ai_app(bundle=bundle) as harness:
            await scenario(harness)

    asyncio.run(_inner())


def test_generation_produces_structured_missions_and_event() -> None:
    async def scenario(harness: Harness) -> None:
        user_id = uuid.uuid4()
        response = await harness.client.post(
            "/v1/ai/missions/generate", headers=auth_header(user_id)
        )
        assert response.status_code == 201
        body = response.json()
        assert 1 <= body["generated_count"] <= 3
        mission = body["missions"][0]
        # Contract shape + enums.
        assert set(mission) >= {
            "id",
            "user_id",
            "title",
            "description",
            "duration_days",
            "xp_reward",
            "type",
            "completion_condition",
            "difficulty",
            "state",
        }
        assert mission["state"] == "active"
        assert 75 <= mission["xp_reward"] <= 150

        events = harness.publisher.of_type("ai.mission_generated")
        assert len(events) == body["generated_count"]
        assert events[0]["version"] == 1

    run(scenario, DEFAULT_BUNDLE)


def test_returning_user_gets_single_re_entry_mission() -> None:
    async def scenario(harness: Harness) -> None:
        response = await harness.client.post(
            "/v1/ai/missions/generate", headers=auth_header(uuid.uuid4())
        )
        body = response.json()
        assert body["generated_count"] == 1  # re-entry door is small
        assert body["missions"][0]["difficulty"] == "re-entry"

    run(scenario, replace(DEFAULT_BUNDLE, active_days_last_week=0))


def test_consistent_user_gets_harder_missions() -> None:
    async def scenario(harness: Harness) -> None:
        response = await harness.client.post(
            "/v1/ai/missions/generate", headers=auth_header(uuid.uuid4())
        )
        body = response.json()
        assert body["generated_count"] >= 2
        difficulties = {m["difficulty"] for m in body["missions"]}
        assert "growth" in difficulties

    run(scenario, replace(DEFAULT_BUNDLE, active_days_last_week=6))


def test_insufficient_context_declines_generation() -> None:
    async def scenario(harness: Harness) -> None:
        response = await harness.client.post(
            "/v1/ai/missions/generate", headers=auth_header(uuid.uuid4())
        )
        assert response.status_code == 201
        body = response.json()
        assert body["generated_count"] == 0
        assert body["reason"] == "insufficient_context"
        assert harness.publisher.of_type("ai.mission_generated") == []

    run(scenario, None)


def test_second_generation_is_declined_while_active() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        await harness.client.post("/v1/ai/missions/generate", headers=headers)
        again = await harness.client.post("/v1/ai/missions/generate", headers=headers)
        assert again.json()["reason"] == "already_generated_this_period"

    run(scenario, DEFAULT_BUNDLE)


def test_complete_publishes_mission_completed_and_blocks_repeat() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        generated = await harness.client.post("/v1/ai/missions/generate", headers=headers)
        mission_id = generated.json()["missions"][0]["id"]

        complete = await harness.client.post(
            f"/v1/ai/missions/{mission_id}/complete", headers=headers
        )
        assert complete.status_code == 200
        assert complete.json()["state"] == "completed"

        events = harness.publisher.of_type("ai.mission_completed")
        assert len(events) == 1
        assert events[0]["mission_id"] == mission_id
        assert 75 <= events[0]["xp_reward"] <= 150

        repeat = await harness.client.post(
            f"/v1/ai/missions/{mission_id}/complete", headers=headers
        )
        assert repeat.status_code == 409

    run(scenario, DEFAULT_BUNDLE)


def test_skip_and_active_listing() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        generated = await harness.client.post("/v1/ai/missions/generate", headers=headers)
        mission_id = generated.json()["missions"][0]["id"]

        skip = await harness.client.post(f"/v1/ai/missions/{mission_id}/skip", headers=headers)
        assert skip.status_code == 200
        assert skip.json()["state"] == "skipped"

        active = await harness.client.get("/v1/ai/missions/active", headers=headers)
        assert all(m["id"] != mission_id for m in active.json()["items"])

        history = await harness.client.get("/v1/ai/missions/history", headers=headers)
        assert history.json()["pagination"]["total"] >= 1

    run(scenario, DEFAULT_BUNDLE)


def test_mission_not_found_and_auth() -> None:
    async def scenario(harness: Harness) -> None:
        missing = await harness.client.get(
            f"/v1/ai/missions/{uuid.uuid4()}", headers=auth_header(uuid.uuid4())
        )
        assert missing.status_code == 404
        assert (await harness.client.get("/v1/ai/missions/active")).status_code == 401

    run(scenario, DEFAULT_BUNDLE)
