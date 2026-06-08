"""Tests for routing and auth handoff."""

import asyncio
from collections.abc import Awaitable, Callable

import httpx

from tests.support import gateway_app

# Default local upstream bases (app/config.py defaults).
UPSTREAMS = {
    "auth": "http://localhost:8001/v1",
    "users": "http://localhost:8002/v1",
    "training": "http://localhost:8003/v1",
    "nutrition": "http://localhost:8004/v1",
    "tribes": "http://localhost:8005/v1",
    "ai": "http://localhost:8006/v1",
}


def _echo_handler(request: httpx.Request) -> httpx.Response:
    """Echo back the upstream URL and forwarded auth header."""
    return httpx.Response(
        200,
        json={"url": str(request.url), "auth": request.headers.get("authorization")},
    )


def run(scenario: Callable[[httpx.AsyncClient], Awaitable[None]]) -> None:
    async def _inner() -> None:
        async with gateway_app(_echo_handler) as client:
            await scenario(client)

    asyncio.run(_inner())


def test_routes_each_service_to_its_upstream() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        cases = {
            "/v1/auth/login": "http://localhost:8001/v1/auth/login",
            "/v1/users/me": "http://localhost:8002/v1/users/me",
            "/v1/training/sessions": "http://localhost:8003/v1/training/sessions",
            "/v1/nutrition/days": "http://localhost:8004/v1/nutrition/days",
            "/v1/tribes/me": "http://localhost:8005/v1/tribes/me",
            "/v1/ai/missions/active": "http://localhost:8006/v1/ai/missions/active",
        }
        for path, expected in cases.items():
            response = await client.get(path)
            assert response.status_code == 200, path
            assert response.json()["url"] == expected

    run(scenario)


def test_forwards_bearer_token() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        response = await client.get("/v1/users/me", headers={"Authorization": "Bearer abc.def.ghi"})
        assert response.json()["auth"] == "Bearer abc.def.ghi"

    run(scenario)


def test_forwards_query_string_and_method() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        response = await client.get("/v1/training/sessions?limit=5&session_type=running")
        assert response.json()["url"].endswith("/v1/training/sessions?limit=5&session_type=running")

    run(scenario)


def test_forwards_request_body() -> None:
    def capture(request: httpx.Request) -> httpx.Response:
        return httpx.Response(201, json={"received": request.content.decode()})

    async def scenario(client: httpx.AsyncClient) -> None:
        response = await client.post("/v1/auth/login", json={"email": "a@b.co", "password": "x"})
        assert response.status_code == 201
        assert "a@b.co" in response.json()["received"]

    async def _inner() -> None:
        async with gateway_app(capture) as client:
            await scenario(client)

    asyncio.run(_inner())


def test_unknown_prefix_is_404() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        response = await client.get("/v1/payments/charge")
        assert response.status_code == 404
        assert response.json()["code"] == "unknown_route"

    run(scenario)


def test_upstream_failure_is_502() -> None:
    def boom(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("upstream down", request=request)

    async def scenario(client: httpx.AsyncClient) -> None:
        response = await client.get("/v1/users/me")
        assert response.status_code == 502
        assert response.json()["code"] == "upstream_unavailable"

    async def _inner() -> None:
        async with gateway_app(boom) as client:
            await scenario(client)

    asyncio.run(_inner())
