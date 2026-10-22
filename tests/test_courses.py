import asyncio
import base64
import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from anyio import CapacityLimiter
from fastapi import Request

from app import courses as store
from app.deps import CurrentUserDep
from app.errors import AppError
from app.routers.courses import mission_access
from tests.support import TEST_SETTINGS, auth_header, training_app

GPX = b"""<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">
<trk><trkseg><trkpt lat="0" lon="0"><ele>100</ele></trkpt>
<trkpt lat="0" lon="0.001"><ele>110</ele></trkpt></trkseg></trk></gpx>"""
UPLOAD = {"content_base64": base64.b64encode(GPX).decode(), "source_url": None}


def cleanup_token(owner: uuid.UUID, generation: int) -> str:
    return jwt.encode(
        {
            "sub": str(owner),
            "generation": generation,
            "purpose": "purge_race_courses",
            "aud": "strem-course-cleanup",
            "exp": datetime.now(UTC) + timedelta(minutes=1),
        },
        TEST_SETTINGS.jwt_secret,
        algorithm="HS256",
    )


def test_upload_reload_retry_replace_export_ownership_and_cleanup() -> None:
    async def scenario() -> None:
        async with training_app() as h:
            owner, mission = uuid.uuid4(), uuid.uuid4()

            async def allowed(current: CurrentUserDep, request: Request) -> dict[str, object]:
                if current.user_id != owner or request.path_params["mission_id"] != str(mission):
                    raise AppError(404, "mission_not_found", "Not found")
                return {"generation": 0, "state": "active"}

            h.app.dependency_overrides[mission_access] = allowed
            path = f"/v1/training/missions/{mission}/course"
            headers = {**auth_header(owner), "If-Match": '"0"'}
            assert (await h.client.get(path, headers=headers)).status_code == 404
            saved = await h.client.put(path, headers=headers, json=UPLOAD)
            assert saved.status_code == 200, saved.text
            assert saved.json()["version"] == 1
            assert saved.headers["cache-control"] == "no-store"
            assert saved.json()["analysis"]["sections"]
            loaded = await h.client.get(path, headers=headers)
            assert loaded.json() == saved.json()
            assert (await h.client.put(path, headers=headers, json=UPLOAD)).json() == saved.json()
            other = auth_header(uuid.uuid4())
            assert (await h.client.get(path, headers=other)).status_code == 404
            assert (await h.client.get("/v1/training/courses/data", headers=other)).json() == {
                "courses": []
            }
            changed = {**UPLOAD, "source_url": "https://example.org/course"}
            assert (await h.client.put(path, headers=headers, json=changed)).status_code == 412
            replaced = await h.client.put(
                path, headers={**headers, "If-Match": '"1"'}, json=changed
            )
            assert replaced.json()["version"] == 2
            exported = (await h.client.get("/v1/training/courses/data", headers=headers)).json()
            assert base64.b64decode(exported["courses"][0]["content_base64"]) == GPX
            assert (await h.client.delete(path, headers=headers)).status_code == 412
            remove_headers = {**headers, "If-Match": '"2"'}
            assert (await h.client.delete(path, headers=remove_headers)).status_code == 204
            assert (await h.client.get(path, headers=headers)).status_code == 404
            assert (await h.client.get("/v1/training/courses/data", headers=headers)).json() == {
                "courses": []
            }
            reattached = await h.client.put(path, headers=headers, json=UPLOAD)
            assert reattached.json()["version"] == 4
            # An old remove request must not erase a newer attachment of the same file.
            assert (await h.client.delete(path, headers=remove_headers)).status_code == 412
            assert (
                await h.client.post("/internal/race-course-data/purge", headers=headers)
            ).status_code == 401
            cleanup = {"Authorization": f"Bearer {cleanup_token(owner, 1)}"}
            assert (
                await h.client.post("/internal/race-course-data/purge", headers=cleanup)
            ).status_code == 204
            # Simulate an upload that obtained permission before the purge but finishes afterward.
            assert (await h.client.put(path, headers=headers, json=UPLOAD)).status_code == 409
            assert (await h.client.get("/v1/training/courses/data", headers=headers)).json() == {
                "courses": []
            }

            async def newer() -> dict[str, object]:
                return {"generation": 1, "state": "active"}

            h.app.dependency_overrides[mission_access] = newer
            assert (await h.client.put(path, headers=headers, json=UPLOAD)).status_code == 200
            # Retrying/replaying the completed purge must not erase NEW data in generation 1.
            assert (
                await h.client.post("/internal/race-course-data/purge", headers=cleanup)
            ).status_code == 204
            assert (await h.client.get(path, headers=headers)).status_code == 200

    asyncio.run(scenario())


def test_upload_rejects_archived_invalid_oversized_and_unauthenticated() -> None:
    async def scenario() -> None:
        async with training_app() as h:
            path = f"/v1/training/missions/{uuid.uuid4()}/course"
            headers = {**auth_header(uuid.uuid4()), "If-Match": '"0"'}

            async def allowed() -> dict[str, object]:
                return {"generation": 0, "state": "active"}

            h.app.dependency_overrides[mission_access] = allowed
            assert (await h.client.put(path, json=UPLOAD)).status_code == 401
            for content in ("!!!=", base64.b64encode(b"not xml").decode()):
                result = await h.client.put(path, headers=headers, json={"content_base64": content})
                assert result.status_code == 422, result.text
                assert content not in result.text
            assert (
                await h.client.put(path, headers=headers, content=b" " * (store.BODY_LIMIT + 1))
            ).status_code == 413

            async def archived() -> dict[str, object]:
                return {"generation": 0, "state": "archived"}

            h.app.dependency_overrides[mission_access] = archived
            assert (await h.client.put(path, headers=headers, json=UPLOAD)).status_code == 409

    asyncio.run(scenario())


def test_storage_quota_and_processor_overload_fail_without_saving(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def scenario() -> None:
        async with training_app() as h:

            async def allowed() -> dict[str, object]:
                return {"generation": 0, "state": "active"}

            h.app.dependency_overrides[mission_access] = allowed
            headers = {**auth_header(uuid.uuid4()), "If-Match": '"0"'}
            path = f"/v1/training/missions/{uuid.uuid4()}/course"
            monkeypatch.setattr(store, "OWNER_BYTES_LIMIT", len(GPX) - 1)
            assert (await h.client.put(path, headers=headers, json=UPLOAD)).status_code == 413
            limiter = CapacityLimiter(2)
            h.app.state.course_limiter = limiter
            limiter.acquire_on_behalf_of_nowait("one")
            limiter.acquire_on_behalf_of_nowait("two")
            try:
                result = await h.client.put(path, headers=headers, json=UPLOAD)
                assert (
                    result.status_code == 503 and result.json()["code"] == "course_processor_busy"
                )
            finally:
                limiter.release_on_behalf_of("one")
                limiter.release_on_behalf_of("two")
            assert (await h.client.get("/v1/training/courses/data", headers=headers)).json() == {
                "courses": []
            }

    asyncio.run(scenario())
