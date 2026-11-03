"""End-to-end tests for the auth endpoints over the ASGI app.

Each test runs against a fresh in-memory database via `auth_client()`. Scenarios
are plain coroutines run with `asyncio.run`, matching the project's
no-pytest-asyncio convention.
"""

import asyncio
from collections.abc import Awaitable, Callable

import httpx

from tests.support import auth_client

CREDENTIALS = {"email": "alex@strem.app", "password": "Str0ng-Passphrase!"}


def run(scenario: Callable[[httpx.AsyncClient], Awaitable[None]]) -> None:
    async def _inner() -> None:
        async with auth_client() as client:
            await scenario(client)

    asyncio.run(_inner())


async def _register(client: httpx.AsyncClient, **overrides: object) -> httpx.Response:
    return await client.post("/v1/auth/register", json={**CREDENTIALS, **overrides})


def test_register_returns_identity_and_tokens() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        response = await _register(client, display_name="Alex")
        assert response.status_code == 201
        body = response.json()
        assert body["user"]["email"] == "alex@strem.app"
        assert body["user"]["display_name"] == "Alex"
        assert body["tokens"]["token_type"] == "bearer"
        assert body["tokens"]["expires_in"] == 900
        assert body["tokens"]["access_token"]
        assert body["tokens"]["refresh_token"].startswith("rt_")

    run(scenario)


def test_register_duplicate_email_conflicts() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        await _register(client)
        response = await _register(client)
        assert response.status_code == 409
        assert response.json()["code"] == "email_already_registered"

    run(scenario)


def test_register_short_password_is_validation_error() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        response = await _register(client, password="short")
        assert response.status_code == 400
        assert response.json()["code"] == "validation_error"

    run(scenario)


def test_login_succeeds_with_correct_password() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        await _register(client)
        response = await client.post("/v1/auth/login", json=CREDENTIALS)
        assert response.status_code == 200
        assert response.json()["tokens"]["access_token"]

    run(scenario)


def test_login_wrong_password_is_unauthorized() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        await _register(client)
        response = await client.post(
            "/v1/auth/login", json={**CREDENTIALS, "password": "wrong-password"}
        )
        assert response.status_code == 401
        assert response.json()["code"] == "invalid_credentials"

    run(scenario)


def test_login_unknown_email_is_unauthorized() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        response = await client.post("/v1/auth/login", json=CREDENTIALS)
        assert response.status_code == 401
        assert response.json()["code"] == "invalid_credentials"

    run(scenario)


def test_refresh_rotates_and_invalidates_old_token() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        registered = await _register(client)
        old_refresh = registered.json()["tokens"]["refresh_token"]
        rotated = await client.post("/v1/auth/refresh", json={"refresh_token": old_refresh})
        assert rotated.status_code == 200
        assert rotated.json()["refresh_token"].startswith("rt_")
        reuse = await client.post("/v1/auth/refresh", json={"refresh_token": old_refresh})
        assert reuse.status_code == 401
        assert reuse.json()["code"] == "invalid_refresh_token"

    run(scenario)


def test_refresh_invalid_token_is_unauthorized() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        response = await client.post("/v1/auth/refresh", json={"refresh_token": "rt_nope"})
        assert response.status_code == 401
        assert response.json()["code"] == "invalid_refresh_token"

    run(scenario)


def test_logout_revokes_refresh_token() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        registered = await _register(client)
        tokens = registered.json()["tokens"]
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        logout = await client.post(
            "/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]}, headers=headers
        )
        assert logout.status_code == 204
        reuse = await client.post(
            "/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
        )
        assert reuse.status_code == 401

    run(scenario)


def test_me_returns_identity_with_valid_token() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        registered = await _register(client, display_name="Alex")
        access = registered.json()["tokens"]["access_token"]
        response = await client.get("/v1/auth/me", headers={"Authorization": f"Bearer {access}"})
        assert response.status_code == 200
        body = response.json()
        assert body["email"] == "alex@strem.app"
        assert body["display_name"] == "Alex"

    run(scenario)


def test_me_without_token_is_unauthorized() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        response = await client.get("/v1/auth/me")
        assert response.status_code == 401
        assert response.json()["code"] == "unauthorized"

    run(scenario)


def test_me_with_malformed_token_is_unauthorized() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        response = await client.get(
            "/v1/auth/me", headers={"Authorization": "Bearer not-a-jwt"}
        )
        assert response.status_code == 401

    run(scenario)
