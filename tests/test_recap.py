"""Tests for the weekly coaching recap: generation, safety, and reads."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import replace
from datetime import date

from app import recap
from app.context import ContextBundle
from tests.support import DEFAULT_BUNDLE, Harness, ai_app, auth_header

WEEK_START = date(2026, 6, 1)
WEEK_END = date(2026, 6, 7)


def run(scenario: Callable[[Harness], Awaitable[None]], bundle: ContextBundle | None) -> None:
    async def _inner() -> None:
        async with ai_app(bundle=bundle) as harness:
            await scenario(harness)

    asyncio.run(_inner())


async def _generate(harness: Harness, user_id: uuid.UUID, bundle: ContextBundle) -> None:
    async with harness.sessionmaker() as session:
        await recap.generate_weekly_recap(
            session,
            harness.publisher,
            user_id=user_id,
            bundle=bundle,
            week_start=WEEK_START,
            week_end=WEEK_END,
        )
        await session.commit()


def test_recap_is_identity_grounded_and_published() -> None:
    async def scenario(harness: Harness) -> None:
        user_id = uuid.uuid4()
        await _generate(harness, user_id, DEFAULT_BUNDLE)

        response = await harness.client.get("/v1/ai/coach/recap", headers=auth_header(user_id))
        assert response.status_code == 200
        body = response.json()
        assert body["week_start"] == "2026-06-01"
        assert "hybrid athlete" in body["narrative"].lower()

        events = harness.publisher.of_type("ai.coach_summary_created")
        assert len(events) == 1
        assert events[0]["version"] == 1
        assert events[0]["week_start"] == "2026-06-01"

    run(scenario, DEFAULT_BUNDLE)


def test_recap_redirects_on_unsafe_identity_signal() -> None:
    async def scenario(harness: Harness) -> None:
        user_id = uuid.uuid4()
        unsafe = replace(
            DEFAULT_BUNDLE, identity_statement="lately I feel hopeless and want to die"
        )
        await _generate(harness, user_id, unsafe)

        response = await harness.client.get("/v1/ai/coach/recap", headers=auth_header(user_id))
        narrative = response.json()["narrative"].lower()
        assert "professional" in narrative or "crisis line" in narrative

    run(scenario, DEFAULT_BUNDLE)


def test_recap_not_found_when_none_yet() -> None:
    async def scenario(harness: Harness) -> None:
        response = await harness.client.get("/v1/ai/coach/recap", headers=auth_header(uuid.uuid4()))
        assert response.status_code == 404
        assert response.json()["code"] == "no_recap_yet"

    run(scenario, DEFAULT_BUNDLE)


def test_generate_endpoint_creates_readable_recap() -> None:
    async def scenario(harness: Harness) -> None:
        user_id = uuid.uuid4()
        created = await harness.client.post(
            "/v1/ai/coach/recap/generate", headers=auth_header(user_id)
        )
        assert created.status_code == 201
        assert "hybrid athlete" in created.json()["narrative"].lower()

        latest = await harness.client.get("/v1/ai/coach/recap", headers=auth_header(user_id))
        assert latest.status_code == 200
        assert latest.json()["narrative"] == created.json()["narrative"]
        assert harness.publisher.of_type("ai.coach_summary_created")

    run(scenario, DEFAULT_BUNDLE)


def test_generate_endpoint_declines_without_context() -> None:
    async def scenario(harness: Harness) -> None:
        response = await harness.client.post(
            "/v1/ai/coach/recap/generate", headers=auth_header(uuid.uuid4())
        )
        assert response.status_code == 409
        assert response.json()["code"] == "insufficient_context"

    run(scenario, None)
