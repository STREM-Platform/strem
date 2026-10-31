"""The athlete's plan across races and outside them (issue #23). All data is synthetic."""

import asyncio
import copy
import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest

from app import athlete_plan as timeline
from app.errors import AppError
from app.plan_schemas import MissionPlan
from tests.support import auth_header, training_app
from tests.test_plans import PLAN, allow

TODAY = datetime.now(UTC).date()
MONDAY = TODAY - timedelta(days=TODAY.weekday())


def week(
    index: int, start: date, phase: str, sessions: list[dict[str, Any]], focus: str = "Train"
) -> dict[str, Any]:
    return {
        "index": index,
        "start_date": start.isoformat(),
        "phase": phase,
        "focus": focus,
        "sessions": sessions,
    }


def s(
    sid: str, day: date, kind: str = "easy", minutes: int = 45, sport: str = "running"
) -> dict[str, Any]:
    return {
        "id": sid,
        "date": day.isoformat(),
        "sport": sport,
        "kind": kind,
        "title": sid,
        "duration_minutes": minutes,
    }


def content(
    start: date, race: date | None, weeks: list[dict[str, Any]], headline: str = "Plan"
) -> dict[str, Any]:
    return {
        "headline": headline,
        "sport": "trail_running",
        "timezone": "UTC",
        "start_date": start.isoformat(),
        "race_date": race.isoformat() if race else None,
        "weeks": weeks,
    }


def mission_plan(mission: uuid.UUID, race: date, weeks: list[dict[str, Any]]) -> MissionPlan:
    now = datetime.now(UTC)
    return MissionPlan.model_validate(
        {
            "mission_id": mission,
            "version": 1,
            "origin": "ai",
            "content": content(MONDAY, race, weeks),
            "created_at": now,
            "updated_at": now,
        }
    )


def base_plan(weeks: list[dict[str, Any]]) -> timeline.BasePlan:
    now = datetime.now(UTC)
    return timeline.BasePlan.model_validate(
        {
            "version": 3,
            "origin": "athlete",
            "content": content(MONDAY, None, weeks, "Winter base"),
            "created_at": now,
            "updated_at": now,
        }
    )


def race(mission: uuid.UUID, name: str, day: date, priority: str) -> dict[str, Any]:
    return {
        "mission_id": mission,
        "name": name,
        "race_date": day,
        "priority": priority,
        "sport": "trail_running",
        "state": "active",
    }


def test_a_race_governs_c_race_day_stays_and_base_fills_the_rest() -> None:
    a, c = uuid.uuid4(), uuid.uuid4()
    a_day, c_day = MONDAY + timedelta(weeks=2, days=5), MONDAY + timedelta(weeks=1, days=6)
    a_plan = mission_plan(
        a,
        a_day,
        [
            week(1, MONDAY, "build", [s("w1-tempo", MONDAY + timedelta(days=2), "tempo")]),
            week(
                2,
                MONDAY + timedelta(weeks=1),
                "peak",
                [s("w2-long", MONDAY + timedelta(weeks=1, days=5), "long", 150)],
            ),
            week(3, MONDAY + timedelta(weeks=2), "taper", [s("w3-race", a_day, "race", 300)]),
        ],
    )
    c_plan = mission_plan(
        c,
        c_day,
        [
            week(1, MONDAY, "base", [s("w1-easy", MONDAY + timedelta(days=1))]),
            week(2, MONDAY + timedelta(weeks=1), "race", [s("w2-race", c_day, "race", 120)]),
        ],
    )
    base = base_plan(
        [
            week(
                1,
                MONDAY - timedelta(weeks=1),
                "base",
                [s("swim", MONDAY - timedelta(days=5), sport="swimming")],
            ),
            week(
                2,
                MONDAY + timedelta(weeks=3),
                "recovery",
                [s("walk", MONDAY + timedelta(weeks=3, days=1), sport="hiking")],
            ),
        ]
    )
    plan = timeline.compose(
        [race(a, "Mountain 50K", a_day, "A"), race(c, "Local 15K", c_day, "C")],
        {a: a_plan, c: c_plan},
        base,
        TODAY,
    )
    assert plan.content is not None
    weeks = plan.content.weeks
    assert [(w.source, w.mission_id) for w in weeks] == [
        ("base", None),
        ("race", a),
        ("race", a),
        ("race", a),
        ("base", None),
    ]
    assert [w.index for w in weeks] == [1, 2, 3, 4, 5]
    ids = [x.id for w in weeks for x in w.sessions]
    assert f"m{a.hex[:8]}-w1-tempo" in ids and "b-swim" in ids and "b-walk" in ids
    assert f"m{c.hex[:8]}-w2-race" in ids  # the C race day is kept inside the A-race week
    assert f"m{c.hex[:8]}-w1-easy" not in ids  # its training is not
    assert (
        plan.next_race is not None and plan.next_race.name == "Mountain 50K"
    )  # C races don't lead
    assert plan.content.race_date == a_day and plan.base_version == 3
    assert [p.phase for p in plan.content.phases] == ["base", "build", "peak", "taper", "recovery"]
    assert weeks[1].origin == "ai" and weeks[0].origin == "athlete"


