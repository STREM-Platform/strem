"""Real ASGI + database tests. All event/identity data here is synthetic."""

import asyncio
import copy
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from sqlalchemy import func, select

from app.race_missions import MissionReceipt, MissionRecord, MissionRevisionRecord
from tests.support import Harness, auth_header, user_app

PAYLOAD: dict[str, Any] = {
    "event": {
        "name": "Test Mountain 30",
        "race_date": "2027-06-12",
        "timezone": "Europe/Sofia",
        "location_name": "Borovets",
        "distance_km": 30,
        "elevation_gain_m": None,
        "cutoff_minutes": None,
    },
    "goal": {"outcome": "finish_confidently", "target_finish_minutes": None},
}


def run(scenario: Callable[[Harness], Awaitable[None]]) -> None:
    async def inner() -> None:
        async with user_app() as h:
            await scenario(h)

    asyncio.run(inner())


def headers(user: uuid.UUID, key: str = "create_test_key", version: int = 1) -> dict[str, str]:
    return {**auth_header(user), "Idempotency-Key": key, "If-Match": f'"{version}"'}


def test_create_reload_and_idempotent_conflicts() -> None:
    async def scenario(h: Harness) -> None:
        user = uuid.uuid4()
        empty = await h.client.get("/v1/race-missions/active", headers=headers(user))
        assert empty.status_code == 404 and empty.json()["code"] == "no_active_mission"
        first = await h.client.post("/v1/race-missions", headers=headers(user), json=PAYLOAD)
        assert first.status_code == 201, first.text
        assert first.headers["etag"] == '"1"'
        assert first.headers["cache-control"] == "no-store"
        assert first.json()["event"]["elevation_gain_m"] is None
        assert first.json()["source"] == "athlete_entry"
        loaded = await h.client.get("/v1/race-missions/active", headers=headers(user))
        assert loaded.json() == first.json()
        assert first.json()["event"]["sport"] == "trail_running"
        assert first.json()["event"]["format"] == "single_day"
        duplicate = await h.client.post("/v1/race-missions", headers=headers(user), json=PAYLOAD)
        assert duplicate.status_code == 201 and duplicate.json() == first.json()
        changed = copy.deepcopy(PAYLOAD)
        changed["event"]["name"] = "Different race"
        reused = await h.client.post("/v1/race-missions", headers=headers(user), json=changed)
        assert reused.status_code == 409 and reused.json()["code"] == "idempotency_key_reused"
        # A second race with a new key is allowed: athletes prepare for several races.
        changed["event"]["race_date"] = "2027-04-03"
        second = await h.client.post(
            "/v1/race-missions", headers=headers(user, "another_key"), json=changed
        )
        assert second.status_code == 201, second.text
        listed = await h.client.get("/v1/race-missions?state=active", headers=headers(user))
        assert [m["event"]["name"] for m in listed.json()["items"]] == [
            "Different race",
            "Test Mountain 30",
        ]
        # The focus mission is the nearest upcoming race.
        focus = await h.client.get("/v1/race-missions/active", headers=headers(user))
        assert focus.json()["id"] == second.json()["id"]
        async with h.sessionmaker() as session:
            assert await session.scalar(select(func.count()).select_from(MissionRecord)) == 2
            assert (
                await session.scalar(select(func.count()).select_from(MissionRevisionRecord)) == 2
            )

    run(scenario)


def test_edits_archive_replay_and_history() -> None:
    async def scenario(h: Harness) -> None:
        user = uuid.uuid4()
        first = await h.client.post("/v1/race-missions", headers=headers(user), json=PAYLOAD)
        path = f"/v1/race-missions/{first.json()['id']}"
        update = {
            "goal": {"outcome": "target_time", "target_finish_minutes": 330},
            "correction_reason": "Changed my priority",
        }
        edited = await h.client.patch(path, headers=headers(user), json=update)
        assert edited.status_code == 200 and edited.json()["version"] == 2
        stale = await h.client.patch(path, headers=headers(user), json=update)
        assert stale.status_code == 412
        archived = await h.client.post(
            f"{path}/archive",
            headers=headers(user, "archive_key", 2),
            json={"reason": "Changed event"},
        )
        assert archived.status_code == 200 and archived.json()["state"] == "archived"
        assert (
            await h.client.get("/v1/race-missions/active", headers=headers(user))
        ).status_code == 404
        replay = await h.client.post(
            f"{path}/archive",
            headers=headers(user, "archive_key", 2),
            json={"reason": "Changed event"},
        )
        assert replay.json() == archived.json()
        assert (await h.client.get(path, headers=headers(user))).json() == archived.json()
        immutable = await h.client.patch(path, headers=headers(user, version=3), json=update)
        assert immutable.status_code == 409
        new = await h.client.post(
            "/v1/race-missions", headers=headers(user, "new_mission_key"), json=PAYLOAD
        )
        assert new.status_code == 201
        original_replay = await h.client.post(
            "/v1/race-missions", headers=headers(user), json=PAYLOAD
        )
        assert original_replay.json() == first.json()
        active = await h.client.get("/v1/race-missions/active", headers=headers(user))
        assert active.json()["id"] == new.json()["id"]
        exported = await h.client.get("/v1/race-missions/data", headers=headers(user))
        assert len(exported.json()["missions"]) == 2
        assert len(exported.json()["revisions"]) == 4

    run(scenario)


