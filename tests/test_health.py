"""Health endpoint test driven through httpx.AsyncClient over the ASGI app."""

import asyncio

import httpx

from app.main import create_app


def test_health_returns_ok() -> None:
    async def _call() -> httpx.Response:
        transport = httpx.ASGITransport(app=create_app())
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.get("/health")

    response = asyncio.run(_call())

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "strem-ai-orchestrator"}
