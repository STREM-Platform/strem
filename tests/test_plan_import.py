"""Importing the athlete's own plan (strem-mobile#118). All plans are synthetic."""

from __future__ import annotations

import asyncio
import base64
import uuid
from datetime import date
from typing import Any

import pytest

from app.race import plan_import as pi
from app.race import service
from app.race.ai.client import AIStatus, AIUnavailable
from app.race.context import RaceContext
from tests.support import auth_header
from tests.test_race_os import FakeServices, mission, race_app

TEXT_PLAN = """Week 1 - base
Mon: rest
Tue: easy 40 min
Wed: 6x800m intervals 55 min
Thu: strength 30 min + easy run 30 min
Sat: long run 1h30 14 km
Week 2
Tue: easy 45 min
Sat: long trail 2h 18 km 600 m+
remember to buy gels"""

CSV_PLAN = """Date,Workout,Duration,Distance (miles),Notes
2026-11-02,Easy run,40,5,conversational
2026-11-04,Tempo run,50,6,20 min at threshold
2026-11-07,Long run,100,10,
2026-11-08,Yoga,30,,"""


@pytest.fixture(autouse=True)
def no_conditions(monkeypatch: pytest.MonkeyPatch) -> None:
    async def none(ctx: RaceContext) -> None:
        return None

    monkeypatch.setattr(service, "conditions_for", none)


def test_text_parser_reads_weeks_days_types_and_units() -> None:
    raw = pi.parse_text(TEXT_PLAN)
    kinds = [(s.week, s.weekday, s.kind, s.sport, s.duration, s.distance) for s in raw.sessions]
    assert kinds[0] == (1, 0, "rest", "rest", None, None)
    assert (1, 2, "intervals", "running", 55, None) in kinds
    assert (1, 3, "strength", "strength", 30, None) in kinds and (
        1,
        3,
        "easy",
        "running",
        30,
        None,
    ) in kinds
    assert (1, 5, "long", "running", 90, 14.0) in kinds
    # "2h 18 km" is two hours and 18 km, and the title drops what the row already shows.
    assert any(
        (s.week, s.title, s.duration, s.distance, s.elevation) == (2, "Long trail", 120, 18.0, 600)
        for s in raw.sessions
    )
    assert pi.parse_text("Sun: hike 600 m+ 3h").sessions[0].duration == 180
    assert raw.week_labels[1] == ("base", None)
    assert raw.unparsed == ["remember to buy gels"]


def test_csv_parser_maps_columns_and_converts_miles() -> None:
    raw = pi.parse_text(CSV_PLAN, csv_hint=True)
    assert [s.kind for s in raw.sessions] == ["easy", "tempo", "long", "mobility"]
    assert raw.sessions[0].on == date(2026, 11, 2) and raw.sessions[0].distance == pytest.approx(
        8.04, 0.01
    )
    assert raw.sessions[1].details == "20 min at threshold"
    assert "miles" in raw.assumptions[0]


def test_normalize_dates_weeks_ids_and_warnings() -> None:
    raw = pi.parse_text(TEXT_PLAN)
    content, warnings = pi.normalize(
        raw,
        today=date(2026, 10, 25),
        race_date=date(2027, 4, 17),
        start_date=date(2026, 11, 2),
        timezone="Europe/Berlin",
        sport="trail_running",
        title="Synthetic 50K",
    )
    weeks = content["weeks"]
    assert [w["start_date"] for w in weeks] == ["2026-11-02", "2026-11-09"]
    assert weeks[0]["phase"] == "base" and weeks[1]["phase"] == "general"
    assert [w["focus"] for w in weeks] == ["Base week", "General week"]
    assert [(p["phase"], p["start_date"], p["end_date"]) for p in content["phases"]] == [
        ("base", "2026-11-02", "2026-11-08"),
        ("general", "2026-11-09", "2026-11-15"),
    ]
    first = weeks[0]["sessions"]
    assert (
        first[0]["date"] == "2026-11-02"
        and first[0]["kind"] == "rest"
        and first[0]["duration_minutes"] == 0
    )
    ids = [s["id"] for w in weeks for s in w["sessions"]]
    assert len(ids) == len(set(ids))
    assert any("days before race day" in w for w in warnings)  # the plan ends long before the race
    assert content["start_date"] == "2026-11-02" and content["race_date"] == "2027-04-17"


