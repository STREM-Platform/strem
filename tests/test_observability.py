"""Request-ID correlation: the gateway's id is echoed; one is minted otherwise."""

import asyncio

import httpx

from app.main import create_app


def _health(headers: dict[str, str] | None = None) -> httpx.Response:
    async def _call() -> httpx.Response:
        transport = httpx.ASGITransport(app=create_app())
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.get("/health", headers=headers or {})

    return asyncio.run(_call())


def test_request_id_is_minted_when_absent() -> None:
    response = _health()
    assert response.status_code == 200
    assert response.headers.get("x-request-id")


def test_incoming_request_id_is_echoed() -> None:
    response = _health({"X-Request-ID": "trace-abc-123"})
    assert response.headers["x-request-id"] == "trace-abc-123"
