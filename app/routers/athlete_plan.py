"""The athlete's plan across races, and the plan outside any race (issue #23)."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Response, status

from app import athlete_plan as timeline
from app import plans as store
from app.deps import BearerTokenDep, CurrentUserDep, SessionDep, SettingsDep
from app.errors import AppError
from app.plan_schemas import SessionPatch
from app.routers.courses import access
from app.routers.plans import OptionalMatch

router = APIRouter(tags=["plans"])


async def _compose(session: SessionDep, user_id, token: str, settings) -> timeline.AthletePlan:  # type: ignore[no-untyped-def]
    races = await timeline.athlete_races(token, settings.user_service_base_url)
    ids = {race["mission_id"] for race in races}
    plans = {k: v for k, v in (await timeline.mission_plans(session, user_id)).items() if k in ids}
    base = await timeline.get_base(session, user_id)
    return timeline.compose(races, plans, base, datetime.now(UTC).date())


@router.get("/v1/training/plan", response_model=timeline.AthletePlan)
async def athlete_plan(
    current: CurrentUserDep,
    session: SessionDep,
    token: BearerTokenDep,
    settings: SettingsDep,
    response: Response,
) -> timeline.AthletePlan:
    """Every race plan and the plan outside races, on one calendar."""
    response.headers["Cache-Control"] = "no-store"
    return await _compose(session, current.user_id, token, settings)


@router.get("/v1/training/plan/progress", response_model=timeline.AthleteProgress)
async def athlete_progress(
    current: CurrentUserDep,
    session: SessionDep,
    token: BearerTokenDep,
    settings: SettingsDep,
    response: Response,
) -> timeline.AthleteProgress:
    plan = await _compose(session, current.user_id, token, settings)
    today = datetime.now(UTC).date()
    content = plan.content
    start = min(content.start_date if content else today, today - timedelta(weeks=8))
    end = max(
        content.weeks[-1].start_date + timedelta(days=6) if content and content.weeks else today,
        today,
    )
    rows = await store.load_window(session, current.user_id, start, end)
    response.headers["Cache-Control"] = "no-store"
    return timeline.AthleteProgress(**store.progress_parts(content, None, rows))


@router.patch("/v1/training/plan/sessions/{session_id}", response_model=timeline.AthletePlan)
async def patch_athlete_session(
    session_id: str,
    body: SessionPatch,
    current: CurrentUserDep,
    session: SessionDep,
    token: BearerTokenDep,
    settings: SettingsDep,
    response: Response,
) -> timeline.AthletePlan:
    """Edit a session from the timeline; the change lands in the plan that owns it."""
    short, original = timeline.split_session_id(session_id)
    if short is None:
        await timeline.patch_base_session(session, current.user_id, original, body)
    else:
        owners = [
            m
            for m in await timeline.mission_plans(session, current.user_id)
            if m.hex.startswith(short)
        ]
        if len(owners) != 1:
            raise AppError(404, "plan_session_not_found", "That session is not part of your plan.")
        grant = await access(owners[0], token, settings.user_service_base_url)
        await store.patch_session(session, current.user_id, owners[0], grant, original, body, None)
    response.headers["Cache-Control"] = "no-store"
    return await _compose(session, current.user_id, token, settings)


def _base_etag(response: Response, plan: timeline.BasePlan) -> timeline.BasePlan:
    response.headers.update({"Cache-Control": "no-store", "ETag": f'"{plan.version}"'})
    return plan


@router.get("/v1/training/plan/base", response_model=timeline.BasePlan)
async def get_base(
    current: CurrentUserDep, session: SessionDep, response: Response
) -> timeline.BasePlan:
    plan = await timeline.get_base(session, current.user_id)
    if plan is None:
        raise AppError(404, "plan_not_found", "You have no plan outside your races yet.")
    return _base_etag(response, plan)


@router.put("/v1/training/plan/base", response_model=timeline.BasePlan)
async def put_base(
    body: timeline.BasePlanWrite,
    current: CurrentUserDep,
    session: SessionDep,
    response: Response,
    if_match: OptionalMatch = None,
) -> timeline.BasePlan:
    plan = await timeline.put_base(session, current.user_id, body, store.parse_if_match(if_match))
    return _base_etag(response, plan)


@router.delete("/v1/training/plan/base", status_code=status.HTTP_204_NO_CONTENT)
async def delete_base(current: CurrentUserDep, session: SessionDep) -> Response:
    await timeline.delete_base(session, current.user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT, headers={"Cache-Control": "no-store"})
