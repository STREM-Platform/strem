"""Race Lab and plan builds as subgraphs (ai#58 phase 5): engine draft →
AI personalise → owner validation, the plan before the other layers, and every AI
path reading the same core context, including what the athlete told the team."""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from app.race.context import core_lines, render
from app.race.engine.cockpit import build_specialists
from app.race.engine.plan import build_plan
from tests.support import auth_header
from tests.test_race_os import TODAY, FakeServices, ScriptedAI, ctx_for, mission, race_app


class RecordingAI(ScriptedAI):
    """Keeps the context each personalisation saw."""

    def __init__(self) -> None:
        super().__init__()
        self.contexts: dict[str, str] = {}

    async def complete_json(self, *, context: str, prompt: str, **kw: Any) -> dict[str, Any]:
        self.contexts[prompt.splitlines()[0]] = context
        return await super().complete_json(context=context, prompt=prompt, **kw)


def test_builds_run_plan_first_and_carry_what_the_athlete_told_the_team() -> None:
    async def scenario() -> None:
        m = mission(race_date=(datetime.now(UTC).date() + timedelta(weeks=12)).isoformat())
        fake, ai = FakeServices(m), RecordingAI()
        headers = auth_header(uuid.uuid4())
        base = f"/v1/ai/race/{m['id']}"
        async with race_app(fake, ai) as client:
            said = "My left knee hurts on long descents."
            await client.post(f"{base}/chat", headers=headers, json={"message": said})

            built = (await client.post(f"{base}/build", headers=headers, json={})).json()
            kinds = [r["kind"] for r in built["results"]]
            assert kinds == ["plan", "fuel", "gear", "logistics", "strategy"]
            assert all(r["origin"] == "ai" and r["ai_reason"] is None for r in built["results"])
            plan_context = next(c for t, c in ai.contexts.items() if "training plan" in t)
            assert "Left knee hurts on long descents" in plan_context
            assert "## NOW [calculated]" in plan_context

            # The other layers read the plan that was built first.
            assert fake.layer_docs["fuel"]["origin"] == "ai" and fake.plan_doc is not None

            # Offline: the engine path only, and it says why.
            ai.fail = "No AI credit"
            offline = (
                await client.post(f"{base}/layers/gear/build", headers=headers, json={})
            ).json()
            assert offline["origin"] == "engine" and offline["ai_reason"] == "No AI credit"

            # Without asking for the AI there is no reason to report.
            engine_only = (
                await client.post(
                    f"{base}/build", headers=headers, json={"layers": ["fuel"], "use_ai": False}
                )
            ).json()
            assert engine_only["results"][0]["ai_reason"] is None

    asyncio.run(scenario())


def test_unknown_layers_and_inactive_missions_are_refused() -> None:
    async def scenario() -> None:
        m = mission(race_date=(datetime.now(UTC).date() + timedelta(weeks=12)).isoformat())
        fake, ai = FakeServices(m), ScriptedAI()
        headers = auth_header(uuid.uuid4())
        base = f"/v1/ai/race/{m['id']}"
        async with race_app(fake, ai) as client:
            unknown = await client.post(f"{base}/layers/nutrition/build", headers=headers, json={})
            assert unknown.status_code == 404 and unknown.json()["code"] == "unknown_layer"

            m["state"] = "completed"
            closed = await client.post(
                f"{base}/build", headers=headers, json={"layers": ["fuel"], "use_ai": False}
            )
            assert closed.status_code == 409 and closed.json()["code"] == "mission_not_active"
            assert fake.layer_docs == {}

    asyncio.run(scenario())


def test_core_context_says_where_the_athlete_is_today() -> None:
    m = mission()
    plan = build_plan(ctx_for(m))
    today = TODAY.isoformat()
    week = next(
        w
        for w in plan["weeks"]
        if w["start_date"] <= today < (TODAY + timedelta(days=7)).isoformat()
    )
    ctx = ctx_for(
        m,
        plan={"content": plan, "version": 1, "origin": "engine"},
        progress={"totals": {"completed": 4, "missed": 1, "planned_to_date": 5}},
        checkins=[{"day": today, "sleep_quality": 2, "soreness": 4, "pain_note": "left calf"}],
        memories=[
            {
                "id": "m1",
                "kind": "injury",
                "text": "Left knee hurts on long descents",
                "source": "chat",
                "source_date": today,
                "updated_at": today,
            }
        ],
    )
    text = "\n".join(core_lines(ctx))
    assert f"Plan week {week['index']} of {len(plan['weeks'])} ({week['phase']})" in text
    assert "Today's check-in [athlete]" in text and "pain: left calf" in text
    assert "Adherence: 4 done" in text
    assert "Left knee hurts on long descents" in text

    coach = build_specialists(ctx, [])[0]
    assert {"label": "You told us", "value": "Left knee hurts on long descents"} == {
        k: v for k, v in coach["evidence"][-1].items() if k != "source"
    }

    quiet = "\n".join(core_lines(ctx_for(m)))
    assert "No training plan yet" in quiet and "No check-in today" in quiet


def test_render_uses_date_windows_not_fixed_counts() -> None:
    m = mission()
    races = [
        {"race_date": f"2025-{month:02d}-01", "name": f"Synthetic Race {month}", "status": "done"}
        for month in range(1, 13)
    ] + [{"race_date": "2026-01-10", "name": "Synthetic Race 13", "status": "done"}]
    sessions = [
        {
            "logged_at": (TODAY - timedelta(days=days)).isoformat() + "T06:00:00Z",
            "session_type": "running",
            "title": f"Run {days} days ago",
            "duration_minutes": 40,
        }
        for days in (1, 3, 5, 7, 9, 11, 12, 13, 20)
    ]
    checkins = [
        {"day": (TODAY - timedelta(days=d)).isoformat(), "energy": 3} for d in range(0, 30, 3)
    ]
    text = render(ctx_for(m, races=races, sessions=sessions, checkins=checkins))
    assert all(f"Synthetic Race {n}" in text for n in range(1, 14))  # no 12-race cap
    assert "Run 13 days ago" in text and "Run 1 days ago" in text
    assert "Run 20 days ago" not in text  # older than the window: weekly digests and tools
    # Days 0, 3, 6, 9 and 12 (not the newest seven), plus today in the NOW section.
    assert text.count("energy 3") == 6
