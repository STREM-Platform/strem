"""Edge hardening: rate limiting, request-size cap, and security headers."""

import asyncio
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

import httpx

from app.main import create_app
from app.ratelimit import InMemoryRateLimiter, RateLimiter


def _ok(_: httpx.Request) -> httpx.Response:
    return httpx.Response(200, json={"ok": True})


@asynccontextmanager
async def gateway_client(
    *, limiter: RateLimiter | None = None, max_bytes: int | None = None
) -> AsyncIterator[httpx.AsyncClient]:
    upstream = httpx.AsyncClient(transport=httpx.MockTransport(_ok))
    app = create_app()
    app.state.client = upstream
    if limiter is not None:
        app.state.rate_limiter = limiter
    if max_bytes is not None:
        app.state.max_request_bytes = max_bytes

    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://gateway") as client:
            yield client
    finally:
        await upstream.aclose()


def run(scenario: Callable[[httpx.AsyncClient], Awaitable[None]], **kwargs: object) -> None:
    async def _inner() -> None:
        async with gateway_client(**kwargs) as client:  # type: ignore[arg-type]
            await scenario(client)

    asyncio.run(_inner())


def test_security_headers_on_every_response() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        response = await client.get("/v1/users/me")
        assert response.status_code == 200
        assert response.headers["x-content-type-options"] == "nosniff"
        assert response.headers["x-frame-options"] == "DENY"
        assert response.headers["referrer-policy"] == "no-referrer"

    run(scenario)


def test_payload_too_large_returns_413() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        response = await client.post("/v1/training/sessions", content=b"x" * 64)
        assert response.status_code == 413
        assert response.json()["code"] == "payload_too_large"

    run(scenario, max_bytes=16)


def test_rate_limit_returns_429_with_retry_after() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        assert (await client.get("/v1/users/me")).status_code == 200
        limited = await client.get("/v1/users/me")
        assert limited.status_code == 429
        assert limited.json()["code"] == "rate_limited"
        assert int(limited.headers["retry-after"]) >= 1

    run(scenario, limiter=InMemoryRateLimiter(limit=1, window_seconds=60))


def test_health_is_exempt_from_rate_limiting() -> None:
    async def scenario(client: httpx.AsyncClient) -> None:
        for _ in range(5):
            assert (await client.get("/health")).status_code == 200

    run(scenario, limiter=InMemoryRateLimiter(limit=1, window_seconds=60))


def test_in_memory_limiter_counts_per_key() -> None:
    async def scenario() -> None:
        limiter = InMemoryRateLimiter(limit=2, window_seconds=60)
        assert (await limiter.hit("a")).allowed
        assert (await limiter.hit("a")).allowed
        assert not (await limiter.hit("a")).allowed
        # A different scope has its own budget.
        assert (await limiter.hit("b")).allowed

    asyncio.run(scenario())
