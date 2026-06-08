"""Request forwarding (routing + auth handoff).

Forwards a `/v1` request to the resolved upstream service, passing the bearer
token and body through and returning the upstream response verbatim. Hop-by-hop
headers are stripped. The gateway adds no domain logic.
"""

from __future__ import annotations

from collections.abc import Mapping

import httpx

# Headers that must not be forwarded between connections.
_HOP_BY_HOP = {
    "host",
    "content-length",
    "connection",
    "keep-alive",
    "transfer-encoding",
    "upgrade",
}


def _forward_headers(headers: Mapping[str, str]) -> dict[str, str]:
    return {k: v for k, v in headers.items() if k.lower() not in _HOP_BY_HOP}


async def forward(
    client: httpx.AsyncClient,
    *,
    upstream_base: str,
    method: str,
    downstream_path: str,
    query_string: str,
    headers: Mapping[str, str],
    body: bytes,
) -> httpx.Response:
    """Forward one request to `<upstream_base>/<downstream_path>` and return the response."""
    url = f"{upstream_base.rstrip('/')}/{downstream_path.lstrip('/')}"
    if query_string:
        url = f"{url}?{query_string}"
    request = client.build_request(
        method,
        url,
        headers=_forward_headers(headers),
        content=body if body else None,
    )
    return await client.send(request)
