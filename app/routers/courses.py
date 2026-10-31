"""Mission ownership is verified through user-service; no shared database reads."""

import base64
import uuid
from datetime import UTC, datetime
from typing import Annotated

import httpx
import jwt
from anyio import CapacityLimiter, WouldBlock, to_thread
from fastapi import APIRouter, Depends, Header, Request, Response
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select

from app import courses as store
from app.course_processing import CourseProcessingError
from app.crypto import get_token_cipher
from app.deps import BearerTokenDep, CurrentUserDep, ProviderRegistryDep, SessionDep, SettingsDep
from app.errors import AppError

router = APIRouter()


async def access(
    mission_id: uuid.UUID,
    token: str,
    base_url: str,
) -> dict[str, object]:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            result = await client.get(
                f"{base_url.rstrip('/')}/race-missions/{mission_id}/course-access",
                headers={"Authorization": f"Bearer {token}"},
            )
        if result.status_code == 404:
            raise AppError(404, "mission_not_found", "Race Mission not found.")
        if result.status_code != 200:
            raise AppError(503, "mission_access_unavailable", "Mission data is unavailable. Retry.")
        value = result.json()
        if (
            not isinstance(value, dict)
            or type(value.get("generation")) is not int
            or value.get("state") not in ("active", "archived", "completed")
        ):
            raise ValueError
        return value
    except (httpx.RequestError, ValueError):
        raise AppError(
            503, "mission_access_unavailable", "Mission data is unavailable. Retry."
        ) from None


async def mission_access(
    mission_id: uuid.UUID,
    token: BearerTokenDep,
    settings: SettingsDep,
) -> dict[str, object]:
    return await access(mission_id, token, settings.user_service_base_url)


AccessDep = Annotated[dict[str, object], Depends(mission_access)]


async def upload_body(request: Request) -> store.CourseUpload:
    data = bytearray()
    async for chunk in request.stream():
        if len(data) + len(chunk) > store.BODY_LIMIT:
            raise AppError(413, "payload_too_large", "Choose a GPX/ZIP file up to 4 MiB.")
        data.extend(chunk)
    try:
        return store.CourseUpload.model_validate_json(data)
    except ValidationError:
        raise AppError(
            422, "invalid_course_upload", "Provide a GPX/ZIP file and optional HTTPS source."
        ) from None


@router.put("/v1/training/missions/{mission_id}/course")
async def upload(
    mission_id: uuid.UUID,
    current: CurrentUserDep,
    session: SessionDep,
    response: Response,
    authorization: AccessDep,
    request: Request,
    expected: Annotated[str, Header(alias="If-Match", pattern=r'^"[0-9]{1,10}"$')],
) -> dict[str, object]:
    if authorization["state"] != "active":
        raise AppError(409, "mission_archived", "Archived missions cannot accept a new course.")
    if not hasattr(request.app.state, "course_limiter"):
        request.app.state.course_limiter = CapacityLimiter(2)
    limiter: CapacityLimiter = request.app.state.course_limiter
    try:
        limiter.acquire_nowait()
    except WouldBlock:
        raise AppError(
            503, "course_processor_busy", "Course processing is busy. Retry shortly."
        ) from None
    try:
        body = await upload_body(request)
        gpx, snapshot = await to_thread.run_sync(store.prepare, body)
    except CourseProcessingError as error:
        raise AppError(
            422, error.code, "This file could not be processed. Check the GPX and retry."
        ) from None
    finally:
        limiter.release()
    generation = authorization["generation"]
    assert isinstance(generation, int)
    result = await store.save(
        session, current.user_id, mission_id, generation, int(expected[1:-1]), gpx, snapshot
    )
    response.headers.update({"Cache-Control": "no-store", "ETag": f'"{result["version"]}"'})
    return result


class StravaCourse(BaseModel):
    route_id: str = Field(pattern=r"^[0-9]{1,30}$")


