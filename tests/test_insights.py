"""Unit + endpoint tests for the B8 insight engine."""

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

from app import insights
from app.context import GraphSnapshot
from app.schemas import ContextSignals, ContextSource, MemoryItem
from tests.support import ai_app, auth_header


def _signals(acwr: float, load28: float = 388) -> ContextSignals:
    return ContextSignals(
        readiness=62,
        readiness_label="Moderate",
        load7=412,
        load28=load28,
        acwr=acwr,
        load_label="Optimal",
        momentum="Rising",
        streak_risk=False,
    )

NOW = datetime(2026, 6, 18, 12, 0, tzinfo=UTC)


def _runs_and_lifts(n: int) -> list[dict[str, object]]:
    return [
        {
            "logged_at": (NOW - timedelta(days=i)).isoformat(),
            "session_type": "running" if i % 2 == 0 else "strength",
            "duration_minutes": 40,
        }
        for i in range(n)
    ]


def test_no_insights_below_sample_gate() -> None:
    assert insights.build_insights(_runs_and_lifts(4), []) == []


def test_endurance_base_insight_emerges() -> None:
    out = insights.build_insights(_runs_and_lifts(10), [])
    assert any(i.title == "Your endurance base is building" for i in out)
    chip = next(i for i in out if i.icon == "route").chip
    assert "10 sessions" in chip


def test_fuel_alignment_uses_real_overlap() -> None:
    sessions = _runs_and_lifts(10)
    fueled = [
        {"date": (NOW - timedelta(days=i)).date().isoformat(), "targets_met": True}
        for i in range(10)
    ]
    out = insights.build_insights(sessions, fueled)
    fuel = next((i for i in out if i.title == "Fuel follows your training"), None)
    assert fuel is not None and fuel.tone == "green"


def test_load_spike_is_flagged_amber() -> None:
    out = insights.build_insights([], [], signals=_signals(1.45))
    spike = next((i for i in out if i.title == "Your training load is spiking"), None)
    assert spike is not None and spike.tone == "amber"


def test_eased_load_invites_building() -> None:
    out = insights.build_insights([], [], signals=_signals(0.7))
    assert any(i.title == "You've got room to build" for i in out)


def test_no_load_insight_without_chronic_load() -> None:
    # No 28-day base yet → the engine won't assert a load pattern.
    assert insights.build_insights([], [], signals=_signals(1.5, load28=0)) == []


def test_biomarker_trend_redirects_to_clinician_never_diagnoses() -> None:
    mem = [MemoryItem(icon="heart", text="Lab: ferritin 48 ng/mL (rising)")]
    out = insights.build_insights([], [], memory=mem)
    bio = next((i for i in out if i.title == "A lab marker is trending"), None)
    assert bio is not None
    assert "ferritin" in bio.body
    assert "clinician" in bio.chip.lower()


def test_single_lab_reading_is_not_a_trend() -> None:
    mem = [MemoryItem(icon="heart", text="Lab: vitamin d 28 ng/mL (first reading)")]
    assert insights.build_insights([], [], memory=mem) == []


def _snapshot(
    sessions: list[dict[str, object]], nutrition: list[dict[str, object]]
) -> GraphSnapshot:
    return GraphSnapshot(
        sources=[
            ContextSource(
                id="logs", label="In-app logs", icon="edit", on=True, last="Live", metric="x"
            )
        ],
        signals=ContextSignals(
            readiness=62,
            readiness_label="Moderate",
            load7=412,
            load28=388,
            acwr=1.06,
            load_label="Optimal",
            momentum="Rising",
            streak_risk=False,
        ),
        sessions=sessions,
        nutrition=nutrition,
    )


def test_insights_endpoint_returns_items() -> None:
    async def scenario() -> None:
        async with ai_app(athlete=_snapshot(_runs_and_lifts(10), [])) as h:
            res = await h.client.get("/v1/ai/insights", headers=auth_header(uuid.uuid4()))
            assert res.status_code == 200
            assert len(res.json()["items"]) >= 1

    asyncio.run(scenario())


def test_insights_endpoint_empty_when_no_context() -> None:
    async def scenario() -> None:
        async with ai_app(athlete=None) as h:
            res = await h.client.get("/v1/ai/insights", headers=auth_header(uuid.uuid4()))
            assert res.status_code == 200
            assert res.json()["items"] == []

    asyncio.run(scenario())
