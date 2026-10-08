"""Authenticated Race Mission foundation; caller identity never comes from a body."""

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Header, Response
from sqlalchemy import select

from app import race_missions as store
from app.deps import CurrentUserDep, SessionDep
from app.errors import AppError
from app.schemas.race_mission import (
    ArchiveMission,
    DeleteMissionData,
    RaceMission,
    RaceMissionCreate,
    RaceMissionExport,
    RaceMissionRevision,
    RaceMissionUpdate,
)

router = APIRouter(prefix="/v1/race-missions", tags=["race-missions"])
RequestKey = Annotated[
    str, Header(alias="Idempotency-Key", min_length=8, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")
]
MatchVersion = Annotated[str, Header(alias="If-Match")]


def with_etag(response: Response, mission: RaceMission) -> RaceMission:
    response.headers["ETag"] = f'"{mission.version}"'
    response.headers["Cache-Control"] = "no-store"
    return mission


@router.post("", response_model=RaceMission, status_code=201)
async def create_mission(
    body: RaceMissionCreate,
    current: CurrentUserDep,
    session: SessionDep,
    response: Response,
    key: RequestKey,
) -> RaceMission:
    return with_etag(
        response, await store.create(session, current.user_id, body.model_dump(mode="json"), key)
    )


@router.get("/active", response_model=RaceMission)
async def active_mission(
    current: CurrentUserDep, session: SessionDep, response: Response
) -> RaceMission:
    record = await session.scalar(
        select(store.MissionRecord).where(
            store.MissionRecord.user_id == current.user_id, store.MissionRecord.state == "active"
        )
    )
    if record is None:
        raise AppError(404, "no_active_mission", "You have no active Race Mission.")
    return with_etag(response, RaceMission.model_validate(record.snapshot))


@router.get("/data", response_model=RaceMissionExport)
async def export_missions(
    current: CurrentUserDep, session: SessionDep, response: Response
) -> RaceMissionExport:
    response.headers["Cache-Control"] = "no-store"
    missions = await session.scalars(
        select(store.MissionRecord)
        .where(store.MissionRecord.user_id == current.user_id)
        .order_by(store.MissionRecord.created_at)
    )
    revisions = await session.scalars(
        select(store.MissionRevisionRecord)
        .where(store.MissionRevisionRecord.user_id == current.user_id)
        .order_by(store.MissionRevisionRecord.mission_id, store.MissionRevisionRecord.version)
    )
    return RaceMissionExport(
        exported_at=datetime.now(UTC),
        missions=[RaceMission.model_validate(row.snapshot) for row in missions],
        revisions=[
            RaceMissionRevision(mission=RaceMission.model_validate(row.snapshot), reason=row.reason)
            for row in revisions
        ],
    )


@router.delete("/data", status_code=204)
async def delete_missions(
    body: DeleteMissionData, current: CurrentUserDep, session: SessionDep
) -> Response:
    await store.delete_owned_data(session, current.user_id)
    return Response(status_code=204, headers={"Cache-Control": "no-store"})


@router.get("/{mission_id}", response_model=RaceMission)
async def get_mission(
    mission_id: uuid.UUID, current: CurrentUserDep, session: SessionDep, response: Response
) -> RaceMission:
    record = await store.owned(session, current.user_id, mission_id)
    return with_etag(response, RaceMission.model_validate(record.snapshot))


@router.patch("/{mission_id}", response_model=RaceMission)
async def update_mission(
    mission_id: uuid.UUID,
    body: RaceMissionUpdate,
    current: CurrentUserDep,
    session: SessionDep,
    response: Response,
    version: MatchVersion,
) -> RaceMission:
    changes = body.model_dump(mode="json", exclude_unset=True, exclude={"correction_reason"})
    return with_etag(
        response,
        await store.change(
            session,
            current.user_id,
            mission_id,
            store.version_from_header(version),
            changes,
            body.correction_reason,
        ),
    )


@router.post("/{mission_id}/archive", response_model=RaceMission)
async def archive_mission(
    mission_id: uuid.UUID,
    body: ArchiveMission,
    current: CurrentUserDep,
    session: SessionDep,
    response: Response,
    version: MatchVersion,
    key: RequestKey,
) -> RaceMission:
    return with_etag(
        response,
        await store.change(
            session,
            current.user_id,
            mission_id,
            store.version_from_header(version),
            {"state": "archived"},
            body.reason,
            key,
        ),
    )