def test_no_race_only_your_own_plan() -> None:
    plan = timeline.compose([], {}, base_plan([week(1, MONDAY, "base", [s("run", MONDAY)])]), TODAY)
    assert plan.content is not None and plan.content.race_date is None and plan.next_race is None
    assert plan.content.weeks[0].sessions[0].id == "b-run"
    assert timeline.compose([], {}, None, TODAY).content is None


def test_split_session_ids() -> None:
    assert timeline.split_session_id("b-w1-mon-1") == (None, "w1-mon-1")
    assert timeline.split_session_id("m1a2b3c4d-w3-sat-long") == ("1a2b3c4d", "w3-sat-long")
    with pytest.raises(AppError):
        timeline.split_session_id("w3-sat-long")


def test_base_plan_api_timeline_progress_and_patches(monkeypatch: pytest.MonkeyPatch) -> None:
    async def scenario() -> None:
        async with training_app() as h:
            owner, mission = uuid.uuid4(), uuid.uuid4()
            headers = auth_header(owner)
            allow(h, owner, mission)
            race_plan = copy.deepcopy(PLAN)
            assert (
                await h.client.put(
                    f"/v1/training/missions/{mission}/plan",
                    headers={**headers, "If-Match": '"0"'},
                    json=race_plan,
                )
            ).status_code == 200
            race_day = date.fromisoformat(race_plan["content"]["race_date"])

            async def races(token: str, base_url: str) -> list[dict[str, Any]]:
                return [race(mission, "Synthetic 50K", race_day, "A")]

            async def grant(mission_id: uuid.UUID, token: str, base_url: str) -> dict[str, object]:
                assert mission_id == mission
                return {"generation": 0, "state": "active"}

            monkeypatch.setattr(timeline, "athlete_races", races)
            monkeypatch.setattr("app.routers.athlete_plan.access", grant)

            assert (
                await h.client.get("/v1/training/plan/base", headers=headers)
            ).status_code == 404
            after = race_day + timedelta(days=7 - race_day.weekday())
            own = {
                "origin": "athlete",
                "content": content(
                    after,
                    None,
                    [
                        week(
                            1,
                            after,
                            "recovery",
                            [s("w1-walk", after + timedelta(days=1), sport="hiking")],
                        )
                    ],
                    "After the race",
                ),
            }
            saved = await h.client.put(
                "/v1/training/plan/base", headers={**headers, "If-Match": '"0"'}, json=own
            )
            assert saved.status_code == 200, saved.text
            assert saved.json()["content"]["race_date"] is None and saved.headers["etag"] == '"1"'

            plan = (await h.client.get("/v1/training/plan", headers=headers)).json()
            sources = [w["source"] for w in plan["content"]["weeks"]]
            assert sources[-1] == "base" and "race" in sources
            assert (
                plan["races"][0]["has_plan"] is True
                and plan["next_race"]["name"] == "Synthetic 50K"
            )

            short = mission.hex[:8]
            moved = await h.client.patch(
                f"/v1/training/plan/sessions/m{short}-w1-hills",
                headers=headers,
                json={"status": "done", "rpe": 6},
            )
            assert moved.status_code == 200, moved.text
            stored = (
                await h.client.get(f"/v1/training/missions/{mission}/plan", headers=headers)
            ).json()
            hills = next(
                x
                for w in stored["content"]["weeks"]
                for x in w["sessions"]
                if x["id"] == "w1-hills"
            )
            assert hills["status"] == "done" and hills["rpe"] == 6

            walked = await h.client.patch(
                "/v1/training/plan/sessions/b-w1-walk",
                headers=headers,
                json={"athlete_note": "Felt fresh"},
            )
            assert walked.status_code == 200
            assert (await h.client.get("/v1/training/plan/base", headers=headers)).json()[
                "version"
            ] == 2
            missing = await h.client.patch(
                "/v1/training/plan/sessions/mdeadbeef-w1-x",
                headers=headers,
                json={"status": "done"},
            )
            assert missing.status_code == 404

            progress = await h.client.get("/v1/training/plan/progress", headers=headers)
            assert progress.status_code == 200, progress.text
            statuses = {x["id"]: x["derived_status"] for x in progress.json()["sessions"]}
            assert statuses[f"m{short}-w1-hills"] == "done"

            exported = (await h.client.get("/v1/training/courses/data", headers=headers)).json()[
                "plans"
            ]
            assert any(p.get("scope") == "athlete" for p in exported)
            assert (
                await h.client.delete("/v1/training/plan/base", headers=headers)
            ).status_code == 204

    asyncio.run(scenario())


def test_timeline_needs_the_races_service(monkeypatch: pytest.MonkeyPatch) -> None:
    async def scenario() -> None:
        async with training_app() as h:
            response = await h.client.get("/v1/training/plan", headers=auth_header(uuid.uuid4()))
            assert response.status_code == 503 and response.json()["code"] == "missions_unavailable"

    asyncio.run(scenario())
