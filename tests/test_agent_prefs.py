"""Tests for Forge consent and autonomy (A7): defaults, persistence, and auth."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from app.agent_prefs import DEFAULT_AUTONOMY, SOURCE_CATALOG
from tests.support import Harness, auth_header, user_app


def run(scenario: Callable[[Harness], Awaitable[None]]) -> None:
    async def _inner() -> None:
        async with user_app() as harness:
            await scenario(harness)

    asyncio.run(_inner())


def _all_items(body: Any) -> dict[str, bool]:
    return {item["id"]: item["on"] for group in body["groups"] for item in group["items"]}


def test_consent_defaults_match_catalog() -> None:
    async def scenario(harness: Harness) -> None:
        res = await harness.client.get(
            "/v1/users/me/agent-consent", headers=auth_header(uuid.uuid4())
        )
        assert res.status_code == 200
        body = res.json()
        assert [g["label"] for g in body["groups"]] == ["Recovery", "Training", "Fuel", "Memory"]
        items = _all_items(body)
        assert items == {s.id: s.default_on for s in SOURCE_CATALOG}
        # Hydration ships off by default; everything else on.
        assert items["hydration"] is False
        assert items["whoop"] is True

    run(scenario)


def test_consent_toggle_persists() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        put = await harness.client.put(
            "/v1/users/me/agent-consent",
            headers=headers,
            json={"source_id": "hydration", "enabled": True},
        )
        assert put.status_code == 200
        assert _all_items(put.json())["hydration"] is True

        # The toggle survives a fresh read.
        again = await harness.client.get("/v1/users/me/agent-consent", headers=headers)
        assert _all_items(again.json())["hydration"] is True

        off = await harness.client.put(
            "/v1/users/me/agent-consent",
            headers=headers,
            json={"source_id": "whoop", "enabled": False},
        )
        assert _all_items(off.json())["whoop"] is False

    run(scenario)


def test_consent_unknown_source_is_validation_error() -> None:
    async def scenario(harness: Harness) -> None:
        res = await harness.client.put(
            "/v1/users/me/agent-consent",
            headers=auth_header(uuid.uuid4()),
            json={"source_id": "telepathy", "enabled": True},
        )
        assert res.status_code == 400
        assert res.json()["code"] == "validation_error"

    run(scenario)


def test_autonomy_defaults_match_registry() -> None:
    async def scenario(harness: Harness) -> None:
        res = await harness.client.get(
            "/v1/users/me/agent-autonomy", headers=auth_header(uuid.uuid4())
        )
        assert res.status_code == 200
        body = res.json()
        assert body == {cap.value: level.value for cap, level in DEFAULT_AUTONOMY.items()}
        assert body["updateReadiness"] == "auto"
        assert body["rescheduleWeek"] == "ask"

    run(scenario)


def test_autonomy_update_persists() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        put = await harness.client.put(
            "/v1/users/me/agent-autonomy",
            headers=headers,
            json={"capability": "rescheduleWeek", "level": "off"},
        )
        assert put.status_code == 200
        assert put.json()["rescheduleWeek"] == "off"

        again = await harness.client.get("/v1/users/me/agent-autonomy", headers=headers)
        assert again.json()["rescheduleWeek"] == "off"
        # Other capabilities keep their defaults.
        assert again.json()["updateReadiness"] == "auto"

    run(scenario)


def test_autonomy_rejects_unknown_capability_and_level() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        bad_cap = await harness.client.put(
            "/v1/users/me/agent-autonomy",
            headers=headers,
            json={"capability": "mindControl", "level": "auto"},
        )
        assert bad_cap.status_code == 400
        assert bad_cap.json()["code"] == "validation_error"
        bad_level = await harness.client.put(
            "/v1/users/me/agent-autonomy",
            headers=headers,
            json={"capability": "updateReadiness", "level": "always"},
        )
        assert bad_level.status_code == 400

    run(scenario)


def test_settings_are_per_user() -> None:
    async def scenario(harness: Harness) -> None:
        alice = auth_header(uuid.uuid4())
        bob = auth_header(uuid.uuid4())
        await harness.client.put(
            "/v1/users/me/agent-consent",
            headers=alice,
            json={"source_id": "hydration", "enabled": True},
        )
        bob_view = await harness.client.get("/v1/users/me/agent-consent", headers=bob)
        assert _all_items(bob_view.json())["hydration"] is False

    run(scenario)


def test_agent_settings_require_auth() -> None:
    async def scenario(harness: Harness) -> None:
        assert (await harness.client.get("/v1/users/me/agent-consent")).status_code == 401
        assert (await harness.client.get("/v1/users/me/agent-autonomy")).status_code == 401

    run(scenario)
