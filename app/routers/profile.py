"""Profile endpoints implementing contracts/user/openapi.yml (`/v1/users/me`)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.deps import CurrentUserDep, SessionDep
from app.errors import AppError
from app.profiles import build_profile_response, get_display_names, get_or_create_profile
from app.progression import active_medals, total_xp
from app.schemas.profile import (
    UpdateProfileRequest,
    UserProfileResponse,
    UserSummary,
    UserSummaryList,
)

router = APIRouter(prefix="/v1", tags=["profile"])


@router.get("/users/batch", response_model=UserSummaryList)
async def get_users_batch(
    current: CurrentUserDep,
    session: SessionDep,
    ids: Annotated[str, Query(description="Comma-separated user ids (max 50).")] = "",
) -> UserSummaryList:
    """Display names for a batch of user ids (#72) — name only, auth-required.

    Used to enrich a tribe roster with real names; returns no email or other PII.
    """
    parsed: list[uuid.UUID] = []
    for value in ids.split(","):
        value = value.strip()
        if not value:
            continue
        try:
            parsed.append(uuid.UUID(value))
        except ValueError:
            continue
    names = await get_display_names(session, parsed[:50])
    return UserSummaryList(
        items=[UserSummary(user_id=uid, display_name=name) for uid, name in names.items()]
    )


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