def test_undated_plan_starts_next_monday_and_says_so() -> None:
    raw = pi.parse_text("Tue: easy 40 min\nThu: easy 40 min\nTue: easy 50 min")
    content, _ = pi.normalize(
        raw,
        today=date(2026, 10, 25),
        race_date=date(2027, 4, 17),
        start_date=None,
        timezone="UTC",
        sport="trail_running",
        title="x",
    )
    assert [w["start_date"] for w in content["weeks"]] == [
        "2026-10-26",
        "2026-11-02",
    ]  # weekday wrap = new week
    assert any("no dates" in a for a in content["assumptions"])


class VisionAI:
    """Scripted race team that 'reads' images and reviews the plan."""

    model = "claude-opus-5-5"

    def __init__(self, fail: str | None = None) -> None:
        self.fail = fail
        self.attachments: list[dict[str, Any]] = []
        self.prompts: list[str] = []

    def status(self) -> AIStatus:
        return AIStatus(self.fail is None, self.model, self.fail)

    async def complete_json(
        self,
        *,
        rules: str,
        context: str,
        prompt: str,
        schema: dict[str, Any],
        attachments: list[dict[str, Any]] | None = None,
        **_: Any,
    ) -> dict[str, Any]:
        if self.fail:
            raise AIUnavailable(self.fail)
        assert "RACE MISSION" in context  # always with the full race context
        self.prompts.append(prompt)
        self.attachments.extend(attachments or [])
        if prompt.startswith("Transcribe"):
            return {
                "sessions": [
                    {
                        "week": 1,
                        "date": None,
                        "weekday": "tue",
                        "title": "Easy 45'",
                        "sport": "running",
                        "kind": "easy",
                        "duration_minutes": 45,
                        "distance_km": None,
                        "elevation_m": None,
                        "intensity": "easy",
                        "details": "",
                    },
                    {
                        "week": 1,
                        "date": None,
                        "weekday": "sat",
                        "title": "Long trail",
                        "sport": "trail_running",
                        "kind": "long",
                        "duration_minutes": 150,
                        "distance_km": 22.0,
                        "elevation_m": 900,
                        "intensity": "easy",
                        "details": "fuel every 30'",
                    },
                ],
                "weeks": [{"week": 1, "label": "Winter base", "phase": "base"}],
                "start_date_hint": None,
                "unreadable": ["Sunday cell is blurred"],
            }
        return {
            "summary": "Solid base; long runs fit the course.",
            "notes": ["Add a second climb session — the course has 16 climbs."],
        }


def _png() -> str:
    return base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * 32).decode()


def test_screenshot_import_reads_with_ai_reviews_and_commits_as_athlete_plan() -> None:
    m = mission()
    fake, ai = FakeServices(m), VisionAI()

    async def scenario() -> None:
        async with race_app(fake, ai) as client:
            headers = auth_header(uuid.uuid4())
            draft = await client.post(
                f"/v1/ai/race/{m['id']}/plan/import",
                headers=headers,
                json={
                    "sources": [
                        {
                            "kind": "image",
                            "media_type": "image/png",
                            "data_base64": _png(),
                            "name": "plan.png",
                        }
                    ],
                    "start_date": "2026-11-02",
                },
            )
            assert draft.status_code == 200, draft.text
            body = draft.json()
            assert body["parser"] == "ai" and body["sessions"] == 2 and body["ai_reason"] is None
            assert (
                ai.attachments[0]["type"] == "image"
                and ai.attachments[0]["source"]["media_type"] == "image/png"
            )
            assert body["review"]["notes"] == [
                "Add a second climb session — the course has 16 climbs."
            ]
            assert body["unparsed"] == ["Sunday cell is blurred"]
            week = body["content"]["weeks"][0]
            assert week["phase"] == "base" and week["focus"] == "Winter base"
            assert [s["date"] for s in week["sessions"]] == ["2026-11-03", "2026-11-07"]
            assert fake.plan_doc is None  # nothing saved before the athlete commits

            saved = await client.post(
                f"/v1/ai/race/{m['id']}/plan/import/commit",
                headers=headers,
                json={"content": body["content"]},
            )
            assert saved.status_code == 200
            assert (
                fake.plan_doc
                and fake.plan_doc["origin"] == "athlete"
                and fake.plan_doc["model"] is None
            )

    asyncio.run(scenario())


