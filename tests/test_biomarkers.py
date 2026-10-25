"""Biomarker intake + trend tests (#63): consent + disclaimer gate, CRUD, trends.

The gate is the headline: without BOTH the current Medical Disclaimer accepted
and the 'biomarkers' source ON, every endpoint is a hard 403 — and revoking
consent closes access again.
"""

import asyncio
import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta

import httpx

from app.legal import DocumentType, required_version
from tests.support import Harness, auth_header, user_app

MEDICAL_VERSION = required_version(DocumentType.MEDICAL)


def run(scenario: Callable[[Harness], Awaitable[None]]) -> None:
    async def _inner() -> None:
        async with user_app() as harness:
            await scenario(harness)

    asyncio.run(_inner())


async def _unlock(harness: Harness, user: uuid.UUID) -> None:
    """Accept the Medical Disclaimer and turn the biomarkers source ON."""
    accept = await harness.client.post(
        "/v1/users/me/legal/accept",
        headers=auth_header(user),
        json={"acceptances": [{"document_type": "medical", "version": MEDICAL_VERSION}]},
    )
    assert accept.status_code == 200, accept.text
    consent = await harness.client.put(
        "/v1/users/me/agent-consent",
        headers=auth_header(user),
        json={"source_id": "biomarkers", "enabled": True},
    )
    assert consent.status_code == 200, consent.text


def _reading(marker: str, value: float, *, days_ago: int, unit: str = "ng/mL") -> dict[str, object]:
    taken = datetime.now(UTC) - timedelta(days=days_ago)
    return {"marker_type": marker, "value": value, "unit": unit, "taken_at": taken.isoformat()}


async def _post(harness: Harness, user: uuid.UUID, reading: dict[str, object]) -> httpx.Response:
    return await harness.client.post(
        "/v1/users/me/biomarkers", headers=auth_header(user), json=reading
    )


def test_blocked_without_disclaimer_and_consent() -> None:
    async def scenario(harness: Harness) -> None:
        user = uuid.uuid4()
        # Nothing accepted, source off -> blocked on both read and write.
        post = await _post(harness, user, _reading("ferritin", 40, days_ago=1))
        assert post.status_code == 403
        assert post.json()["code"] == "medical_disclaimer_required"

        get = await harness.client.get("/v1/users/me/biomarkers", headers=auth_header(user))
        assert get.status_code == 403

    run(scenario)


def test_consent_alone_is_not_enough() -> None:
    async def scenario(harness: Harness) -> None:
        user = uuid.uuid4()
        # Turn the source on but DON'T accept the disclaimer.
        await harness.client.put(
            "/v1/users/me/agent-consent",
            headers=auth_header(user),
            json={"source_id": "biomarkers", "enabled": True},
        )
        post = await _post(harness, user, _reading("ferritin", 40, days_ago=1))
        assert post.status_code == 403
        assert post.json()["code"] == "medical_disclaimer_required"

    run(scenario)


def test_disclaimer_alone_is_not_enough() -> None:
    async def scenario(harness: Harness) -> None:
        user = uuid.uuid4()
        await harness.client.post(
            "/v1/users/me/legal/accept",
            headers=auth_header(user),
            json={"acceptances": [{"document_type": "medical", "version": MEDICAL_VERSION}]},
        )
        post = await _post(harness, user, _reading("ferritin", 40, days_ago=1))
        assert post.status_code == 403
        assert post.json()["code"] == "biomarker_consent_required"

    run(scenario)


def test_create_list_and_trend_direction() -> None:
    async def scenario(harness: Harness) -> None:
        user = uuid.uuid4()
        await _unlock(harness, user)

        # Two ferritin readings (older then newer) + one vitamin D.
        await _post(harness, user, _reading("ferritin", 30, days_ago=40))
        await _post(harness, user, _reading("ferritin", 45, days_ago=2))
        await _post(harness, user, _reading("vitamin_d", 28, days_ago=2, unit="ng/mL"))

        listed = await harness.client.get("/v1/users/me/biomarkers", headers=auth_header(user))
        assert listed.status_code == 200, listed.text
        body = listed.json()
        assert len(body["items"]) == 3
        # Newest first.
        assert body["items"][0]["marker_type"] in ("ferritin", "vitamin_d")

        trends = {t["marker_type"]: t for t in body["trends"]}
        assert trends["ferritin"]["latest_value"] == 45
        assert trends["ferritin"]["direction"] == "rising"
        assert trends["ferritin"]["reading_count"] == 2
        assert trends["vitamin_d"]["direction"] == "single"

    run(scenario)


def test_revoking_consent_closes_access_again() -> None:
    async def scenario(harness: Harness) -> None:
        user = uuid.uuid4()
        await _unlock(harness, user)
        created = await _post(harness, user, _reading("hba1c", 5.2, days_ago=1, unit="%"))
        assert created.status_code == 201

        # Revoke the source -> read is blocked again (data is retained, just gated).
        await harness.client.put(
            "/v1/users/me/agent-consent",
            headers=auth_header(user),
            json={"source_id": "biomarkers", "enabled": False},
        )
        blocked = await harness.client.get("/v1/users/me/biomarkers", headers=auth_header(user))
        assert blocked.status_code == 403
        assert blocked.json()["code"] == "biomarker_consent_required"

    run(scenario)


def test_delete_removes_only_own_reading() -> None:
    async def scenario(harness: Harness) -> None:
        user = uuid.uuid4()
        await _unlock(harness, user)
        created = await _post(harness, user, _reading("ldl", 110, days_ago=1, unit="mg/dL"))
        biomarker_id = created.json()["id"]

        deleted = await harness.client.delete(
            f"/v1/users/me/biomarkers/{biomarker_id}", headers=auth_header(user)
        )
        assert deleted.status_code == 204

        # A second user (also unlocked) cannot delete a stranger's reading.
        other = uuid.uuid4()
        await _unlock(harness, other)
        missing = await harness.client.delete(
            f"/v1/users/me/biomarkers/{uuid.uuid4()}", headers=auth_header(other)
        )
        assert missing.status_code == 404

    run(scenario)
