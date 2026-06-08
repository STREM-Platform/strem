"""Test harness: the gateway with a mocked upstream client (no live services).

`gateway_app(handler)` builds the ASGI app and sets `app.state.client` to an
httpx client backed by a `MockTransport`, so forwarded requests hit the handler
instead of real services. The handler can record requests for assertions.
"""

from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager

import httpx

from app.main import create_app


@asynccontextmanager
async def gateway_app(
    handler: Callable[[httpx.Request], httpx.Response],
) -> AsyncIterator[httpx.AsyncClient]:
    upstream_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    app = create_app()
    app.state.client = upstream_client

    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://gateway") as client:
            yield client
    finally:
        await upstream_client.aclose()
