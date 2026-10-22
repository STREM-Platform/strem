import asyncio
from collections.abc import AsyncIterator

import httpx

from tests.support import gateway_app


def test_course_upload_limit_and_streaming_body_enforcement() -> None:
    async def scenario() -> None:
        def echo(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200, json={"size": len(request.content), "match": request.headers.get("if-match")}
            )

        async with gateway_app(echo) as client:
            path = "/v1/training/missions/00000000-0000-0000-0000-000000000001/course"
            # Course bodies have room for the 4 MiB file's base64 envelope.
            ok = await client.put(path, content=b"a" * 1_100_000, headers={"If-Match": '"0"'})
            assert ok.status_code == 200 and ok.json()["size"] == 1_100_000
            assert ok.json()["match"] == '"0"'

            async def oversized() -> AsyncIterator[bytes]:
                for _ in range(7):
                    yield b"a" * 1_048_576

            assert (await client.put(path, content=oversized())).status_code == 413
            # Streaming ordinary routes must still respect the smaller standard limit.
            assert (await client.post("/v1/auth/login", content=oversized())).status_code == 413
            assert (await client.post("/v1/internal/race-course-data/purge")).status_code == 404

    asyncio.run(scenario())
