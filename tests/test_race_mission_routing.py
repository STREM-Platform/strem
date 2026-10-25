"""Opaque forwarding of the approved Race Mission foundation contract."""

import asyncio

import httpx

from tests.support import gateway_app


def test_preserves_concurrency_idempotency_and_private_response_headers() -> None:
    def upstream(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/race-missions/mission-id/archive"
        assert request.method == "POST"
        assert request.headers["authorization"] == "Bearer test"
        assert request.headers["if-match"] == '"3"'
        assert request.headers["idempotency-key"] == "stable_retry_key"
        assert request.content == b'{"reason":"Different event"}'
        return httpx.Response(
            200, json={"state": "archived"}, headers={"ETag": '"4"', "Cache-Control": "no-store"}
        )

    async def scenario() -> None:
        async with gateway_app(upstream) as client:
            result = await client.post(
                "/v1/race-missions/mission-id/archive",
                headers={
                    "Authorization": "Bearer test",
                    "If-Match": '"3"',
                    "Idempotency-Key": "stable_retry_key",
                },
                json={"reason": "Different event"},
            )
            assert result.status_code == 200
            assert result.headers["etag"] == '"4"'
            assert result.headers["cache-control"] == "no-store"

    asyncio.run(scenario())
