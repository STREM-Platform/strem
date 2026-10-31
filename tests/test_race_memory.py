"""Race memory: past races shape fuel and strategy, always cited (ai#45). All synthetic."""

from __future__ import annotations

from typing import Any

from app.race.context import render
from app.race.engine.fuel import build_fuel
from app.race.engine.memory import race_memory
from app.race.engine.strategy import build_strategy
from tests.test_race_os import ctx_for, mission

HISTORY: list[dict[str, Any]] = [
    {
        "name": "Vitosha 50K",
        "race_date": "2026-06-14",
        "status": "finished",
        "lessons": ["Carry more salt in heat", "Start the first climb slower"],
        "race_day": {
            "carbs_g_per_hour": 85,
            "gi_issues": "severe",
            "pacing": "faded",
            "low_point_km": 32,
            "cramps": True,
            "heat": "hot",
        },
    },
    {
        "name": "Rila 30K",
        "race_date": "2025-09-01",
        "status": "finished",
        "race_day": {"carbs_g_per_hour": 60, "gi_issues": "none", "pacing": "even"},
    },
    {
        "name": "Pirin 42K",
        "race_date": "2025-06-01",
        "status": "finished",
        "race_day": {"pacing": "blew_up"},
    },
]


def long_race() -> dict[str, Any]:
    m = mission(distance_km=50.0)
    m["goal"]["target_finish_minutes"] = 420
    m["goal"]["outcome"] = "target_time"
    return m


def test_memory_reads_limits_tolerance_fades_and_lessons() -> None:
    memory = race_memory(HISTORY)
    assert memory.gi_limit == (85, "Vitosha 50K") and memory.tolerated == (60, "Rila 30K")
    assert [n for n, _ in memory.faded] == ["Vitosha 50K", "Pirin 42K"] and memory.cramps == [
        "Vitosha 50K"
    ]
    assert race_memory([]).empty()


def carbs(layer: dict[str, Any]) -> int:
    return int(next(m for m in layer["metrics"] if m["label"] == "Carbohydrate")["value"])


def test_fuel_caps_carbs_below_what_upset_the_stomach_and_cites_it() -> None:
    plain = build_fuel(ctx_for(long_race()))
    remembered = build_fuel(ctx_for(long_race(), races=HISTORY))
    assert carbs(remembered) < carbs(plain) or carbs(plain) < 85
    assert carbs(remembered) <= 75
    assert any("Vitosha 50K" in a for a in remembered["assumptions"])
    section = next(s for s in remembered["sections"] if s["id"] == "race-memory")
    titles = [i["title"] for i in section["items"]]
    assert "85 g/h was too much at Vitosha 50K" in titles and "Carry more salt in heat" in titles


def test_strategy_protects_the_first_third_after_fades() -> None:
    layer = build_strategy(ctx_for(long_race(), races=HISTORY))
    assert any("faded in 2 of your recent races" in w for w in layer["warnings"])
    pacing = next(s for s in layer["sections"] if s["id"] == "pacing")
    assert "you faded at Vitosha 50K" in pacing["items"][0]["detail"]
    memory = next(s for s in layer["sections"] if s["id"] == "race-memory")
    assert any("Start the first climb slower" == i["title"] for i in memory["items"])


def test_race_day_facts_reach_the_ai_context() -> None:
    text = render(ctx_for(long_race(), races=HISTORY))
    assert "race day: carbs g per hour 85, gi issues severe" in text
