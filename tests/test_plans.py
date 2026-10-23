"""Race OS plans, progress tracker, check-ins and Strava evidence (docs#26).

All athletes, plans and activities are synthetic.
"""

import asyncio
import copy
import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import Request

from app.deps import CurrentUserDep
from app.errors import AppError
from app.integrations.providers import StravaProvider, _strava_session
from app.models import TrainingSession
from app.plan_schemas import MissionPlan
from app.plans import compute_progress
from app.routers.courses import mission_access
from tests.support import Harness, auth_header, training_app

TODAY = datetime.now(UTC).date()
MONDAY = TODAY - timedelta(days=TODAY.weekday())
LAST_MONDAY = MONDAY - timedelta(days=7)


def _session(
    sid: str,
    day: date,
    minutes: int,
    kind: str = "easy",
    sport: str = "trail_running",
    **extra: Any,
) -> dict[str, Any]:
    return {
        "id": sid,
        "date": day.isoformat(),
        "sport": sport,
        "kind": kind,
        "title": sid.replace("-", " ").title(),
        "duration_minutes": minutes,
        **extra,
    }


PLAN: dict[str, Any] = {
    "origin": "engine",
    "content": {
        "headline": "12 weeks to a confident 50K",
        "summary": "Synthetic plan for tests.",
        "sport": "trail_running",
        "timezone": "UTC",
        "start_date": LAST_MONDAY.isoformat(),
        "race_date": (MONDAY + timedelta(weeks=10)).isoformat(),
        "phases": [
            {
                "phase": "base",
                "start_date": LAST_MONDAY.isoformat(),
                "end_date": (MONDAY + timedelta(days=6)).isoformat(),
                "goal": "Consistency",
            }
        ],
        "weeks": [
            {
                "index": 1,
                "start_date": LAST_MONDAY.isoformat(),
                "phase": "base",
                "focus": "Settle in",
                "target_hours": 5,
                "sessions": [
                    _session("w1-easy", LAST_MONDAY + timedelta(days=1), 50),
                    _session("w1-rest", LAST_MONDAY + timedelta(days=2), 0, "rest", "rest"),
                    _session("w1-hills", LAST_MONDAY + timedelta(days=3), 60, "hills", key=True),
                    _session(
                        "w1-long", LAST_MONDAY + timedelta(days=5), 120, "long", distance_km=18
                    ),
                ],
            },
            {
                "index": 2,
                "start_date": MONDAY.isoformat(),
                "phase": "base",
                "focus": "Build the long run",
                "sessions": [
                    _session("w2-easy", MONDAY + timedelta(days=6), 45),
                    _session("w2-long", MONDAY + timedelta(days=6), 130, "long", key=True),
                ],
            },
        ],
    },
}


def activity(day: date, minutes: int, kind: str = "trail_running", **extra: Any) -> TrainingSession:
    return TrainingSession(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        session_type=kind,
        duration_minutes=minutes,
        source=extra.pop("source", "strava"),
        logged_at=datetime.combine(day, datetime.min.time(), tzinfo=UTC) + timedelta(hours=7),
        is_race=extra.pop("is_race", False),
        **extra,
    )


def allow(h: Harness, owner: uuid.UUID, mission: uuid.UUID, state: str = "active") -> None:
    async def allowed(current: CurrentUserDep, request: Request) -> dict[str, object]:
        if current.user_id != owner or request.path_params["mission_id"] != str(mission):
            raise AppError(404, "mission_not_found", "Not found")
        return {"generation": 0, "state": state}

    h.app.dependency_overrides[mission_access] = allowed