def test_isolation_and_complete_mission_only_deletion() -> None:
    async def scenario(h: Harness) -> None:
        owner, other = uuid.uuid4(), uuid.uuid4()
        first = await h.client.post("/v1/race-missions", headers=headers(owner), json=PAYLOAD)
        theirs = await h.client.post("/v1/race-missions", headers=headers(other), json=PAYLOAD)
        path = f"/v1/race-missions/{first.json()['id']}"
        assert (await h.client.get(path, headers=headers(other))).status_code == 404
        assert (
            await h.client.patch(
                path,
                headers=headers(other),
                json={"goal": PAYLOAD["goal"], "correction_reason": "Not my race"},
            )
        ).status_code == 404
        assert (
            await h.client.post(
                f"{path}/archive",
                headers=headers(other, "archive_other"),
                json={"reason": "Not my race"},
            )
        ).status_code == 404
        denied = await h.client.request(
            "DELETE", "/v1/race-missions/data", headers=headers(owner), json={"confirmation": "yes"}
        )
        assert denied.status_code == 400
        deleted = await h.client.request(
            "DELETE",
            "/v1/race-missions/data",
            headers=headers(owner),
            json={"confirmation": "DELETE MY RACE MISSIONS"},
        )
        assert deleted.status_code == 204
        data = (await h.client.get("/v1/race-missions/data", headers=headers(owner))).json()
        assert data["missions"] == [] and data["revisions"] == []
        assert (await h.client.get("/v1/race-missions/active", headers=headers(other))).json()[
            "id"
        ] == theirs.json()["id"]
        async with h.sessionmaker() as session:
            assert (
                await session.scalar(
                    select(func.count())
                    .select_from(MissionReceipt)
                    .where(MissionReceipt.user_id == owner)
                )
                == 0
            )
            assert (
                await session.scalar(
                    select(func.count())
                    .select_from(MissionReceipt)
                    .where(MissionReceipt.user_id == other)
                )
                == 1
            )

    run(scenario)


@pytest.mark.parametrize(
    "field,value",
    [
        ("name", " "),
        ("race_date", "2027-02-30"),
        ("race_date", "2027-06-12T00:00:00Z"),
        ("race_date", 0),
        ("timezone", "Mars/Olympus"),
        ("distance_km", 0),
        ("distance_km", -1),
        ("distance_km", True),
        ("distance_km", "30"),
        ("cutoff_minutes", False),
        ("elevation_gain_m", -1),
        ("cutoff_minutes", 0),
        ("official_status", "verified_official"),
    ],
)
def test_invalid_event_is_not_persisted(field: str, value: object) -> None:
    async def scenario(h: Harness) -> None:
        payload = copy.deepcopy(PAYLOAD)
        payload["event"][field] = value
        res = await h.client.post("/v1/race-missions", headers=headers(uuid.uuid4()), json=payload)
        assert res.status_code == 400, res.text

    run(scenario)


def test_auth_validation_headers_and_owner_forgery() -> None:
    async def scenario(h: Harness) -> None:
        user = uuid.uuid4()
        for path in (
            "/v1/race-missions/active",
            "/v1/race-missions/data",
            f"/v1/race-missions/{uuid.uuid4()}",
        ):
            assert (await h.client.get(path)).status_code == 401
        assert (
            await h.client.post(
                "/v1/race-missions", headers={"Idempotency-Key": "key_12345"}, json=PAYLOAD
            )
        ).status_code == 401
        assert (
            await h.client.post("/v1/race-missions", headers=auth_header(user), json=PAYLOAD)
        ).status_code == 400
        forged = {**PAYLOAD, "user_id": str(uuid.uuid4())}
        assert (
            await h.client.post("/v1/race-missions", headers=headers(user), json=forged)
        ).status_code == 400
        first = await h.client.post("/v1/race-missions", headers=headers(user), json=PAYLOAD)
        path = f"/v1/race-missions/{first.json()['id']}"
        for change in (
            {"correction_reason": "Nothing changed"},
            {"event": None, "goal": PAYLOAD["goal"], "correction_reason": "Null is wrong"},
            {"goal": {"outcome": "target_time"}, "correction_reason": "Missing target"},
        ):
            assert (
                await h.client.patch(path, headers=headers(user), json=change)
            ).status_code == 400
        assert (
            await h.client.patch(
                path,
                headers={**headers(user), "If-Match": "1"},
                json={"goal": PAYLOAD["goal"], "correction_reason": "Bad header"},
            )
        ).status_code == 400

    run(scenario)


def test_checkpoints_are_stored_in_course_order_and_validated() -> None:
    async def scenario(h: Harness) -> None:
        auth = headers(uuid.uuid4())
        event = {
            **PAYLOAD["event"],
            "checkpoints": [
                {"name": "Hut", "km": 11.5, "services": ["water", "food"], "cutoff_minutes": 150},
                {
                    "name": "Pass",
                    "km": 21,
                    "services": ["water", "crew", "drop_bag"],
                    "cutoff_minutes": 330,
                },
            ],
        }
        created = await h.client.post(
            "/v1/race-missions", headers=auth, json={**PAYLOAD, "event": event}
        )
        assert created.status_code == 201, created.text
        stored = created.json()["event"]["checkpoints"]
        assert [c["name"] for c in stored] == ["Hut", "Pass"] and stored[1]["services"] == [
            "water",
            "crew",
            "drop_bag",
        ]
        for bad in (
            [{"name": "B", "km": 20}, {"name": "A", "km": 10}],  # out of order
            [{"name": "Far", "km": 45}],  # beyond the 30 km race
            [
                {"name": "A", "km": 10, "cutoff_minutes": 200},
                {"name": "B", "km": 20, "cutoff_minutes": 100},
            ],
            [{"name": "A", "km": 10, "services": ["helicopter"]}],
        ):
            rejected = await h.client.post(
                "/v1/race-missions",
                headers=auth,
                json={**PAYLOAD, "event": {**PAYLOAD["event"], "checkpoints": bad}},
            )
            assert rejected.status_code == 400, bad

    run(scenario)
