"""Tests for training session logging, listing, retrieval, and event publishing."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable

from tests.support import Harness, auth_header, training_app


def run(scenario: Callable[[Harness], Awaitable[None]]) -> None:
    async def _inner() -> None:
        async with training_app() as harness:
            await scenario(harness)

    asyncio.run(_inner())


def test_log_strength_session_persists_and_emits_event() -> None:
    async def scenario(harness: Harness) -> None:
        user_id = uuid.uuid4()
        response = await harness.client.post(
            "/v1/training/sessions",
            headers=auth_header(user_id),
            json={"session_type": "strength", "duration_minutes": 50, "notes": "Push day."},
        )
        assert response.status_code == 201
        body = response.json()
        assert body["session_type"] == "strength"
        assert body["duration_minutes"] == 50
        assert body["user_id"] == str(user_id)

        events = harness.publisher.of_type("training.session_logged")
        assert len(events) == 1
        assert events[0] == {
            "version": 1,
            "user_id": str(user_id),
            "session_type": "strength",
            "duration_minutes": 50,
            "logged_at": events[0]["logged_at"],
        }

    run(scenario)


def test_log_running_session_accepts_distance() -> None:
    async def scenario(harness: Harness) -> None:
        response = await harness.client.post(
            "/v1/training/sessions",
            headers=auth_header(uuid.uuid4()),
            json={"session_type": "running", "duration_minutes": 42, "distance_km": 8.2},
        )
        assert response.status_code == 201
        assert response.json()["distance_km"] == 8.2

    run(scenario)


def test_log_trail_run_with_elevation_persists() -> None:
    async def scenario(harness: Harness) -> None:
        response = await harness.client.post(
            "/v1/training/sessions",
            headers=auth_header(uuid.uuid4()),
            json={
                "session_type": "trail_running",
                "duration_minutes": 41,
                "distance_km": 8.2,
                "elevation_m": 320,
            },
        )
        assert response.status_code == 201
        body = response.json()
        assert body["session_type"] == "trail_running"
        assert body["distance_km"] == 8.2
        assert body["elevation_m"] == 320

    run(scenario)


def test_cycling_and_swimming_accept_distance() -> None:
    async def scenario(harness: Harness) -> None:
        for kind in ("cycling", "swimming"):
            res = await harness.client.post(
                "/v1/training/sessions",
                headers=auth_header(uuid.uuid4()),
                json={"session_type": kind, "duration_minutes": 30, "distance_km": 20.0},
            )
            assert res.status_code == 201, kind

    run(scenario)


def test_distance_on_non_running_is_unprocessable() -> None:
    async def scenario(harness: Harness) -> None:
        response = await harness.client.post(
            "/v1/training/sessions",
            headers=auth_header(uuid.uuid4()),
            json={"session_type": "strength", "duration_minutes": 30, "distance_km": 5.0},
        )
        assert response.status_code == 422
        assert response.json()["code"] == "unprocessable_entity"
        assert harness.publisher.of_type("training.session_logged") == []

    run(scenario)


def test_invalid_duration_is_validation_error() -> None:
    async def scenario(harness: Harness) -> None:
        response = await harness.client.post(
            "/v1/training/sessions",
            headers=auth_header(uuid.uuid4()),
            json={"session_type": "mobility", "duration_minutes": 0},
        )
        assert response.status_code == 400
        assert response.json()["code"] == "validation_error"

    run(scenario)


def test_list_sessions_paginated_and_filtered() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        await harness.client.post(
            "/v1/training/sessions",
            headers=headers,
            json={"session_type": "strength", "duration_minutes": 50},
        )
        await harness.client.post(
            "/v1/training/sessions",
            headers=headers,
            json={"session_type": "running", "duration_minutes": 30, "distance_km": 5.0},
        )

        all_sessions = await harness.client.get("/v1/training/sessions", headers=headers)
        assert all_sessions.json()["pagination"]["total"] == 2

        running_only = await harness.client.get(
            "/v1/training/sessions?session_type=running", headers=headers
        )
        body = running_only.json()
        assert body["pagination"]["total"] == 1
        assert body["items"][0]["session_type"] == "running"

    run(scenario)


def test_get_session_by_id_and_not_found() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        created = await harness.client.post(
            "/v1/training/sessions",
            headers=headers,
            json={"session_type": "mobility", "duration_minutes": 20},
        )
        session_id = created.json()["id"]

        found = await harness.client.get(f"/v1/training/sessions/{session_id}", headers=headers)
        assert found.status_code == 200
        assert found.json()["id"] == session_id

        missing = await harness.client.get(
            f"/v1/training/sessions/{uuid.uuid4()}", headers=headers
        )
        assert missing.status_code == 404
        assert missing.json()["code"] == "session_not_found"

    run(scenario)


def test_other_users_session_is_not_visible() -> None:
    async def scenario(harness: Harness) -> None:
        owner = auth_header(uuid.uuid4())
        created = await harness.client.post(
            "/v1/training/sessions",
            headers=owner,
            json={"session_type": "strength", "duration_minutes": 40},
        )
        session_id = created.json()["id"]

        other = auth_header(uuid.uuid4())
        response = await harness.client.get(f"/v1/training/sessions/{session_id}", headers=other)
        assert response.status_code == 404

    run(scenario)


def test_endpoints_require_auth() -> None:
    async def scenario(harness: Harness) -> None:
        assert (await harness.client.get("/v1/training/sessions")).status_code == 401
        post = await harness.client.post(
            "/v1/training/sessions",
            json={"session_type": "strength", "duration_minutes": 30},
        )
        assert post.status_code == 401

    run(scenario)
