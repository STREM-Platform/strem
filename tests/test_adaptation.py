"""P2-04: the behavioral adaptation engine and its endpoint."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import replace

from app.adaptation import AdaptationSignal, decide_adaptation
from app.context import ContextBundle
from tests.support import DEFAULT_BUNDLE, Harness, ai_app, auth_header


def test_decision_re_engagement_on_lapse() -> None:
    decision = decide_adaptation(active_days_last_week=0, weekly_target_days=4, xp_to_next_rank=100)
    assert decision.signal == AdaptationSignal.RE_ENGAGEMENT


def test_decision_burnout_on_overreach() -> None:
    decision = decide_adaptation(
        active_days_last_week=7, weekly_target_days=4, xp_to_next_rank=None
    )
    assert decision.signal == AdaptationSignal.BURNOUT_RISK


def test_decision_milestone_when_close() -> None:
    decision = decide_adaptation(active_days_last_week=3, weekly_target_days=4, xp_to_next_rank=200)
    assert decision.signal == AdaptationSignal.MILESTONE_PROXIMITY


def test_decision_steady_otherwise() -> None:
    decision = decide_adaptation(
        active_days_last_week=3, weekly_target_days=4, xp_to_next_rank=5000
    )
    assert decision.signal == AdaptationSignal.STEADY


def _run(scenario: Callable[[Harness], Awaitable[None]], bundle: ContextBundle | None) -> None:
    async def _inner() -> None:
        async with ai_app(bundle=bundle) as harness:
            await scenario(harness)

    asyncio.run(_inner())


def test_adaptation_endpoint_returns_a_signal() -> None:
    async def scenario(harness: Harness) -> None:
        response = await harness.client.get(
            "/v1/ai/coach/adaptation", headers=auth_header(uuid.uuid4())
        )
        assert response.status_code == 200
        # DEFAULT_BUNDLE has active_days_last_week == 0.
        assert response.json()["signal"] == "re_engagement"

    _run(scenario, DEFAULT_BUNDLE)


def test_adaptation_endpoint_milestone_when_close() -> None:
    async def scenario(harness: Harness) -> None:
        response = await harness.client.get(
            "/v1/ai/coach/adaptation", headers=auth_header(uuid.uuid4())
        )
        assert response.json()["signal"] == "milestone_proximity"

    _run(scenario, replace(DEFAULT_BUNDLE, active_days_last_week=3, xp_to_next_rank=150))


def test_adaptation_endpoint_declines_without_context() -> None:
    async def scenario(harness: Harness) -> None:
        response = await harness.client.get(
            "/v1/ai/coach/adaptation", headers=auth_header(uuid.uuid4())
        )
        assert response.status_code == 409

    _run(scenario, None)
