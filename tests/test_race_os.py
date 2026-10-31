"""Race OS (docs#26): multi-sport missions, completion, layers and race history.

All athletes, events and results here are synthetic.
"""

import asyncio
import copy
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from tests.support import Harness, auth_header, user_app

TRIATHLON: dict[str, Any] = {
    "event": {
        "name": "Synthetic Lake Full Distance",
        "race_date": "2027-07-04",
        "timezone": "Europe/Zurich",
        "location_name": "Lake Example",
        "distance_km": 226.0,
        "elevation_gain_m": 1800,
        "cutoff_minutes": 1020,
        "sport": "triathlon",
        "format": "single_day",
        "support": "aid_stations",
        "start_time": "06:45",
        "latitude": 47.05,
        "longitude": 8.31,
        "country_code": "CH",
        "legs": [
            {"discipline": "swim", "distance_km": 3.8},
            {"discipline": "bike", "distance_km": 180},
            {"discipline": "run", "distance_km": 42.2},
        ],
    },
    "goal": {
        "outcome": "target_time",
        "target_finish_minutes": 690,
        "motivation": "Prove I can hold it together for a whole day.",
        "priority": "A",
    },
    "cover": {
        "url": "https://upload.wikimedia.org/example/lake.jpg",
        "thumb_url": "https://upload.wikimedia.org/example/lake-thumb.jpg",
        "title": "A lake at dawn",
        "creator": "Example Photographer",
        "license": "CC BY-SA 4.0",
        "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
        "source_url": "https://commons.wikimedia.org/wiki/File:Example.jpg",
        "provider": "wikimedia",
        "depicts": "location",
    },
    "preparation": {
        "experience": "some",
        "training_days_per_week": 6,
        "weekly_hours": 11.5,
        "long_session_day": "saturday",
        "current_weekly_hours": 8,
        "terrain_access": ["pool", "open_water", "indoor_trainer", "rolling_hills"],
        "constraints": "Two kids; early mornings only on weekdays.",
    },
}

FUEL_LAYER: dict[str, Any] = {
    "origin": "engine",
    "model": None,
    "content": {
        "headline": "75 g carbs per hour from the bike onward",
        "summary": "Synthetic fuel plan for tests.",
        "metrics": [{"label": "Carbohydrate", "value": "75", "unit": "g/h"}],
        "sections": [
            {
                "id": "rehearsals",
                "title": "Rehearse in training",
                "kind": "checklist",
                "items": [
                    {"id": "gel-long-ride", "title": "Test gels on the long ride"},
                    {"id": "breakfast", "title": "Rehearse race breakfast", "priority": "high"},
                ],
            },
            {
                "id": "race-day",
                "title": "Race day",
                "kind": "table",
                "columns": ["carbs_g", "fluid_ml"],
                "items": [
                    {
                        "id": "bike-hour-1",
                        "title": "Bike hour 1",
                        "values": {"carbs_g": 70, "fluid_ml": 600},
                    }
                ],
            },
        ],
        "assumptions": ["Warm conditions"],
    },
}


def run(scenario: Callable[[Harness], Awaitable[None]]) -> None:
    async def inner() -> None:
        async with user_app() as h:
            await scenario(h)

    asyncio.run(inner())


def headers(user: uuid.UUID, key: str = "race_os_key", version: int | str = 1) -> dict[str, str]:
    match = version if version == "*" else f'"{version}"'
    return {**auth_header(user), "Idempotency-Key": key, "If-Match": match}


def test_multisport_mission_round_trip_and_validation() -> None:
    async def scenario(h: Harness) -> None:
        user = uuid.uuid4()
        created = await h.client.post("/v1/race-missions", headers=headers(user), json=TRIATHLON)
        assert created.status_code == 201, created.text
        body = created.json()
        assert body["event"]["sport"] == "triathlon"
        assert [leg["discipline"] for leg in body["event"]["legs"]] == ["swim", "bike", "run"]
        assert body["cover"]["license"] == "CC BY-SA 4.0"
        assert body["preparation"]["weekly_hours"] == 11.5
        assert body["goal"]["motivation"].startswith("Prove")

        # Removing the cover photo is an explicit null.
        path = f"/v1/race-missions/{body['id']}"
        cleared = await h.client.patch(
            path, headers=headers(user), json={"cover": None, "correction_reason": "No photo"}
        )
        assert cleared.status_code == 200 and cleared.json()["cover"] is None

        bad = copy.deepcopy(TRIATHLON)
        bad["event"]["latitude"] = 47.0
        del bad["event"]["longitude"]
        rejected = await h.client.post(
            "/v1/race-missions", headers=headers(user, "bad_coordinates"), json=bad
        )
        assert rejected.status_code == 400
        bad = copy.deepcopy(TRIATHLON)
        bad["cover"]["url"] = "javascript:alert(1)"
        rejected = await h.client.post(
            "/v1/race-missions", headers=headers(user, "bad_cover_url"), json=bad
        )
        assert rejected.status_code == 400
        bad = copy.deepcopy(TRIATHLON)
        bad["goal"] = {"outcome": "finish", "target_finish_minutes": 600}
        rejected = await h.client.post(
            "/v1/race-missions", headers=headers(user, "bad_goal_target"), json=bad
        )
        assert rejected.status_code == 400

    run(scenario)


