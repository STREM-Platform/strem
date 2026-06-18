"""Endpoint tests for the agent context graph (A6) + memory (A5)."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable

from app.context import GraphSnapshot
from tests.support import DEFAULT_SNAPSHOT, Harness, ai_app, auth_header


def run(
    scenario: Callable[[Harness], Awaitable[None]], athlete: GraphSnapshot | None = DEFAULT_SNAPSHOT
) -> None:
    async def _inner() -> None:
        async with ai_app(athlete=athlete) as harness:
            await scenario(harness)

    asyncio.run(_inner())


def test_context_returns_sources_signals_and_memory() -> None:
    async def scenario(h: Harness) -> None:
        res = await h.client.get("/v1/ai/context", headers=auth_header(uuid.uuid4()))
        assert res.status_code == 200
        body = res.json()
        assert {"sources", "signals", "memory"} <= body.keys()
        assert body["signals"]["readinessLabel"] == "Moderate"  # camelCase contract
        assert body["signals"]["loadLabel"] == "Optimal"
        assert body["memory"] == []
        assert body["sources"][0]["id"] == "logs"

    run(scenario)


def test_context_409_when_insufficient() -> None:
    async def scenario(h: Harness) -> None:
        res = await h.client.get("/v1/ai/context", headers=auth_header(uuid.uuid4()))
        assert res.status_code == 409
        assert res.json()["code"] == "insufficient_context"

    run(scenario, athlete=None)


def test_memory_crud_and_appears_in_context() -> None:
    async def scenario(h: Harness) -> None:
        user_id = uuid.uuid4()
        created = await h.client.post(
            "/v1/ai/memory",
            headers=auth_header(user_id),
            json={"icon": "heart", "text": "Left knee flares on lunges — sub split squats"},
        )
        assert created.status_code == 201

        listed = await h.client.get("/v1/ai/memory", headers=auth_header(user_id))
        items = listed.json()["items"]
        assert len(items) == 1 and items[0]["icon"] == "heart"

        ctx = await h.client.get("/v1/ai/context", headers=auth_header(user_id))
        assert ctx.json()["memory"][0]["text"].startswith("Left knee")

    run(scenario)


def test_memory_is_per_user() -> None:
    async def scenario(h: Harness) -> None:
        owner, other = uuid.uuid4(), uuid.uuid4()
        await h.client.post(
            "/v1/ai/memory",
            headers=auth_header(owner),
            json={"icon": "clock", "text": "Trains best before 9am"},
        )
        res = await h.client.get("/v1/ai/memory", headers=auth_header(other))
        assert res.json()["items"] == []

    run(scenario)
