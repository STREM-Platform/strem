"""Unit + endpoint tests for the B4 readiness-aware adaptive plan."""

import asyncio
import uuid

from app.adaptive_plan import build_adaptive_plan
from app.schemas import ContextSignals
from tests.support import ai_app, auth_header


def _signals(readiness: int) -> ContextSignals:
    return ContextSignals(
        readiness=readiness,
        readiness_label="Low" if readiness < 50 else "Moderate" if readiness < 75 else "High",
        load7=400,
        load28=380,
        acwr=1.05,
        load_label="Optimal",
        momentum="Steady",
        streak_risk=False,
    )


def test_low_readiness_leans_recovery() -> None:
    plan = build_adaptive_plan(_signals(40), goal="hybrid_athlete", weekly_target=5, memory=[])
    titles = [m.title for m in plan.missions]
    assert "Bank Three 7h Nights" in titles
    assert "recovery-first" in plan.reason


def test_high_readiness_leans_progression() -> None:
    plan = build_adaptive_plan(_signals(82), goal="build_strength", weekly_target=5, memory=[])
    assert plan.missions[0].title == "Heavy Top-Set Progression"
    assert "progression" in plan.reason
    assert "strength" in plan.reason  # goal surfaced


def test_moderate_readiness_is_balanced() -> None:
    plan = build_adaptive_plan(_signals(62), goal="hybrid_athlete", weekly_target=5, memory=[])
    assert len(plan.missions) == 3
    assert "balanced" in plan.reason


def test_plan_endpoint_returns_reason_and_missions() -> None:
    async def scenario() -> None:
        async with ai_app() as h:
            res = await h.client.get("/v1/ai/agent/plan", headers=auth_header(uuid.uuid4()))
            assert res.status_code == 200
            body = res.json()
            assert body["reason"] and len(body["missions"]) == 3
            assert {"icon", "title", "tone", "xp", "days", "why"} <= body["missions"][0].keys()

    asyncio.run(scenario())


def test_plan_endpoint_409_without_context() -> None:
    async def scenario() -> None:
        async with ai_app(athlete=None) as h:
            res = await h.client.get("/v1/ai/agent/plan", headers=auth_header(uuid.uuid4()))
            assert res.status_code == 409

    asyncio.run(scenario())
