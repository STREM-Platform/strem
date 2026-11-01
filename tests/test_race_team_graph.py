"""The race team as a LangGraph graph (ADR 0010, ai#58 phase 2).

A scripted chat model stands in for the provider, so these tests pin the graph:
routing, specialists fetching data with tools instead of a capped context
block, the composer, and the deterministic safety guard.
"""

from __future__ import annotations

import asyncio
import json
from datetime import timedelta
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, SystemMessage, ToolMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from pydantic import Field

from app.race.ai.models import LangChainRaceAI
from app.race.graph.team import safety_guard, team_answer
from app.race.graph.tools import build_tools
from tests.test_race_os import TODAY, ctx_for, mission


class ScriptedChat(BaseChatModel):
    """Returns the scripted replies in order and records every request."""

    script: list[AIMessage] = Field(default_factory=list)
    seen: list[list[BaseMessage]] = Field(default_factory=list)

    @property
    def _llm_type(self) -> str:
        return "scripted"

    def bind_tools(self, tools: Any, **_: Any) -> Any:
        return self

    def _generate(
        self, messages: list[BaseMessage], stop: Any = None, run_manager: Any = None, **_: Any
    ) -> ChatResult:
        self.seen.append(list(messages))
        return ChatResult(generations=[ChatGeneration(message=self.script.pop(0))])


def team(script: list[AIMessage], route: list[str]) -> tuple[LangChainRaceAI, ScriptedChat]:
    chat = ScriptedChat(script=script)
    ai = LangChainRaceAI(chat, "scripted", "openai")
    ai._reasoning = False

    async def router(**_: Any) -> dict[str, Any]:
        return {"specialists": route, "why": "test"}

    ai.complete_json = router  # type: ignore[method-assign]
    return ai, chat


def race_ctx(**extra: Any) -> Any:
    races = [
        {
            "race_date": "2026-05-10",
            "name": "Synthetic Gut 50K",
            "status": "finished",
            "distance_km": 50,
            "race_day": {"carbs_g_per_hour": 70, "gi_issues": "severe"},
            "lessons": ["Carry more salt in heat"],
        }
    ]
    sessions = [
        {
            "logged_at": f"{(TODAY - timedelta(days=d)).isoformat()}T07:00:00Z",
            "session_type": "running",
            "title": f"Run {d}",
            "duration_minutes": 40 + d,
        }
        for d in range(40)
    ]
    return ctx_for(mission(), races=races, sessions=sessions, **extra)


def test_a_specialist_fetches_what_the_question_needs() -> None:
    script = [
        AIMessage(
            content="", tool_calls=[{"name": "races", "args": {"query": "stomach"}, "id": "c1"}]
        ),
        AIMessage(
            content="Stay near 60 g/h: 70 g/h caused severe stomach trouble at Synthetic Gut 50K."
        ),
    ]
    ai, chat = team(script, ["fuel"])
    answer = asyncio.run(
        team_answer(
            ai,
            race_ctx(),
            "How many carbs per hour?",
            [{"role": "user", "content": "Hi"}, {"role": "assistant", "content": "Hello."}],
        )
    )
    assert answer.startswith("Stay near 60 g/h")
    system = chat.seen[0][0]
    assert isinstance(system, SystemMessage)
    assert "fueling and hydration" in system.text and "Synthetic Ridge 50K" in system.text
    assert "RECENT TRAINING" not in system.text  # only the core context is always sent
    assert [m.type for m in chat.seen[0][1:]] == [
        "human",
        "ai",
        "human",
    ]  # history, then the question
    tool_result = next(m for m in chat.seen[1] if isinstance(m, ToolMessage))
    data = json.loads(tool_result.text)
    assert (
        data["provenance"] == "athlete" and data["data"]["races"][0]["name"] == "Synthetic Gut 50K"
    )
    assert any("severe stomach trouble" in line for line in data["data"]["what_they_teach"])


def test_two_specialists_are_composed_into_one_answer() -> None:
    script = [
        AIMessage(content="Draft A: keep Saturday's long run at 3 h."),
        AIMessage(content="Draft B: rehearse 60 g/h on it."),
        AIMessage(content="Run 3 h on Saturday and rehearse 60 g/h on it."),
    ]
    ai, chat = team(script, ["coach", "fuel"])
    answer = asyncio.run(team_answer(ai, race_ctx(), "What should Saturday look like?", []))
    assert answer == "Run 3 h on Saturday and rehearse 60 g/h on it."
    composer_prompt = chat.seen[2][-1].text
    assert (
        "Draft A" in composer_prompt
        and "Draft B" in composer_prompt
        and "[coach]" in composer_prompt
    )


def test_tools_reach_past_the_old_caps() -> None:
    ctx = race_ctx(
        checkins=[{"day": (TODAY - timedelta(days=d)).isoformat(), "energy": 3} for d in range(20)]
    )
    tools = {t.name: t for t in build_tools(ctx)}
    month = json.loads(
        tools["training"].invoke(
            {"start": (TODAY - timedelta(days=29)).isoformat(), "end": TODAY.isoformat()}
        )
    )
    assert len(month["data"]) == 30  # the rendered block stopped at 12 sessions
    assert (
        json.loads(tools["checkins"].invoke({"days": 14}))["data"][-1]["day"]
        == (TODAY - timedelta(days=14)).isoformat()
    )
    longest = json.loads(tools["long_sessions"].invoke({"count": 3}))["data"]
    assert [s["minutes"] for s in longest] == [79, 78, 77]
    assert json.loads(tools["course"].invoke({}))["data"]["available"] is False


def test_the_guard_adds_rest_and_a_professional_when_ill_today() -> None:
    ctx = race_ctx(checkins=[{"day": TODAY.isoformat(), "illness": True}])
    guarded = safety_guard(ctx, "Do the intervals as planned.")
    assert guarded.endswith("or it lasts more than a few days.") and "see a doctor" in guarded
    fine = "Rest today and see a doctor if the fever stays."
    assert safety_guard(ctx, fine) == fine
    pain = race_ctx(checkins=[{"day": TODAY.isoformat(), "pain_note": "left knee"}])
    assert "physio" in safety_guard(pain, "Run easy.")
