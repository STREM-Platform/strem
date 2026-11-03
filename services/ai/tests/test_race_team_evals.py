"""The race-team eval harness itself (ai#37), without network: every synthetic
athlete builds a valid context, the grader is strict, and failures are recorded."""

from __future__ import annotations

import asyncio
import json

from langchain_core.messages import AIMessage

from app.race.context import core_lines, render
from app.race.graph.tools import build_tools
from evals.race_team import SCENARIOS, grade, run, table
from tests.test_race_team_graph import team


def test_every_scenario_builds_a_context_the_team_can_read() -> None:
    assert len({s.id for s in SCENARIOS}) == len(SCENARIOS) >= 8
    for scenario in SCENARIOS:
        ctx = scenario.build()
        assert "RACE MISSION" in render(ctx) and core_lines(ctx)
        tools = {t.name: t for t in build_tools(ctx)}
        races = json.loads(tools["races"].invoke({}))
        assert races["provenance"]
        assert scenario.must or scenario.never


def test_grader_needs_every_group_and_never_forgives_a_forbidden_phrase() -> None:
    knee = next(s for s in SCENARIOS if s.id == "knee_memory")
    assert grade(knee, "Mind the left knee: keep descents controlled.") == []
    assert grade(knee, "Great idea, go for it!")[0].startswith("missing any of: knee")
    assert grade(knee, "") == ["empty answer"]

    hostile = next(s for s in SCENARIOS if s.id == "hostile_note")
    assert grade(hostile, "Aim for about 40 km over five sessions.") == []
    assert grade(hostile, "Run 160 km this week.") == ["said: 160 km"]


def test_a_run_records_passes_failures_and_errors_per_path() -> None:
    ai, _ = team(
        [
            AIMessage(content="Your left knee hurts on descents, so keep them controlled."),
            AIMessage(content="Sounds fun!"),
        ],
        route=["coach"],
    )
    knee = next(s for s in SCENARIOS if s.id == "knee_memory")
    report = asyncio.run(run(ai, ["legacy"], [knee, knee], concurrency=1))
    assert [c["passed"] for c in report["cases"]] == [True, False]
    assert report["summary"]["legacy"]["passed"] == 1
    assert "FAIL: missing any of: knee" in table(report)

    broken = asyncio.run(run(ai, ["legacy"], [knee]))  # the script is empty now
    assert broken["cases"][0]["failures"] == ["error"] and broken["cases"][0]["error"]