def test_complete_mission_records_history_and_locks_layers() -> None:
    async def scenario(h: Harness) -> None:
        user = uuid.uuid4()
        created = (
            await h.client.post("/v1/race-missions", headers=headers(user), json=TRIATHLON)
        ).json()
        path = f"/v1/race-missions/{created['id']}"
        put = await h.client.put(
            f"{path}/layers/fuel", headers=headers(user, version="0"), json=FUEL_LAYER
        )
        assert put.status_code == 200, put.text
        done = await h.client.post(
            f"{path}/complete",
            headers=headers(user, "complete_key", 1),
            json={
                "result": {
                    "status": "finished",
                    "finish_minutes": 702,
                    "rating": 4,
                    "lessons": ["Start the bike easier", "  "],
                    "race_day": {
                        "carbs_g_per_hour": 85,
                        "gi_issues": "severe",
                        "pacing": "faded",
                        "low_point_km": 140,
                        "heat": "hot",
                    },
                }
            },
        )
        assert done.status_code == 200, done.text
        assert done.json()["state"] == "completed"
        assert done.json()["result"]["lessons"] == ["Start the bike easier"]
        replay = await h.client.post(
            f"{path}/complete",
            headers=headers(user, "complete_key", 1),
            json={
                "result": {
                    "status": "finished",
                    "finish_minutes": 702,
                    "rating": 4,
                    "lessons": ["Start the bike easier", "  "],
                }
            },
        )
        assert replay.status_code == 200 and replay.json()["version"] == done.json()["version"]

        history = (await h.client.get("/v1/users/me/races", headers=headers(user))).json()
        assert len(history["items"]) == 1
        entry = history["items"][0]
        assert entry["source"] == "mission" and entry["mission_id"] == created["id"]
        assert entry["finish_minutes"] == 702 and entry["sport"] == "triathlon"
        assert (
            entry["race_day"]["gi_issues"] == "severe"
            and entry["race_day"]["carbs_g_per_hour"] == 85
        )

        locked = await h.client.put(
            f"{path}/layers/fuel", headers=headers(user, version="*"), json=FUEL_LAYER
        )
        assert locked.status_code == 409 and locked.json()["code"] == "mission_not_active"
        focus = await h.client.get("/v1/race-missions/active", headers=headers(user))
        assert focus.status_code == 404
        completed = await h.client.get("/v1/race-missions?state=completed", headers=headers(user))
        assert [m["id"] for m in completed.json()["items"]] == [created["id"]]

    run(scenario)


