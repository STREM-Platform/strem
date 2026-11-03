"""The race-team cockpit (mobile#119): one engine call per specialist + what changed."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from app.race.context import CourseSummary
from app.race.engine.cockpit import build_cockpit
from app.race.engine.fuel import build_fuel
from tests.test_race_os import TODAY, ctx_for, mission


def _course() -> CourseSummary:
    return CourseSummary(
        distance_km=50.2,
        ascent_m=2410,
        descent_m=2400,
        lowest_m=1300,
        highest_m=2900,
        profile=[],
        climbs=[
            {
                "direction": "up",
                "start_km": 12.0,
                "end_km": 18.5,
                "change_m": 820,
                "grade_pct": 12.6,
            },
            {
                "direction": "down",
                "start_km": 18.5,
                "end_km": 24.0,
                "change_m": -700,
                "grade_pct": -12.7,
            },
        ],
    )


def by_role(cockpit: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {s["role"]: s for s in cockpit["specialists"]}


def test_new_athlete_sees_what_is_missing_with_low_confidence() -> None:
    cockpit = build_cockpit(ctx_for(mission()), [])
    roles = by_role(cockpit)
    assert list(roles) == ["coach", "fuel", "course", "gear", "logistics", "strategy"]
    assert roles["coach"]["status"] == "missing" and roles["coach"]["action"]["target"] == "plan"
    assert roles["course"]["status"] == "missing" and "GPX" in roles["course"]["call"]
    assert all(s["confidence"] == "low" for s in cockpit["specialists"] if s["status"] == "missing")
    assert cockpit["summary"]["missing"] == 6
    assert all(s["ask"] for s in cockpit["specialists"])  # every card can ask the team


def test_pending_adjustment_leads_the_coach_and_the_feed() -> None:
    m = mission()
    proposal = {
        "id": "p1",
        "status": "pending",
        "summary": "Two runs missed: next week is lighter.",
        "changes": [{}, {}],
        "created_at": "2026-10-22T08:00:00",
    }
    ctx = ctx_for(m, plan={"version": 2, "origin": "engine", "content": {"weeks": []}})
    cockpit = build_cockpit(ctx, [proposal])
    coach = by_role(cockpit)["coach"]
    assert coach["status"] == "attention" and coach["action"]["target"] == "proposal"
    assert coach["call"] == "Two runs missed: next week is lighter."
    assert (
        cockpit["feed"][0]["kind"] == "proposal"
        and cockpit["feed"][0]["evidence"][0]["value"] == "2"
    )


def test_course_without_checkpoints_names_the_biggest_climb() -> None:
    course = by_role(build_cockpit(ctx_for(mission(), course=_course()), []))["course"]
    assert course["status"] == "attention"
    assert "+820 m at km 12" in course["call"]
    assert {c["label"] for c in course["evidence"]} >= {"Course", "Climbing", "Sustained climbs"}
    assert next(c for c in course["evidence"] if c["label"] == "Sustained climbs")["value"] == "1"


def test_layers_become_due_close_to_race_day() -> None:
    m = mission(race_date=(TODAY + timedelta(days=12)).isoformat())
    ctx = ctx_for(m, profile={"weight_kg": 68})
    fuel_content = build_fuel(ctx)
    ctx.layers = {"fuel": {"version": 1, "origin": "engine", "content": fuel_content}}
    fuel = by_role(build_cockpit(ctx, []))["fuel"]
    assert fuel["status"] == "attention" and fuel["call"].endswith(".")
    assert "open before race day" in fuel["call"]
    assert fuel["confidence"] == "medium"  # weight known, no race memory yet
    assert fuel["evidence"][0]["label"] == "Checklist"


def test_recent_sessions_and_checkins_show_in_the_feed() -> None:
    sessions = [
        {
            "logged_at": f"{(TODAY - timedelta(days=d)).isoformat()}T07:00:00Z",
            "duration_minutes": 60,
        }
        for d in (0, 1, 6)
    ]
    checkins = [{"day": TODAY.isoformat(), "soreness": 4, "energy": 2}]
    feed = build_cockpit(ctx_for(mission(), sessions=sessions, checkins=checkins), [])["feed"]
    kinds = [f["kind"] for f in feed]
    assert kinds[:2] == ["training", "checkin"]
    assert feed[0]["title"].startswith("2 new sessions")
    assert feed[1]["title"] == "High soreness" and feed[1]["severity"] == "attention"


def test_race_week_milestone() -> None:
    m = mission(race_date=(TODAY + timedelta(days=6)).isoformat())
    feed = build_cockpit(ctx_for(m), [])["feed"]
    assert feed[-1]["kind"] == "milestone" and "Race week" in feed[-1]["detail"]
