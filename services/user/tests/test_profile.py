"""Tests for the profile endpoints (`/v1/users/me`)."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable

import httpx

from tests.support import auth_header, user_client


def run(scenario: Callable[[httpx.AsyncClient], Awaitable[None]]) -> None:
    async def _inner() -> None:
        async with user_client() as client:
            await scenario(client)

    asyncio.run(_inner())


def test_get_me_creates_default_profile() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        user_id = uuid.uuid4()
        response = await client.get("/v1/users/me", headers=auth_header(user_id))
        assert response.status_code == 200
        body = response.json()
        assert body["user_id"] == str(user_id)
        assert body["display_name"] == "alex"  # email local-part fallback
        assert body["onboarding_completed"] is False
        assert "total_xp" not in body and "rank" not in body  # game state retired (docs#28)

    run(scenario)


def test_get_me_requires_auth() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        response = await client.get("/v1/users/me")
        assert response.status_code == 401
        assert response.json()["code"] == "unauthorized"

    run(scenario)


def test_patch_me_updates_editable_fields() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        user_id = uuid.uuid4()
        headers = auth_header(user_id)
        response = await client.patch(
            "/v1/users/me",
            headers=headers,
            json={
                "display_name": "Alex R.",
                "identity_statement": "I am becoming a hybrid athlete.",
                "transformation_goal": "hybrid_athlete",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["display_name"] == "Alex R."
        assert body["identity_statement"] == "I am becoming a hybrid athlete."
        assert body["transformation_goal"] == "hybrid_athlete"

    run(scenario)


def test_patch_me_empty_body_is_validation_error() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        response = await client.patch("/v1/users/me", headers=auth_header(uuid.uuid4()), json={})
        assert response.status_code == 400
        assert response.json()["code"] == "validation_error"

    run(scenario)


def test_patch_me_invalid_goal_is_validation_error() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        response = await client.patch(
            "/v1/users/me",
            headers=auth_header(uuid.uuid4()),
            json={"transformation_goal": "not_a_real_goal"},
        )
        assert response.status_code == 400

    run(scenario)