@router.post("/v1/training/missions/{mission_id}/course/from-strava")
async def course_from_strava(
    mission_id: uuid.UUID,
    body: StravaCourse,
    current: CurrentUserDep,
    session: SessionDep,
    settings: SettingsDep,
    registry: ProviderRegistryDep,
    response: Response,
    authorization: AccessDep,
    expected: Annotated[str, Header(alias="If-Match", pattern=r'^"[0-9]{1,10}"$')],
) -> dict[str, object]:
    """Attach one of the athlete's Strava routes as the course — no file needed."""
    if authorization["state"] != "active":
        raise AppError(409, "mission_archived", "Archived missions cannot accept a new course.")
    from app.integrations import service as integrations

    gpx_bytes = await integrations.strava_route_gpx(
        session,
        registry,
        get_token_cipher(settings),
        user_id=current.user_id,
        route_id=body.route_id,
    )
    upload = store.CourseUpload(
        content_base64=base64.b64encode(gpx_bytes).decode(),
        source_url=f"https://www.strava.com/routes/{body.route_id}",
    )
    try:
        gpx, snapshot = await to_thread.run_sync(store.prepare, upload)
    except CourseProcessingError as error:
        raise AppError(
            422, error.code, "This Strava route could not be processed as a course."
        ) from None
    snapshot["source"] = "strava_route"
    generation = authorization["generation"]
    assert isinstance(generation, int)
    result = await store.save(
        session, current.user_id, mission_id, generation, int(expected[1:-1]), gpx, snapshot
    )
    response.headers.update({"Cache-Control": "no-store", "ETag": f'"{result["version"]}"'})
    return result


@router.get("/v1/training/missions/{mission_id}/course")
async def read(
    mission_id: uuid.UUID,
    current: CurrentUserDep,
    session: SessionDep,
    response: Response,
    authorization: AccessDep,
) -> dict[str, object]:
    owner = await store.lock_owner(session, current.user_id)
    if owner.generation != authorization["generation"]:
        raise AppError(409, "course_generation_conflict", "Mission data changed. Reload and retry.")
    record = await session.get(store.CourseRecord, mission_id)
    if record is None or record.user_id != current.user_id or not record.gpx:
        raise AppError(404, "course_not_found", "No course has been attached to this mission.")
    response.headers.update({"Cache-Control": "no-store", "ETag": f'"{record.version}"'})
    return store.document(record)


@router.delete("/v1/training/missions/{mission_id}/course", status_code=204)
async def remove_course(
    mission_id: uuid.UUID,
    current: CurrentUserDep,
    session: SessionDep,
    authorization: AccessDep,
    expected: Annotated[str, Header(alias="If-Match", pattern=r'^"[0-9]{1,10}"$')],
) -> Response:
    owner = await store.lock_owner(session, current.user_id)
    if owner.generation != authorization["generation"]:
        raise AppError(409, "course_generation_conflict", "Mission data changed. Reload and retry.")
    record = await session.get(store.CourseRecord, mission_id)
    if record is None or record.user_id != current.user_id:
        raise AppError(404, "course_not_found", "Course not found.")
    if record.gpx:
        if int(expected[1:-1]) != record.version:
            raise AppError(412, "version_conflict", "Course changed. Reload before deleting it.")
        # Retain the version fence only: avoids an ABA overwrite after removal/re-upload.
        record.gpx, record.snapshot = b"", {}
        record.version += 1
        await session.commit()
    return Response(status_code=204, headers={"Cache-Control": "no-store"})


@router.get("/v1/training/courses/data")
async def export_courses(
    current: CurrentUserDep,
    session: SessionDep,
    response: Response,
) -> dict[str, object]:
    await store.lock_owner(session, current.user_id)
    records = await session.scalars(
        select(store.CourseRecord)
        .where(store.CourseRecord.user_id == current.user_id, store.CourseRecord.gpx != b"")
        .order_by(store.CourseRecord.mission_id)
    )
    response.headers["Cache-Control"] = "no-store"
    from app.plans import export_plans

    return {
        "courses": [
            {**store.document(row), "content_base64": base64.b64encode(row.gpx).decode()}
            for row in records
        ],
        "plans": await export_plans(session, current.user_id),
    }


@router.post("/internal/race-course-data/purge", status_code=204)
async def purge_courses(request: Request, session: SessionDep, settings: SettingsDep) -> Response:
    try:
        token = request.headers.get("Authorization", "").removeprefix("Bearer ")
        claims = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            audience="strem-course-cleanup",
            options={"require": ["exp", "sub", "generation", "purpose"]},
        )
        if claims["purpose"] != "purge_race_courses" or type(claims["generation"]) is not int:
            raise ValueError
        user_id = uuid.UUID(claims["sub"])
        if claims["generation"] < 1 or claims["exp"] <= datetime.now(UTC).timestamp():
            raise ValueError
    except (jwt.PyJWTError, ValueError, TypeError):
        raise AppError(401, "unauthorized", "A valid cleanup authorization is required.") from None
    await store.purge(session, user_id, claims["generation"])
    return Response(status_code=204, headers={"Cache-Control": "no-store"})