def test_without_ai_text_imports_and_screenshots_explain_why() -> None:
    m = mission()
    fake, ai = FakeServices(m), VisionAI(fail="The Anthropic account has no credit left.")

    async def scenario() -> None:
        async with race_app(fake, ai) as client:
            headers = auth_header(uuid.uuid4())
            text = await client.post(
                f"/v1/ai/race/{m['id']}/plan/import",
                headers=headers,
                json={"sources": [{"kind": "text", "text": TEXT_PLAN}]},
            )
            assert text.status_code == 200
            body = text.json()
            assert (
                body["parser"] == "text"
                and "credit" in body["ai_reason"]
                and body["review"] is None
            )
            assert body["sessions"] == 8

            shot = await client.post(
                f"/v1/ai/race/{m['id']}/plan/import",
                headers=headers,
                json={
                    "sources": [{"kind": "image", "media_type": "image/png", "data_base64": _png()}]
                },
            )
            assert shot.status_code == 503 and "text or CSV" in shot.json()["message"]

            nothing = await client.post(
                f"/v1/ai/race/{m['id']}/plan/import",
                headers=headers,
                json={"sources": [{"kind": "text", "text": "hello there"}]},
            )
            assert nothing.status_code == 422

    asyncio.run(scenario())


GRID_PLAN = (
    "Day\tMorning\tAfternoon / evening\n"
    "Monday\tFull Rest\tWalk / Mobility\n"
    "Tuesday\tSwim A \tStrength A \n"
    "Wednesday\tTHE ERG \tZ2 Bike / Run / Stepper \n"
    "Thursday\tSwim B\tStrength B\n"
    "Friday\tLong Aerobic Run/ Stepper / Bike\t-\n"
    "Saturday\tZ2 Bike / Run / Stepper \tSwim C \n"
    "Sunday\t-\tTHE HY + Cooldown\n"
)


def test_weekly_grid_with_two_sessions_a_day() -> None:
    raw = pi.parse_text(GRID_PLAN)
    got = [(s.weekday, s.title, s.sport, s.kind) for s in raw.sessions]
    assert len(got) == 12 and raw.unparsed == []  # every cell, header skipped, "-" is nothing
    assert got[:2] == [(0, "Full Rest", "rest", "rest"), (0, "Walk / Mobility", "hiking", "easy")]
    assert (2, "THE ERG", "rowing", "cross") in got
    assert (
        4,
        "Long Aerobic Run/ Stepper / Bike",
        "running",
        "long",
    ) in got  # first option names it
    assert (6, "THE HY + Cooldown", "hybrid", "cross") in got
    content, _ = pi.normalize(
        raw,
        today=date(2026, 10, 25),
        race_date=date(2027, 4, 17),
        start_date=date(2026, 11, 2),
        timezone="UTC",
        sport="hybrid",
        title="x",
    )
    tuesday = [s["title"] for s in content["weeks"][0]["sessions"] if s["date"] == "2026-11-03"]
    assert tuesday == ["Swim A", "Strength A"]  # morning before evening


def test_grid_with_days_across_the_top_reads_one_week_per_row() -> None:
    raw = pi.parse_text(
        "Week\tMon\tTue\tWed\tThu\tFri\tSat\tSun\n"
        "Week 1 base\tRest\tEasy 40 min\t-\tTempo 45 min\tRest\tLong run 1h30\t-\n"
        "Week 2\tRest\tEasy 45 min\tHills 50 min\t-\t-\tLong run 1h45\t-\n"
    )
    assert [(s.week, s.weekday, s.kind) for s in raw.sessions if s.kind != "rest"] == [
        (1, 1, "easy"),
        (1, 3, "tempo"),
        (1, 5, "long"),
        (2, 1, "easy"),
        (2, 2, "hills"),
        (2, 5, "long"),
    ]
    assert raw.week_labels[1] == ("base", None)
