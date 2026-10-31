"""A/B/C race priority shapes the plan (user-service#31). All races are synthetic."""

from __future__ import annotations

import copy
from datetime import date, timedelta
from typing import Any

from app.race.engine.plan import build_plan
from tests.test_race_os import TODAY, ctx_for, mission


def with_priority(m: dict[str, Any], priority: str) -> dict[str, Any]:
    m = copy.deepcopy(m)
    m["goal"]["priority"] = priority
    return m


def sessions(plan: dict[str, Any]) -> list[dict[str, Any]]:
    return [s for w in plan["weeks"] for s in w["sessions"]]


def race_day(plus_days: int) -> str:
    return (TODAY + timedelta(days=plus_days)).isoformat()


def phases(plan: dict[str, Any]) -> list[str]:
    return [w["phase"] for w in plan["weeks"]]


def hours(plan: dict[str, Any], i: int) -> float:
    return float(plan["weeks"][i]["target_hours"])


def test_own_priority_sets_the_taper() -> None:
    a = build_plan(ctx_for(mission(race_date=race_day(140))))
    b = build_plan(ctx_for(with_priority(mission(race_date=race_day(140)), "B")))
    c = build_plan(ctx_for(with_priority(mission(race_date=race_day(140)), "C")))
    assert phases(a).count("taper") >= 2  # a 50K mountain race tapers for weeks
    assert phases(b).count("taper") == 0 and phases(c).count("taper") == 0  # race week only
    assert hours(c, -1) > hours(b, -1)  # race week: trained through > mini-taper
    assert hours(b, -2) > hours(a, -2)  # the week before: still loading > already tapering
    assert any("B race" in x for x in b["assumptions"]) and any(
        "C race" in x for x in c["assumptions"]
    )


def test_other_races_inside_the_plan_b_gets_a_mini_taper_c_replaces_the_long_run() -> None:
    a_race = mission(name="Synthetic Mountain 50K", race_date=race_day(150))
    b_day = date.fromisoformat(race_day(80))
    b_day += timedelta(days=(5 - b_day.weekday()) % 7)  # a Saturday
    c_day = date.fromisoformat(race_day(45))
    c_day += timedelta(days=(6 - c_day.weekday()) % 7)  # a Sunday
    b = with_priority(
        mission(name="Synthetic Valley 25K", race_date=b_day.isoformat(), distance_km=25.0), "B"
    )
    c = with_priority(
        mission(name="Local Hill 12K", race_date=c_day.isoformat(), distance_km=12.0), "C"
    )
    plan = build_plan(ctx_for(a_race, other_missions=[b, c]))
    all_sessions = sessions(plan)
    b_race = [s for s in all_sessions if s["date"] == b_day.isoformat()]
    assert len(b_race) == 1 and b_race[0]["kind"] == "race" and "B race" in b_race[0]["title"]
    before = [
        s
        for s in all_sessions
        if b_day - timedelta(days=3) <= date.fromisoformat(s["date"]) < b_day
    ]
    assert all(s["kind"] in ("easy", "rest", "strength", "mobility", "recovery") for s in before)
    after = [s for s in all_sessions if s["date"] == (b_day + timedelta(days=1)).isoformat()]
    assert [s["kind"] for s in after] == ["rest"]
    c_week = next(
        w
        for w in plan["weeks"]
        if w["start_date"]
        <= c_day.isoformat()
        <= (date.fromisoformat(w["start_date"]) + timedelta(days=6)).isoformat()
    )
    assert not any(s["kind"] in ("long", "back_to_back") for s in c_week["sessions"])
    assert any(s["kind"] == "race" and "C race" in s["title"] for s in c_week["sessions"])
    ids = [s["id"] for s in all_sessions]
    assert len(ids) == len(set(ids))


def test_conflicts_are_flagged() -> None:
    a_race = mission(name="Synthetic Mountain 50K", race_date=race_day(150))
    second_a = mission(name="Spring Marathon", race_date=race_day(110))
    late_b = with_priority(mission(name="Tune-up 10K", race_date=race_day(144)), "B")
    plan = build_plan(ctx_for(a_race, other_missions=[second_a, late_b]))
    assert any("both A races" in w for w in plan["warnings"])
    assert any("falls in the taper" in w for w in plan["warnings"])
    archived = {**mission(name="Old race", race_date=race_day(60)), "state": "archived"}
    assert not any(
        "Old race" in s["title"]
        for s in sessions(build_plan(ctx_for(a_race, other_missions=[archived])))
    )
