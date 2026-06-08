"""Profile endpoints implementing contracts/user/openapi.yml (`/v1/users/me`)."""

from fastapi import APIRouter

from app.deps import CurrentUserDep, SessionDep
from app.errors import AppError
from app.profiles import build_profile_response, get_or_create_profile
from app.progression import active_medals, total_xp
from app.schemas.profile import UpdateProfileRequest, UserProfileResponse

router = APIRouter(prefix="/v1", tags=["profile"])


def _fallback_display_name(email: str) -> str:
    return email.split("@", 1)[0]


async def _profile_response(
    session: SessionDep, current: CurrentUserDep, profile: object
) -> UserProfileResponse:
    return build_profile_response(
        profile,  # type: ignore[arg-type]
        fallback_display_name=_fallback_display_name(current.email),
        total_xp=await total_xp(session, current.user_id),
        active_medals=await active_medals(session, current.user_id),
    )


@router.get("/users/me", response_model=UserProfileResponse)
async def get_me(current: CurrentUserDep, session: SessionDep) -> UserProfileResponse:
    profile = await get_or_create_profile(session, current.user_id)
    await session.commit()
    return await _profile_response(session, current, profile)


@router.patch("/users/me", response_model=UserProfileResponse)
async def update_me(
    body: UpdateProfileRequest,
    current: CurrentUserDep,
    session: SessionDep,
) -> UserProfileResponse:
    if (
        body.display_name is None
        and body.identity_statement is None
        and body.transformation_goal is None
    ):
        raise AppError(400, "validation_error", "At least one field must be provided.")

    profile = await get_or_create_profile(session, current.user_id)
    if body.display_name is not None:
        profile.display_name = body.display_name
    if body.identity_statement is not None:
        profile.identity_statement = body.identity_statement
    if body.transformation_goal is not None:
        profile.transformation_goal = body.transformation_goal.value
    await session.commit()
    return await _profile_response(session, current, profile)
