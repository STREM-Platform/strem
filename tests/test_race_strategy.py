"""Checkpoint plan: legs, cutoffs, what to carry and do (ai#46). All races are synthetic."""

from __future__ import annotations

from typing import Any

from app.race.ai.personalize import apply_layer_guardrails
from app.race.context import CourseSummary
from app.race.engine.strategy import build_strategy
from tests.test_race_os import ctx_for, mission

CHECKPOINTS = [
    {"name": "Hut", "km": 12.0, "services": ["water", "food"], "cutoff_minutes": 150},
    {"name": "Ridge", "km": 24.0, "services": [], "cutoff_minutes": None},
    {"name": "Pass", "km": 36.0, "services": ["water", "crew", "drop_bag"], "cutoff_minutes": 480},
]


def course() -> CourseSummary:
    # 50 km: climbing in the first half, descending in the second.
    profile = [
        (float(k), float(k + 1), 60.0 if k < 25 else -60.0, 6.0 if k < 25 else -6.0)
        for k in range(50)
    ]
    return CourseSummary(
        distance_km=50.0,
        ascent_m=1500,
        descent_m=1500,
        lowest_m=800,
        highest_m=2300,
        profile=profile,
        climbs=[],
    )


def strategy(**event: Any) -> dict[str, Any]:
    m = mission(start_time="06:30", checkpoints=CHECKPOINTS, **event)
    m["goal"]["target_finish_minutes"] = 480
    m["goal"]["outcome"] = "target_time"
    return build_strategy(ctx_for(m, course=course()))


def section(layer: dict[str, Any]) -> dict[str, Any]:
    return next(s for s in layer["sections"] if s["id"] == "checkpoints")


def test_legs_follow_checkpoints_with_clock_carry_and_todo() -> None:
    layer = strategy()
    rows = section(layer)["items"]
    assert [r["title"].split(" (")[0] for r in rows] == [
        "Start → Hut",
        "Hut → Ridge",
        "Ridge → Pass",
        "Pass → Finish",
    ]
    first = rows[0]["values"]
    assert first["gain_m"] == 720 and first["clock"].count(":") == 1 and "g carbs" in first["carry"]
    assert "Refill" in rows[0]["detail"] and "Eat something real" in rows[0]["detail"]
    assert "No water here" in rows[1]["detail"]  # Ridge has no water: carry for the next leg too
    assert "Drop bag" in rows[2]["detail"] and "Crew" in rows[2]["detail"]
    assert "cutoff_margin" in section(layer)["columns"]
    assert any(m["label"] == "Time at aid stations" for m in layer["metrics"])
    # Climbing legs take longer per km than descending ones.
    split_minutes = [
        int(r["values"]["split"].split(" h")[0]) * 60
        + int(
            (r["values"]["split"].split(" h ")[1] if " h " in r["values"]["split"] else "0").rstrip(
                "min"
            )
            or 0
        )
        for r in rows
    ]
    assert split_minutes[0] / 12 > split_minutes[3] / 14


def test_tight_and_missed_cutoffs_are_flagged() -> None:
    tight = [dict(c) for c in CHECKPOINTS]
    tight[0]["cutoff_minutes"] = 60  # impossible at the target pace
    m = mission(start_time="06:30", checkpoints=tight)
    m["goal"]["target_finish_minutes"] = 480
    m["goal"]["outcome"] = "target_time"
    layer = build_strategy(ctx_for(m, course=course()))
    assert any("after its cutoff" in w for w in layer["warnings"])
    assert section(layer)["items"][0]["values"]["cutoff_margin"].startswith("−")


def test_without_checkpoints_nothing_changes_and_the_ai_cannot_drop_the_plan() -> None:
    plain = build_strategy(ctx_for(mission(), course=course()))
    assert not any(s["id"] == "checkpoints" for s in plain["sections"])
    engine = strategy()
    ai = {**engine, "sections": [s for s in engine["sections"] if s["id"] != "checkpoints"]}
    kept = apply_layer_guardrails("strategy", engine, ai)
    assert kept["sections"][0]["id"] == "checkpoints"
