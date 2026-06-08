"""Onboarding endpoints implementing contracts/user/openapi.yml.

`POST /v1/users/onboarding` upserts answers per screen and completes onboarding
when all required fields are present; `GET /v1/users/onboarding/status` reports
status and the resume point.
"""

from fastapi import APIRouter, status

from app.deps import CurrentUserDep, SessionDep
from app.profiles import apply_onboarding, build_status_response, get_or_create_profile
from app.schemas.onboarding import OnboardingRequest, OnboardingStatusResponse

router = APIRouter(prefix="/v1", tags=["onboarding"])


@router.post(
    "/users/onboarding",
    status_code=status.HTTP_201_CREATED,
    response_model=OnboardingStatusResponse,
)
async def submit_onboarding(
    body: OnboardingRequest,
    current: CurrentUserDep,
    session: SessionDep,
) -> OnboardingStatusResponse:
    profile = await get_or_create_profile(session, current.user_id)
    apply_onboarding(profile, body)
    await session.commit()
    return build_status_response(profile)


@router.get("/users/onboarding/status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    current: CurrentUserDep,
    session: SessionDep,
) -> OnboardingStatusResponse:
    profile = await get_or_create_profile(session, current.user_id)
    await session.commit()
    return build_status_response(profile)
