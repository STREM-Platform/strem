"""Profile and onboarding domain logic.

Profiles are created lazily on first access, keyed by the auth `user_id`.
Onboarding answers are upserted per screen; completion and the resume point are
derived from which fields are present (onboarding-flow.md).
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import UserProfile
from app.schemas.enums import SCREEN_ORDER, OnboardingStatusValue, ScreenName
from app.schemas.onboarding import OnboardingRequest, OnboardingStatusResponse
from app.schemas.profile import UserProfileResponse

# The five fields required to mark onboarding complete (onboarding-flow.md).
_REQUIRED_FIELDS = (
    "identity_statement",
    "transformation_goal",
    "training_level",
    "weekly_target_days",
    "timezone",
)


async def get_or_create_profile(session: AsyncSession, user_id: object) -> UserProfile:
    """Return the profile for `user_id`, creating an empty one on first access."""
    profile = await session.get(UserProfile, user_id)
    if profile is None:
        profile = UserProfile(id=user_id)
        session.add(profile)
        await session.flush()
    return profile


def _required_complete(profile: UserProfile) -> bool:
    return all(getattr(profile, field) is not None for field in _REQUIRED_FIELDS)


def _has_any_answer(profile: UserProfile) -> bool:
    fields = (
        profile.identity_statement,
        profile.transformation_goal,
        profile.training_level,
        profile.weekly_target_days,
        profile.nutrition_preference,
        profile.tribe_preference,
        profile.timezone,
        profile.display_name,
    )
    return any(value is not None for value in fields) or bool(profile.preferred_modalities)


def _inferred_screen(profile: UserProfile) -> ScreenName | None:
    """Furthest screen implied by the required fields currently present."""
    reached: list[ScreenName] = []
    if profile.identity_statement and profile.transformation_goal:
        reached.append(ScreenName.IDENTITY)
    if profile.training_level:
        reached.append(ScreenName.TRAINING_BACKGROUND)
    if profile.weekly_target_days is not None:
        reached.append(ScreenName.COMMITMENT)
    if profile.timezone:
        reached.append(ScreenName.LAUNCH)
    if not reached:
        return None
    return max(reached, key=SCREEN_ORDER.index)


def _resume_point(profile: UserProfile, explicit: ScreenName | None) -> ScreenName | None:
    candidates: list[ScreenName] = []
    inferred = _inferred_screen(profile)
    if inferred is not None:
        candidates.append(inferred)
    if explicit is not None:
        candidates.append(explicit)
    if profile.last_completed_screen is not None:
        candidates.append(ScreenName(profile.last_completed_screen))
    if not candidates:
        # Any captured data means at least the welcome screen was passed.
        return ScreenName.WELCOME if _has_any_answer(profile) else None
    return max(candidates, key=SCREEN_ORDER.index)


def apply_onboarding(profile: UserProfile, body: OnboardingRequest) -> None:
    """Upsert provided onboarding answers and recompute status + resume point."""
    if body.identity_statement is not None:
        profile.identity_statement = body.identity_statement
    if body.transformation_goal is not None:
        profile.transformation_goal = body.transformation_goal.value
    if body.training_level is not None:
        profile.training_level = body.training_level.value
    if body.preferred_modalities is not None:
        profile.preferred_modalities = [m.value for m in body.preferred_modalities]
    if body.weekly_target_days is not None:
        profile.weekly_target_days = body.weekly_target_days
    if body.nutrition_preference is not None:
        profile.nutrition_preference = body.nutrition_preference.value
    if body.tribe_preference is not None:
        profile.tribe_preference = body.tribe_preference.value
    if body.display_name is not None:
        profile.display_name = body.display_name
    if body.timezone is not None:
        profile.timezone = body.timezone

    resume = _resume_point(profile, body.screen)
    profile.last_completed_screen = resume.value if resume is not None else None

    if _required_complete(profile):
        if profile.onboarding_status != OnboardingStatusValue.COMPLETED.value:
            profile.onboarding_completed_at = datetime.now(UTC)
        profile.onboarding_status = OnboardingStatusValue.COMPLETED.value
    elif _has_any_answer(profile):
        profile.onboarding_status = OnboardingStatusValue.IN_PROGRESS.value
    else:
        profile.onboarding_status = OnboardingStatusValue.NOT_STARTED.value


def build_status_response(profile: UserProfile) -> OnboardingStatusResponse:
    """Render the onboarding status + resume point for the contract."""
    status = OnboardingStatusValue(profile.onboarding_status)
    screen = (
        ScreenName(profile.last_completed_screen)
        if profile.last_completed_screen is not None
        else None
    )
    return OnboardingStatusResponse(
        status=status,
        completed=status is OnboardingStatusValue.COMPLETED,
        last_completed_screen=screen,
        completed_at=profile.onboarding_completed_at,
    )


def build_profile_response(
    profile: UserProfile, *, fallback_display_name: str
) -> UserProfileResponse:
    """Render the profile for the contract."""
    return UserProfileResponse(
        user_id=profile.id,
        display_name=profile.display_name or fallback_display_name,
        identity_statement=profile.identity_statement,
        transformation_goal=profile.transformation_goal,  # type: ignore[arg-type]
        training_level=profile.training_level,  # type: ignore[arg-type]
        weekly_target_days=profile.weekly_target_days,
        onboarding_completed=profile.onboarding_status == OnboardingStatusValue.COMPLETED.value,
        created_at=profile.created_at,
    )
