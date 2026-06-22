"""Tests for the batch display-name lookup (#72): names only, auth, robustness."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable

from tests.support import Harness, auth_header, user_app


def run(scenario: Callable[[Harness], Awaitable[None]]) -> None:
    async def _inner() -> None:
        async with user_app() as harness:
            await scenario(harness)

    asyncio.run(_inner())


def test_batch_returns_display_names() -> None:
    async def scenario(harness: Harness) -> None:
        a, b = uuid.uuid4(), uuid.uuid4()
        await harness.client.patch(
            "/v1/users/me", headers=auth_header(a), json={"display_name": "Alex"}
        )
        await harness.client.patch(
            "/v1/users/me", headers=auth_header(b), json={"display_name": "Maria"}
        )
        res = await harness.client.get(f"/v1/users/batch?ids={a},{b}", headers=auth_header(a))
        assert res.status_code == 200, res.text
        names = {i["user_id"]: i["display_name"] for i in res.json()["items"]}
        assert names[str(a)] == "Alex"
        assert names[str(b)] == "Maria"

    run(scenario)


def test_batch_skips_unknown_and_invalid_ids() -> None:
    async def scenario(harness: Harness) -> None:
        caller, unknown = uuid.uuid4(), uuid.uuid4()
        res = await harness.client.get(
            f"/v1/users/batch?ids={unknown},not-a-uuid,", headers=auth_header(caller)
        )
        assert res.status_code == 200
        ids = {i["user_id"] for i in res.json()["items"]}
        assert str(unknown) not in ids  # no profile yet -> omitted, not fabricated

    run(scenario)


def test_batch_requires_auth() -> None:
    async def scenario(harness: Harness) -> None:
        assert (await harness.client.get("/v1/users/batch?ids=x")).status_code == 401

    run(scenario)