def test_plan_lifecycle_patch_and_regeneration_keeps_athlete_state() -> None:
    async def scenario() -> None:
        async with training_app() as h:
            owner, mission = uuid.uuid4(), uuid.uuid4()
            allow(h, owner, mission)
            path = f"/v1/training/missions/{mission}/plan"
            headers = {**auth_header(owner), "If-Match": '"0"'}
            missing = await h.client.get(path, headers=headers)
            assert missing.status_code == 404 and missing.json()["code"] == "plan_not_found"
            created = await h.client.put(path, headers=headers, json=PLAN)
            assert created.status_code == 200, created.text
            assert created.headers["etag"] == '"1"'
            assert (await h.client.put(path, headers=headers, json=PLAN)).status_code == 412

            patched = await h.client.patch(
                f"{path}/sessions/w1-hills",
                headers={**headers, "If-Match": '"1"'},
                json={"status": "done", "rpe": 7, "athlete_note": "Legs heavy on the last rep"},
            )
            assert patched.status_code == 200, patched.text
            moved = await h.client.patch(
                f"{path}/sessions/w2-easy",
                headers={**headers, "If-Match": '"2"'},
                json={"date": (MONDAY + timedelta(days=4)).isoformat()},
            )
            assert moved.status_code == 200
            sessions = {s["id"]: s for w in moved.json()["content"]["weeks"] for s in w["sessions"]}
            assert sessions["w2-easy"]["status"] == "planned"
            assert sessions["w2-easy"]["date"] == (MONDAY + timedelta(days=4)).isoformat()
            bad = await h.client.patch(
                f"{path}/sessions/w2-easy", headers=headers, json={"status": None}
            )
            assert bad.status_code in (400, 422)

            regenerated = copy.deepcopy(PLAN)
            regenerated["origin"] = "ai"
            regenerated["model"] = "claude-opus-5-5"
            regenerated["content"]["headline"] = "Adjusted plan"
            replaced = await h.client.put(
                path, headers={**headers, "If-Match": "*"}, json=regenerated
            )
            assert replaced.status_code == 200
            kept = {s["id"]: s for w in replaced.json()["content"]["weeks"] for s in w["sessions"]}
            assert kept["w1-hills"]["status"] == "done" and kept["w1-hills"]["rpe"] == 7
            assert replaced.json()["origin"] == "ai" and replaced.json()["version"] == 4

            other = auth_header(uuid.uuid4())
            assert (await h.client.get(path, headers=other)).status_code == 404

            exported = await h.client.get("/v1/training/courses/data", headers=headers)
            assert exported.json()["plans"][0]["mission_id"] == str(mission)

            allow(h, owner, mission, state="completed")
            locked = await h.client.put(path, headers={**headers, "If-Match": "*"}, json=PLAN)
            assert locked.status_code == 409 and locked.json()["code"] == "mission_not_active"
            readable = await h.client.get(path, headers=headers)
            assert readable.status_code == 200

    asyncio.run(scenario())


def test_progress_matches_activities_and_derives_missed_honestly() -> None:
    plan = MissionPlan.model_validate(
        {
            "mission_id": uuid.uuid4(),
            "version": 3,
            "origin": "engine",
            "content": PLAN["content"],
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }
    )
    rows = [
        activity(LAST_MONDAY + timedelta(days=1), 55),  # easy done
        activity(LAST_MONDAY + timedelta(days=3), 30),  # hills partial (30/60)
        activity(LAST_MONDAY + timedelta(days=4), 40, "cycling"),  # unplanned ride
        activity(LAST_MONDAY - timedelta(days=20), 200, is_race=True, distance_km=30.0),
    ]
    progress = compute_progress(plan.mission_id, plan, rows, now=datetime.now(UTC))
    status = {s.id: s for s in progress.sessions}
    assert status["w1-easy"].derived_status == "done"
    assert status["w1-easy"].status_source == "matched"
    assert status["w1-hills"].derived_status == "partial"
    assert status["w1-long"].derived_status == "missed"
    assert status["w1-long"].status_source == "derived"
    assert status["w1-rest"].derived_status == "rest"
    assert status["w2-long"].derived_status in ("planned", "missed", "done")
    assert progress.totals is not None
    assert progress.totals.completed == 1 and progress.totals.partial == 1
    assert progress.totals.missed >= 1
    assert progress.totals.consistency_pct is not None
    assert [a.session_type for a in progress.unplanned] == ["cycling"]
    week1 = progress.weeks[0]
    assert week1.timing == "past" and week1.actual.sessions == 3
    assert week1.planned.sessions == 3  # rest days are not planned volume
    assert [p.status for p in progress.long_sessions][0] == "missed"
    assert progress.evidence.races_recorded == 1
    assert len(progress.evidence.weeks) == 8

    # The athlete's word beats derivation: a manually completed session stays done.
    content = copy.deepcopy(PLAN["content"])
    content["weeks"][0]["sessions"][3]["status"] = "done"
    plan2 = plan.model_copy(update={"content": plan.content.model_validate(content)})
    again = compute_progress(plan.mission_id, plan2, rows)
    long_run = next(s for s in again.sessions if s.id == "w1-long")
    assert long_run.derived_status == "done" and long_run.status_source == "athlete"


