"""Tests for the Athlete Baseline profile (issue #61): empty state, partial
upsert, structured PRs/injuries, clearing, validation, isolation, and auth."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable

from tests.support import Harness, auth_header, user_app

PATH = "/v1/users/me/athlete-profile"


def run(scenario: Callable[[Harness], Awaitable[None]]) -> None:
    async def _inner() -> None:
        async with user_app() as harness:
            await scenario(harness)

    asyncio.run(_inner())


def test_new_user_has_empty_unstarted_profile() -> None:
    async def scenario(harness: Harness) -> None:
        res = await harness.client.get(PATH, headers=auth_header(uuid.uuid4()))
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["is_started"] is False
        assert body["height_cm"] is None
        assert body["personal_records"] == []
        assert body["injuries"] == []
        assert body["dietary_constraints"] == []

    run(scenario)


def test_put_persists_and_marks_started() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        res = await harness.client.put(
            PATH,
            headers=headers,
            json={
                "height_cm": 180,
                "weight_kg": 82.5,
                "age_band": "30_39",
                "biological_sex": "male",
                "years_training": 6,
                "equipment_access": "home_gym",
                "personal_records": [
                    {"exercise": "Back Squat", "weight_kg": 140, "reps": 1},
                    {"exercise": "5k run", "time": "21:30"},
                ],
                "injuries": [{"area": "left knee", "note": "flares on lunges"}],
                "dietary_constraints": ["dairy-free"],
            },
        )
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["is_started"] is True
        assert body["height_cm"] == 180
        assert body["weight_kg"] == 82.5
        assert body["age_band"] == "30_39"
        assert len(body["personal_records"]) == 2
        assert body["personal_records"][0]["exercise"] == "Back Squat"
        assert body["injuries"][0]["area"] == "left knee"
        assert body["dietary_constraints"] == ["dairy-free"]

        # Persisted: a fresh GET returns the same.
        got = (await harness.client.get(PATH, headers=headers)).json()
        assert got["years_training"] == 6
        assert got["equipment_access"] == "home_gym"

    run(scenario)


def test_partial_update_leaves_other_fields_untouched() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        await harness.client.put(
            PATH, headers=headers, json={"height_cm": 175, "years_training": 4}
        )
        # A second PUT touching only weight must not wipe height/years.
        res = await harness.client.put(PATH, headers=headers, json={"weight_kg": 70})
        body = res.json()
        assert body["height_cm"] == 175
        assert body["years_training"] == 4
        assert body["weight_kg"] == 70

    run(scenario)


def test_explicit_null_clears_a_field() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        await harness.client.put(PATH, headers=headers, json={"height_cm": 175})
        res = await harness.client.put(PATH, headers=headers, json={"height_cm": None})
        assert res.json()["height_cm"] is None

    run(scenario)


def test_invalid_values_are_rejected() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        bad_enum = await harness.client.put(PATH, headers=headers, json={"age_band": "ancient"})
        assert bad_enum.status_code == 400
        out_of_range = await harness.client.put(PATH, headers=headers, json={"height_cm": 5})
        assert out_of_range.status_code == 400

    run(scenario)


def test_profiles_are_per_user() -> None:
    async def scenario(harness: Harness) -> None:
        a = auth_header(uuid.uuid4())
        b = auth_header(uuid.uuid4())
        await harness.client.put(PATH, headers=a, json={"height_cm": 190})
        b_body = (await harness.client.get(PATH, headers=b)).json()
        assert b_body["height_cm"] is None
        assert b_body["is_started"] is False

    run(scenario)


def test_auth_required() -> None:
    async def scenario(harness: Harness) -> None:
        assert (await harness.client.get(PATH)).status_code == 401
        assert (await harness.client.put(PATH, json={"height_cm": 180})).status_code == 401

    run(scenario)
