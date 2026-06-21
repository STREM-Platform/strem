"""Athlete Baseline endpoints (issue #61), under `/v1/users/me/athlete-profile`.

The progressive, optional Athlete Profile (next-steps-plan.md §3.1) — separate
from the deliberately-minimal identity onboarding. It feeds the A6 context graph
(the orchestrator reads it) and is shown under A7 "what your coach sees".
"""

from fastapi import APIRouter

from app.athlete import apply_update, build_response, get_or_create_athlete_profile
from app.deps import CurrentUserDep, SessionDep
from app.schemas.athlete import AthleteProfileResponse, AthleteProfileUpdate

router = APIRouter(prefix="/v1", tags=["athlete"])


@router.get("/users/me/athlete-profile", response_model=AthleteProfileResponse)
async def get_athlete_profile(
    current: CurrentUserDep, session: SessionDep
) -> AthleteProfileResponse:
    profile = await get_or_create_athlete_profile(session, current.user_id)
    await session.commit()
    return build_response(profile)


@router.put("/users/me/athlete-profile", response_model=AthleteProfileResponse)
async def put_athlete_profile(
    body: AthleteProfileUpdate, current: CurrentUserDep, session: SessionDep
) -> AthleteProfileResponse:
    profile = await get_or_create_athlete_profile(session, current.user_id)
    apply_update(profile, body)
    await session.commit()
    return build_response(profile)
