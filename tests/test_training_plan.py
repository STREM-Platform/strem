"""Tests for the full weekly training plan (B4+) + exercise swap."""

import asyncio
import uuid
from typing import Any, cast

from langchain_core.language_models import BaseChatModel

from app.agent.llm import FallbackChatModel
from app.schemas import ContextSignals, MemoryItem, PlanDay, PlanExercise, TrainingPlan
from app.training_plan import (
    LIBRARY,
    _llm_prompt,
    build_training_plan,
    build_training_plan_llm,
    swap_exercise,
)
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


def test_training_plan_goal_override_changes_the_week() -> None:
    async def scenario() -> None:
        async with ai_app() as h:
            hdr = auth_header(uuid.uuid4())
            strength = (
                await h.client.get("/v1/ai/agent/training-plan?goal=build_strength", headers=hdr)
            ).json()
            endurance = (
                await h.client.get("/v1/ai/agent/training-plan?goal=build_endurance", headers=hdr)
            ).json()
            # The chosen goal shapes the week — title and/or focuses differ.
            assert strength["title"] != endurance["title"] or (
                [d["focus"] for d in strength["days"]] != [d["focus"] for d in endurance["days"]]
            )

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


# ── LLM-written variant (#70) ────────────────────────────────────────────────


class _StubStructured:
    def __init__(self, plan: TrainingPlan | None) -> None:
        self.plan = plan

    async def ainvoke(self, prompt: Any) -> TrainingPlan | None:
        return self.plan


class _StubModel:
    """A non-fallback model whose structured output returns a fixed plan (or raises)."""

    def __init__(self, plan: TrainingPlan | None = None, *, fail: bool = False) -> None:
        self.plan = plan
        self.fail = fail

    def with_structured_output(self, schema: Any) -> _StubStructured:
        if self.fail:
            raise RuntimeError("boom")
        return _StubStructured(self.plan)


def _llm(model: object) -> TrainingPlan | None:
    return asyncio.run(
        build_training_plan_llm(
            model=cast(BaseChatModel, model),
            goal="build_strength",
            weekly_target_days=4,
            signals=_signals(60),
            sessions=[{"session_type": "strength"}],
            memory=[MemoryItem(icon="bolt", text="PR: Back Squat 140kg")],
        )
    )


def test_llm_plan_keyless_falls_back_to_rule_based() -> None:
    # The keyless FallbackChatModel can't write structured output -> None (caller
    # uses the rule-based week).
    assert _llm(FallbackChatModel()) is None


def test_llm_plan_uses_a_keyed_model() -> None:
    built = TrainingPlan(
        title="LLM Week",
        summary="Grounded in your real training.",
        days=[
            PlanDay(
                label="Day 1",
                focus="Lower · Strength",
                icon="dumbbell",
                exercises=[
                    PlanExercise(name="Back Squat", target="5x5 @ RPE 8", note="", group="squat")
                ],
            )
        ],
    )
    plan = _llm(_StubModel(built))
    assert plan is not None and plan.title == "LLM Week"


def test_llm_plan_parse_failure_falls_back() -> None:
    assert _llm(_StubModel(fail=True)) is None


# ── event goals + adjustment (#5 plan refinement) ────────────────────────────


def test_event_goal_marathon_is_run_heavy() -> None:
    plan = build_training_plan(goal="marathon", weekly_target_days=5, signals=_signals(60))
    assert plan.title == "Marathon Week"
    run_days = sum(1 for d in plan.days if d.icon == "route" or "Run" in d.focus)
    assert run_days >= 3


def test_training_day_is_a_full_session() -> None:
    plan = build_training_plan(goal="build_strength", weekly_target_days=4, signals=_signals(62))
    work_days = [d for d in plan.days if d.focus != "Recovery / Mobility"]
    assert work_days and all(len(d.exercises) >= 5 for d in work_days)


def test_unknown_event_goal_falls_back_to_default_week() -> None:
    # An exotic goal the rule-based map doesn't know still returns a valid week.
    plan = build_training_plan(goal="spartan_race", weekly_target_days=4, signals=_signals(60))
    assert len(plan.days) == 4


def test_adjust_is_injected_into_the_prompt_with_guardrails() -> None:
    prompt = _llm_prompt("marathon", 5, _signals(60), [], [], "make it harder")
    assert "make it harder" in prompt
    assert "never override" in prompt  # the readiness/injury guardrail is preserved


def test_no_adjust_keeps_the_prompt_clean() -> None:
    prompt = _llm_prompt("marathon", 5, _signals(60), [], [], None)
    assert "asked to adjust" not in prompt
