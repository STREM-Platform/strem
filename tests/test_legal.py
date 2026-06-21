"""Tests for legal & policy acceptance (issue #58): status, recording, versioning,
re-acceptance, per-user isolation, and auth."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from app.legal import REQUIRED_VERSIONS, DocumentType, is_valid_version_format
from tests.support import Harness, auth_header, user_app

TERMS_V = REQUIRED_VERSIONS[DocumentType.TERMS]
PRIVACY_V = REQUIRED_VERSIONS[DocumentType.PRIVACY]
MEDICAL_V = REQUIRED_VERSIONS[DocumentType.MEDICAL]


def run(scenario: Callable[[Harness], Awaitable[None]]) -> None:
    async def _inner() -> None:
        async with user_app() as harness:
            await scenario(harness)

    asyncio.run(_inner())


def _by_type(body: Any) -> dict[str, dict[str, Any]]:
    return {doc["document_type"]: doc for doc in body["documents"]}


def test_required_versions_are_well_formed_dates() -> None:
    # The registry must hold valid YYYY-MM-DD version strings, matching the
    # `Version:` headers in strem-docs/legal.
    assert set(REQUIRED_VERSIONS) == set(DocumentType)
    for version in REQUIRED_VERSIONS.values():
        assert is_valid_version_format(version)


def test_status_for_new_user_needs_all() -> None:
    async def scenario(harness: Harness) -> None:
        res = await harness.client.get("/v1/users/me/legal", headers=auth_header(uuid.uuid4()))
        assert res.status_code == 200
        body = res.json()
        assert body["needs_acceptance"] is True
        docs = _by_type(body)
        assert set(docs) == {"terms", "privacy", "medical"}
        for doc in docs.values():
            assert doc["accepted_version"] is None
            assert doc["needs_acceptance"] is True
        assert docs["terms"]["required_version"] == TERMS_V

    run(scenario)


def test_accept_all_clears_needs_acceptance() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        res = await harness.client.post(
            "/v1/users/me/legal/accept",
            headers=headers,
            json={
                "acceptances": [
                    {"document_type": "terms", "version": TERMS_V},
                    {"document_type": "privacy", "version": PRIVACY_V},
                    {"document_type": "medical", "version": MEDICAL_V},
                ]
            },
        )
        assert res.status_code == 200
        body = res.json()
        assert body["needs_acceptance"] is False
        docs = _by_type(body)
        assert docs["terms"]["accepted_version"] == TERMS_V
        assert all(not d["needs_acceptance"] for d in docs.values())

        # Survives a fresh read.
        again = await harness.client.get("/v1/users/me/legal", headers=headers)
        assert again.json()["needs_acceptance"] is False

    run(scenario)


def test_partial_acceptance_still_needs_the_rest() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        res = await harness.client.post(
            "/v1/users/me/legal/accept",
            headers=headers,
            json={"acceptances": [{"document_type": "terms", "version": TERMS_V}]},
        )
        assert res.status_code == 200
        docs = _by_type(res.json())
        assert docs["terms"]["needs_acceptance"] is False
        assert docs["privacy"]["needs_acceptance"] is True
        assert res.json()["needs_acceptance"] is True

    run(scenario)


def test_wrong_version_is_rejected() -> None:
    async def scenario(harness: Harness) -> None:
        res = await harness.client.post(
            "/v1/users/me/legal/accept",
            headers=auth_header(uuid.uuid4()),
            json={"acceptances": [{"document_type": "terms", "version": "1999-01-01"}]},
        )
        assert res.status_code == 400
        assert res.json()["code"] == "validation_error"

    run(scenario)


def test_unknown_document_type_is_rejected() -> None:
    async def scenario(harness: Harness) -> None:
        res = await harness.client.post(
            "/v1/users/me/legal/accept",
            headers=auth_header(uuid.uuid4()),
            json={"acceptances": [{"document_type": "cookies", "version": TERMS_V}]},
        )
        assert res.status_code == 400
        assert res.json()["code"] == "validation_error"

    run(scenario)


def test_empty_acceptances_is_rejected() -> None:
    async def scenario(harness: Harness) -> None:
        res = await harness.client.post(
            "/v1/users/me/legal/accept",
            headers=auth_header(uuid.uuid4()),
            json={"acceptances": []},
        )
        assert res.status_code == 400
        assert res.json()["code"] == "validation_error"

    run(scenario)


def test_reaccepting_same_version_is_idempotent_for_status() -> None:
    async def scenario(harness: Harness) -> None:
        headers = auth_header(uuid.uuid4())
        body = {"acceptances": [{"document_type": "medical", "version": MEDICAL_V}]}
        first = await harness.client.post(
            "/v1/users/me/legal/accept", headers=headers, json=body
        )
        second = await harness.client.post(
            "/v1/users/me/legal/accept", headers=headers, json=body
        )
        assert first.status_code == 200
        assert second.status_code == 200
        # Status reflects the latest accepted version either way.
        docs = _by_type(second.json())
        assert docs["medical"]["accepted_version"] == MEDICAL_V
        assert docs["medical"]["needs_acceptance"] is False

    run(scenario)


def test_acceptance_is_per_user() -> None:
    async def scenario(harness: Harness) -> None:
        alice = auth_header(uuid.uuid4())
        bob = auth_header(uuid.uuid4())
        await harness.client.post(
            "/v1/users/me/legal/accept",
            headers=alice,
            json={"acceptances": [{"document_type": "terms", "version": TERMS_V}]},
        )
        bob_view = await harness.client.get("/v1/users/me/legal", headers=bob)
        docs = _by_type(bob_view.json())
        assert docs["terms"]["accepted_version"] is None
        assert docs["terms"]["needs_acceptance"] is True

    run(scenario)


def test_legal_endpoints_require_auth() -> None:
    async def scenario(harness: Harness) -> None:
        assert (await harness.client.get("/v1/users/me/legal")).status_code == 401
        assert (
            await harness.client.post(
                "/v1/users/me/legal/accept",
                json={"acceptances": [{"document_type": "terms", "version": TERMS_V}]},
            )
        ).status_code == 401

    run(scenario)