def test_progress_endpoint_without_plan_returns_evidence_only() -> None:
    async def scenario() -> None:
        async with training_app() as h:
            owner, mission = uuid.uuid4(), uuid.uuid4()
            allow(h, owner, mission)
            headers = auth_header(owner)
            logged = await h.client.post(
                "/v1/training/sessions",
                headers=headers,
                json={
                    "session_type": "hiking",
                    "duration_minutes": 180,
                    "distance_km": 14.5,
                    "elevation_m": 950,
                    "title": "Ridge hike",
                },
            )
            assert logged.status_code == 201, logged.text
            assert logged.json()["title"] == "Ridge hike"
            progress = await h.client.get(
                f"/v1/training/missions/{mission}/progress", headers=headers
            )
            assert progress.status_code == 200, progress.text
            body = progress.json()
            assert body["plan_version"] is None and body["sessions"] == []
            assert body["evidence"]["weeks"][-1]["volume"]["elevation_m"] == 950
            assert body["evidence"]["longest_recent"]["title"] == "Ridge hike"

    asyncio.run(scenario())


def test_checkins_upsert_per_day_and_validate() -> None:
    async def scenario() -> None:
        async with training_app() as h:
            owner = uuid.uuid4()
            headers = auth_header(owner)
            first = await h.client.put(
                "/v1/training/checkins",
                headers=headers,
                json={"day": TODAY.isoformat(), "sleep_quality": 2, "soreness": 4},
            )
            assert first.status_code == 200, first.text
            second = await h.client.put(
                "/v1/training/checkins",
                headers=headers,
                json={"day": TODAY.isoformat(), "energy": 4, "illness": True},
            )
            assert second.json()["id"] == first.json()["id"]
            assert second.json()["sleep_quality"] is None and second.json()["illness"] is True
            empty = await h.client.put(
                "/v1/training/checkins", headers=headers, json={"day": TODAY.isoformat()}
            )
            assert empty.status_code in (400, 422)
            future = await h.client.put(
                "/v1/training/checkins",
                headers=headers,
                json={"day": (TODAY + timedelta(days=5)).isoformat(), "energy": 3},
            )
            assert future.status_code == 422
            listed = await h.client.get("/v1/training/checkins", headers=headers)
            assert len(listed.json()["items"]) == 1
            other = await h.client.get("/v1/training/checkins", headers=auth_header(uuid.uuid4()))
            assert other.json()["items"] == []

    asyncio.run(scenario())


def test_strava_normalization_covers_sports_races_and_heart_rate() -> None:
    race = _strava_session(
        {
            "id": 77,
            "sport_type": "TrailRun",
            "type": "Run",
            "name": "Synthetic Mountain 50K",
            "start_date": "2026-05-02T06:00:00Z",
            "moving_time": 22000,
            "elapsed_time": 24600,
            "distance": 50300.0,
            "total_elevation_gain": 2410.4,
            "average_heartrate": 151.3,
            "max_heartrate": 182,
            "workout_type": 1,
        }
    )
    assert race is not None and race.session_type == "trail_running"
    assert race.is_race and race.title == "Synthetic Mountain 50K"
    assert race.elapsed_minutes == 410 and race.avg_hr == 151 and race.elevation_m == 2410
    ride = _strava_session(
        {"id": 2, "sport_type": "GravelRide", "moving_time": 3600, "workout_type": 11}
    )
    assert ride is not None and ride.session_type == "cycling" and ride.is_race
    gym = _strava_session(
        {"id": 3, "sport_type": "WeightTraining", "moving_time": 2700, "distance": 10}
    )
    assert gym is not None and gym.session_type == "strength" and gym.distance_km is None
    assert _strava_session({"id": 4, "sport_type": "Golf", "moving_time": 3600}) is None


def test_strava_fetch_paginates_full_history_on_first_sync(monkeypatch: Any) -> None:
    calls: list[int] = []

    async def fake_get(url: str, params: dict[str, Any], headers: dict[str, str]) -> Any:
        calls.append(params["page"])
        if params["page"] > 2:
            return []
        return [
            {"id": params["page"] * 1000 + i, "sport_type": "Run", "moving_time": 1800}
            for i in range(StravaProvider.PAGE_SIZE)
        ]

    monkeypatch.setattr("app.integrations.providers._get_json", fake_get)
    provider = StravaProvider("id", "secret")
    result = asyncio.run(provider.fetch("token", since=None))
    assert calls == [1, 2, 3]
    assert len(result.sessions) == 2 * StravaProvider.PAGE_SIZE
    calls.clear()
    asyncio.run(provider.fetch("token", since=datetime.now(UTC)))
    assert calls == [1, 2, 3]
