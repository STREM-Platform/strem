"""Authenticated Race Mission foundation; caller identity never comes from a body."""

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query, Request, Response
from sqlalchemy import select

from app import race_history
from app import race_missions as store
from app.course_coordination import CoursePeer, CourseState, delete_all, ensure_available
from app.deps import CurrentUserDep, SessionDep, SettingsDep
from app.errors import AppError
from app.mission_layers import export_layers
from app.schemas.race_mission import (
    ArchiveMission,
    CompleteMission,
    DeleteMissionData,
    RaceMission,
    RaceMissionCreate,
    RaceMissionExport,
    RaceMissionList,
    RaceMissionRevision,
    RaceMissionUpdate,
)

router = APIRouter(prefix="/v1/race-missions", tags=["race-missions"])
RequestKey = Annotated[
    str, Header(alias="Idempotency-Key", min_length=8, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")
]
MatchVersion = Annotated[str, Header(alias="If-Match")]


def get_course_peer(request: Request, settings: SettingsDep) -> CoursePeer:
    return CoursePeer(settings, request.headers.get("Authorization", "").removeprefix("Bearer "))


CoursePeerDep = Annotated[CoursePeer, Depends(get_course_peer)]


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


@router.get("", response_model=RaceMissionList)
async def list_missions(
    current: CurrentUserDep,
    session: SessionDep,
    response: Response,
    state: Annotated[str | None, Query(pattern="^(active|archived|completed)$")] = None,
) -> RaceMissionList:
    response.headers["Cache-Control"] = "no-store"
    return RaceMissionList(items=await store.list_owned(session, current.user_id, state))


@router.get("/active", response_model=RaceMission)
async def active_mission(
    current: CurrentUserDep, session: SessionDep, response: Response
) -> RaceMission:
    """The focus mission: the nearest upcoming active race."""
    mission = store.focus(await store.list_owned(session, current.user_id, "active"))
    if mission is None:
        raise AppError(404, "no_active_mission", "You have no active Race Mission.")
    return with_etag(response, mission)


@router.get("/data", response_model=RaceMissionExport)
async def export_missions(
    current: CurrentUserDep,
    session: SessionDep,
    response: Response,
    peer: CoursePeerDep,
) -> RaceMissionExport:
    # Keep the mission and revision queries consistent with concurrent writes.
    await store.lock_account(session, current.user_id)
    await ensure_available(session, current.user_id)
    state = await session.get(CourseState, current.user_id)
    training_data = (
        await peer.export_all() if state is not None else {"courses": [], "plans": []}
    )
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
        courses=training_data["courses"],
        plans=training_data.get("plans", []),
        layers=await export_layers(session, current.user_id),
        missions=[RaceMission.model_validate(row.snapshot) for row in missions],
        revisions=[
            RaceMissionRevision(mission=RaceMission.model_validate(row.snapshot), reason=row.reason)
            for row in revisions
        ],
    )


@router.delete("/data", status_code=204)
async def delete_missions(
    body: DeleteMissionData,
    current: CurrentUserDep,
    session: SessionDep,
    peer: CoursePeerDep,
) -> Response:
    await delete_all(session, current.user_id, peer)
    return Response(status_code=204, headers={"Cache-Control": "no-store"})


@router.get("/{mission_id}/course-access")
async def course_access(
    mission_id: uuid.UUID,
    current: CurrentUserDep,
    session: SessionDep,
    settings: SettingsDep,
    response: Response,
) -> dict[str, object]:
    await store.lock_account(session, current.user_id)
    record = await store.owned(session, current.user_id, mission_id)
    await ensure_available(session, current.user_id)
    if not settings.course_storage_base_url:
        raise AppError(503, "courses_disabled", "Course storage is not configured on this server.")
    state = await session.get(CourseState, current.user_id)
    if state is None:
        state = CourseState(user_id=current.user_id, generation=0, deletion_pending=False)
        session.add(state)
        await session.commit()
    response.headers["Cache-Control"] = "no-store"
    return {"generation": state.generation, "state": record.state}


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


@router.post("/{mission_id}/complete", response_model=RaceMission)
async def complete_mission(
    mission_id: uuid.UUID,
    body: CompleteMission,
    current: CurrentUserDep,
    session: SessionDep,
    response: Response,
    version: MatchVersion,
    key: RequestKey,
) -> RaceMission:
    """Close a mission with its result; the result joins the athlete's race history."""
    result = body.result.model_copy(
        update={"completed_at": body.result.completed_at or datetime.now(UTC)}
    )
    mission = await store.change(
        session,
        current.user_id,
        mission_id,
        store.version_from_header(version),
        {"state": "completed", "result": result.model_dump(mode="json")},
        f"Race completed: {result.status}",
        key,
        operation="complete",
    )
    await race_history.record_mission_result(session, current.user_id, mission)
    await session.commit()
    return with_etag(response, mission)


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
