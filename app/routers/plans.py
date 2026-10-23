"""Training plan, progress tracker and wellness check-in endpoints (docs#26)."""

import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Header, Query, Response, status
from sqlalchemy import select

from app import plans as store
from app.deps import CurrentUserDep, SessionDep
from app.errors import AppError
from app.models import WellnessCheckin
from app.plan_schemas import MissionPlan, MissionProgress, PlanWrite, SessionPatch
from app.routers.courses import AccessDep
from app.schemas import CheckinList, CheckinRequest, CheckinResponse

router = APIRouter(tags=["plans"])
OptionalMatch = Annotated[str | None, Header(alias="If-Match")]


def _with_etag(response: Response, plan: MissionPlan) -> MissionPlan:
    response.headers.update({"Cache-Control": "no-store", "ETag": f'"{plan.version}"'})
    return plan


@router.get("/v1/training/missions/{mission_id}/plan", response_model=MissionPlan)
async def get_plan(
    mission_id: uuid.UUID,
    current: CurrentUserDep,
    session: SessionDep,
    response: Response,
    access: AccessDep,
) -> MissionPlan:
    return _with_etag(response, await store.get_plan(session, current.user_id, mission_id, access))


@router.put("/v1/training/missions/{mission_id}/plan", response_model=MissionPlan)
async def put_plan(
    mission_id: uuid.UUID,
    body: PlanWrite,
    current: CurrentUserDep,
    session: SessionDep,
    response: Response,
    access: AccessDep,
    if_match: OptionalMatch = None,
) -> MissionPlan:
    plan = await store.put_plan(
        session, current.user_id, mission_id, access, body, store.parse_if_match(if_match)
    )
    return _with_etag(response, plan)


@router.patch(
    "/v1/training/missions/{mission_id}/plan/sessions/{session_id}", response_model=MissionPlan
)
async def patch_plan_session(
    mission_id: uuid.UUID,
    session_id: str,
    body: SessionPatch,
    current: CurrentUserDep,
    session: SessionDep,
    response: Response,
    access: AccessDep,
    if_match: OptionalMatch = None,
) -> MissionPlan:
    plan = await store.patch_session(
        session,
        current.user_id,
        mission_id,
        access,
        session_id,
        body,
        store.parse_if_match(if_match),
    )
    return _with_etag(response, plan)


@router.delete("/v1/training/missions/{mission_id}/plan", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    mission_id: uuid.UUID, current: CurrentUserDep, session: SessionDep, access: AccessDep
) -> Response:
    await store.delete_plan(session, current.user_id, mission_id, access)
    return Response(status_code=status.HTTP_204_NO_CONTENT, headers={"Cache-Control": "no-store"})


@router.get("/v1/training/missions/{mission_id}/progress", response_model=MissionProgress)
async def mission_progress(
    mission_id: uuid.UUID,
    current: CurrentUserDep,
    session: SessionDep,
    response: Response,
    access: AccessDep,
) -> MissionProgress:
    """Plan vs. what the athlete actually did; evidence-only when no plan exists."""
    plan: MissionPlan | None
    try:
        plan = await store.get_plan(session, current.user_id, mission_id, access)
    except AppError as error:
        if error.code != "plan_not_found":
            raise
        plan = None
    today = datetime.now(UTC).date()
    start = min(plan.content.start_date if plan else today, today - timedelta(weeks=8))
    end = plan.content.race_date if plan else today
    rows = await store.load_window(session, current.user_id, start, max(end, today))
    response.headers["Cache-Control"] = "no-store"
    return store.compute_progress(mission_id, plan, rows)


# ── Wellness check-ins ───────────────────────────────────────────────────────


def _checkin_response(row: WellnessCheckin) -> CheckinResponse:
    return CheckinResponse(
        id=row.id,
        day=row.day,
        sleep_quality=row.sleep_quality,
        sleep_hours=row.sleep_hours,
        energy=row.energy,
        soreness=row.soreness,
        stress=row.stress,
        motivation=row.motivation,
        illness=row.illness,
        pain_note=row.pain_note,
        note=row.note,
        updated_at=row.updated_at,
    )


@router.put("/v1/training/checkins", response_model=CheckinResponse)
async def upsert_checkin(
    body: CheckinRequest, current: CurrentUserDep, session: SessionDep
) -> CheckinResponse:
    """One check-in per calendar day; answering again that day replaces it."""
    if body.day > datetime.now(UTC).date() + timedelta(days=1):
        raise AppError(422, "future_checkin", "Check-ins describe today or earlier.")
    row = await session.scalar(
        select(WellnessCheckin).where(
            WellnessCheckin.user_id == current.user_id, WellnessCheckin.day == body.day
        )
    )
    if row is None:
        row = WellnessCheckin(user_id=current.user_id, day=body.day)
        session.add(row)
    for field in (
        "sleep_quality",
        "sleep_hours",
        "energy",
        "soreness",
        "stress",
        "motivation",
        "illness",
        "pain_note",
        "note",
    ):
        setattr(row, field, getattr(body, field))
    row.updated_at = datetime.now(UTC)
    await session.commit()
    return _checkin_response(row)


@router.get("/v1/training/checkins", response_model=CheckinList)
async def list_checkins(
    current: CurrentUserDep,
    session: SessionDep,
    since: date | None = None,
    limit: Annotated[int, Query(ge=1, le=120)] = 30,
) -> CheckinList:
    query = select(WellnessCheckin).where(WellnessCheckin.user_id == current.user_id)
    if since is not None:
        query = query.where(WellnessCheckin.day >= since)
    rows = await session.scalars(query.order_by(WellnessCheckin.day.desc()).limit(limit))
    return CheckinList(items=[_checkin_response(row) for row in rows])
