"""Tests for the full weekly training plan (B4+) + exercise swap."""

import asyncio
import uuid

from app.schemas import ContextSignals
from app.training_plan import LIBRARY, build_training_plan, swap_exercise
from tests.support import ai_app, auth_header


def _signals(readiness: int) -> ContextSignals:
    return ContextSignals(
        readiness=readiness,
        readiness_label="Low" if readiness < 50 else "Moderate",
        load7=400,
        load28=380,
        acwr=1.05,
        load_label="Optimal",
        momentum="Steady",
        streak_risk=False,
    )


# ── pure generator ───────────────────────────────────────────────────────────


def test_plan_has_one_day_per_target() -> None:
    plan = build_training_plan(goal="hybrid_athlete", weekly_target_days=5, signals=_signals(62))
    assert len(plan.days) == 5
    assert all(d.exercises for d in plan.days)
    assert plan.days[0].label == "Day 1"


def test_low_readiness_inserts_recovery_day() -> None:
    plan = build_training_plan(goal="build_strength", weekly_target_days=4, signals=_signals(40))
    focuses = [d.focus for d in plan.days]
    assert "Recovery / Mobility" in focuses
    assert "low" in plan.summary.lower()


def test_swap_returns_different_exercise_same_group() -> None:
    first = LIBRARY["squat"][0][0]
    alt = swap_exercise("squat", first)
    assert alt.group == "squat"
    assert alt.name != first
    assert alt.name in {n for n, _ in LIBRARY["squat"]}


def test_swap_unknown_group_is_safe() -> None:
    alt = swap_exercise("not_a_group", "X")
    assert alt.name == "X"


# ── endpoints ────────────────────────────────────────────────────────────────


def test_training_plan_endpoint() -> None:
    async def scenario() -> None:
        async with ai_app() as h:
            res = await h.client.get(
                "/v1/ai/agent/training-plan", headers=auth_header(uuid.uuid4())
            )
            assert res.status_code == 200
            body = res.json()
            assert body["days"]
            assert body["days"][0]["exercises"][0]["name"]
            assert "group" in body["days"][0]["exercises"][0]

    asyncio.run(scenario())


def test_swap_endpoint() -> None:
    async def scenario() -> None:
        async with ai_app() as h:
            first = LIBRARY["horizontal_press"][0][0]
            res = await h.client.post(
                "/v1/ai/agent/training-plan/swap",
                headers=auth_header(uuid.uuid4()),
                json={"group": "horizontal_press", "exclude": first},
            )
            assert res.status_code == 200
            assert res.json()["exercise"]["name"] != first

    asyncio.run(scenario())


def test_training_plan_requires_auth() -> None:
    async def scenario() -> None:
        async with ai_app() as h:
            assert (await h.client.get("/v1/ai/agent/training-plan")).status_code == 401

    asyncio.run(scenario())