def test_layer_versions_item_progress_and_regeneration() -> None:
    async def scenario(h: Harness) -> None:
        user = uuid.uuid4()
        mission = (
            await h.client.post("/v1/race-missions", headers=headers(user), json=TRIATHLON)
        ).json()
        base = f"/v1/race-missions/{mission['id']}/layers"
        missing = await h.client.get(f"{base}/fuel", headers=headers(user))
        assert missing.status_code == 404 and missing.json()["code"] == "layer_not_found"
        unknown = await h.client.get(f"{base}/tribe", headers=headers(user))
        assert unknown.status_code == 404 and unknown.json()["code"] == "unknown_layer"

        created = await h.client.put(
            f"{base}/fuel", headers=headers(user, version="0"), json=FUEL_LAYER
        )
        assert created.status_code == 200 and created.headers["etag"] == '"1"'
        assert created.json()["origin"] == "engine"
        again = await h.client.put(
            f"{base}/fuel", headers=headers(user, version="0"), json=FUEL_LAYER
        )
        assert again.status_code == 412

        ticked = await h.client.patch(
            f"{base}/fuel/items/gel-long-ride",
            headers=headers(user, version=1),
            json={"status": "tested", "note": "Two gels/hour sat well"},
        )
        assert ticked.status_code == 200, ticked.text
        stale = await h.client.patch(
            f"{base}/fuel/items/breakfast",
            headers=headers(user, version=1),
            json={"status": "done"},
        )
        assert stale.status_code == 412
        absent = await h.client.patch(
            f"{base}/fuel/items/nope", headers=headers(user, version=2), json={"status": "done"}
        )
        assert absent.status_code == 404 and absent.json()["code"] == "item_not_found"

        # Regenerating (e.g. by the AI) keeps the athlete's progress on surviving items.
        regenerated = copy.deepcopy(FUEL_LAYER)
        regenerated["origin"] = "ai"
        regenerated["model"] = "claude-opus-5-5"
        regenerated["content"]["headline"] = "80 g carbs per hour"
        replaced = await h.client.put(
            f"{base}/fuel", headers=headers(user, version="*"), json=regenerated
        )
        assert replaced.status_code == 200, replaced.text
        layer = replaced.json()
        assert layer["version"] == 3 and layer["origin"] == "ai"
        items = {i["id"]: i for s in layer["content"]["sections"] for i in s["items"]}
        assert items["gel-long-ride"]["status"] == "tested"
        assert items["gel-long-ride"]["note"] == "Two gels/hour sat well"
        assert items["breakfast"]["status"] == "todo"

        duplicate = copy.deepcopy(FUEL_LAYER)
        duplicate["content"]["sections"][1]["items"][0]["id"] = "breakfast"
        invalid = await h.client.put(
            f"{base}/gear", headers=headers(user, version="0"), json=duplicate
        )
        assert invalid.status_code == 400

        listed = await h.client.get(base, headers=headers(user))
        assert [layer["kind"] for layer in listed.json()["items"]] == ["fuel"]

        other = uuid.uuid4()
        foreign = await h.client.get(f"{base}/fuel", headers=headers(other))
        assert foreign.status_code == 404 and foreign.json()["code"] == "mission_not_found"

        exported = (await h.client.get("/v1/race-missions/data", headers=headers(user))).json()
        assert exported["layers"][0]["kind"] == "fuel"
        deleted = await h.client.request(
            "DELETE",
            "/v1/race-missions/data",
            headers=headers(user),
            json={"confirmation": "DELETE MY RACE MISSIONS"},
        )
        assert deleted.status_code == 204
        exported = (await h.client.get("/v1/race-missions/data", headers=headers(user))).json()
        assert exported["layers"] == [] and exported["missions"] == []

    run(scenario)


def test_race_history_crud_and_idempotent_import() -> None:
    async def scenario(h: Harness) -> None:
        user = uuid.uuid4()
        added = await h.client.post(
            "/v1/users/me/races",
            headers=headers(user),
            json={
                "name": "Synthetic Hill Marathon",
                "race_date": "2025-09-14",
                "sport": "road_running",
                "distance_km": 42.2,
                "finish_minutes": 236,
                "fueling_notes": "Cramped at km 35; too little sodium.",
            },
        )
        assert added.status_code == 201, added.text
        race_id = added.json()["id"]
        payload = {
            "source": "strava",
            "items": [
                {
                    "external_id": "1001",
                    "name": "Synthetic Trail 50",
                    "race_date": "2026-05-02",
                    "distance_km": 50.3,
                    "elevation_gain_m": 2400,
                    "finish_minutes": 412,
                },
                {
                    "external_id": "1002",
                    "name": "Synthetic 10K",
                    "race_date": "2026-03-01",
                    "sport": "road_running",
                    "distance_km": 10,
                    "finish_minutes": 44,
                },
            ],
        }
        first = await h.client.post(
            "/v1/users/me/races/import", headers=headers(user), json=payload
        )
        assert first.status_code == 200 and first.json()["created"] == 2
        second = await h.client.post(
            "/v1/users/me/races/import", headers=headers(user), json=payload
        )
        assert second.json()["created"] == 0
        races = (await h.client.get("/v1/users/me/races", headers=headers(user))).json()["items"]
        assert [r["name"] for r in races] == [
            "Synthetic Trail 50",
            "Synthetic 10K",
            "Synthetic Hill Marathon",
        ]
        assert races[0]["external_id"] == "strava:1001"

        edited = await h.client.put(
            f"/v1/users/me/races/{race_id}",
            headers=headers(user),
            json={
                "name": "Synthetic Hill Marathon",
                "race_date": "2025-09-14",
                "sport": "road_running",
                "distance_km": 42.2,
                "finish_minutes": 236,
                "lessons": ["Take salt every 45 min"],
            },
        )
        assert edited.status_code == 200 and edited.json()["lessons"] == ["Take salt every 45 min"]
        other = await h.client.delete(
            f"/v1/users/me/races/{race_id}", headers=headers(uuid.uuid4())
        )
        assert other.status_code == 404
        gone = await h.client.delete(f"/v1/users/me/races/{race_id}", headers=headers(user))
        assert gone.status_code == 204

    run(scenario)
