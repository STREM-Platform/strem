"""The gateway originates (or accepts) X-Request-ID and forwards it upstream."""

import asyncio

import httpx

from tests.support import gateway_app


def test_request_id_is_originated_echoed_and_forwarded() -> None:
    captured: dict[str, str | None] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["upstream"] = request.headers.get("x-request-id")
        return httpx.Response(200, json={"ok": True})

    async def scenario() -> None:
        async with gateway_app(handler) as client:
            response = await client.get("/v1/users/me")
            echoed = response.headers.get("x-request-id")
            assert echoed  # minted and echoed on the response
            assert captured["upstream"] == echoed  # same id forwarded to the service

    asyncio.run(scenario())


def test_inbound_request_id_is_preserved() -> None:
    captured: dict[str, str | None] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["upstream"] = request.headers.get("x-request-id")
        return httpx.Response(200, json={"ok": True})

    async def scenario() -> None:
        async with gateway_app(handler) as client:
            response = await client.get("/v1/users/me", headers={"X-Request-ID": "trace-xyz"})
            assert response.headers["x-request-id"] == "trace-xyz"
            assert captured["upstream"] == "trace-xyz"

    asyncio.run(scenario())
