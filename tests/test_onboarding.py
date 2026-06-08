"""Tests for onboarding persistence, completion, and resume."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable

import httpx

from tests.support import auth_header, user_client

FULL_ONBOARDING = {
    "identity_statement": "I am becoming someone who trains with discipline.",
    "transformation_goal": "hybrid_athlete",
    "training_level": "intermediate",
    "preferred_modalities": ["strength", "running"],
    "weekly_target_days": 4,
    "nutrition_preference": "general_consistency",
    "tribe_preference": "join_later",
    "display_name": "Alex",
    "timezone": "Europe/Sofia",
    "screen": "launch",
}


def run(scenario: Callable[[httpx.AsyncClient], Awaitable[None]]) -> None:
    async def _inner() -> None:
        async with user_client() as client:
            await scenario(client)

    asyncio.run(_inner())


def test_status_starts_not_started() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        response = await client.get(
            "/v1/users/onboarding/status", headers=auth_header(uuid.uuid4())
        )
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "not_started"
        assert body["completed"] is False
        assert body["last_completed_screen"] is None

    run(scenario)


def test_full_submission_completes_onboarding() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        headers = auth_header(uuid.uuid4())
        response = await client.post("/v1/users/onboarding", headers=headers, json=FULL_ONBOARDING)
        assert response.status_code == 201
        body = response.json()
        assert body["status"] == "completed"
        assert body["completed"] is True
        assert body["last_completed_screen"] == "launch"
        assert body["completed_at"] is not None

    run(scenario)


def test_partial_submission_is_in_progress_and_tracks_resume_point() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        headers = auth_header(uuid.uuid4())
        # identity screen only
        response = await client.post(
            "/v1/users/onboarding",
            headers=headers,
            json={
                "identity_statement": "I am becoming disciplined.",
                "transformation_goal": "build_discipline",
                "screen": "identity",
            },
        )
        assert response.status_code == 201
        body = response.json()
        assert body["status"] == "in_progress"
        assert body["completed"] is False
        assert body["last_completed_screen"] == "identity"

    run(scenario)


def test_per_screen_persistence_resumes_and_completes() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        headers = auth_header(uuid.uuid4())
        await client.post(
            "/v1/users/onboarding",
            headers=headers,
            json={
                "identity_statement": "I am becoming disciplined.",
                "transformation_goal": "build_discipline",
                "screen": "identity",
            },
        )
        await client.post(
            "/v1/users/onboarding",
            headers=headers,
            json={"training_level": "beginner", "screen": "training-background"},
        )
        # abandoned here — status should report the resume point
        status = await client.get("/v1/users/onboarding/status", headers=headers)
        assert status.json()["status"] == "in_progress"
        assert status.json()["last_completed_screen"] == "training-background"

        # resume: commitment, then launch (with timezone) completes it
        await client.post(
            "/v1/users/onboarding",
            headers=headers,
            json={"weekly_target_days": 3, "screen": "commitment"},
        )
        final = await client.post(
            "/v1/users/onboarding",
            headers=headers,
            json={"timezone": "Europe/Sofia", "screen": "launch"},
        )
        assert final.json()["status"] == "completed"
        assert final.json()["last_completed_screen"] == "launch"

    run(scenario)


def test_completed_onboarding_reflects_in_profile() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        headers = auth_header(uuid.uuid4())
        await client.post("/v1/users/onboarding", headers=headers, json=FULL_ONBOARDING)
        profile = await client.get("/v1/users/me", headers=headers)
        body = profile.json()
        assert body["onboarding_completed"] is True
        assert body["display_name"] == "Alex"
        assert body["transformation_goal"] == "hybrid_athlete"
        assert body["weekly_target_days"] == 4

    run(scenario)


def test_invalid_weekly_target_is_validation_error() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        response = await client.post(
            "/v1/users/onboarding",
            headers=auth_header(uuid.uuid4()),
            json={"weekly_target_days": 1, "screen": "commitment"},
        )
        assert response.status_code == 400
        assert response.json()["code"] == "validation_error"

    run(scenario)


def test_onboarding_requires_auth() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        response = await client.post("/v1/users/onboarding", json=FULL_ONBOARDING)
        assert response.status_code == 401

    run(scenario)
