"""Onboarding request/response schemas mirroring contracts/user/openapi.yml.

Per the recovery path in onboarding-flow.md, answers persist per screen, so all
request fields are individually optional at the HTTP layer; the server marks
onboarding `completed` only when all five required fields are present
(identity_statement, transformation_goal, training_level, weekly_target_days,
timezone). The optional `screen` field records the just-completed screen so the
resume point is exact even when a screen captures only optional data.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.enums import (
    Modality,
    NutritionPreference,
    OnboardingStatusValue,
    ScreenName,
    TrainingLevel,
    TransformationGoal,
    TribePreference,
)


class OnboardingRequest(BaseModel):
    """A per-screen or full onboarding submission (fields optional for resume)."""

    identity_statement: str | None = Field(default=None, max_length=280)
    transformation_goal: TransformationGoal | None = None
    training_level: TrainingLevel | None = None
    preferred_modalities: list[Modality] | None = None
    weekly_target_days: int | None = Field(default=None, ge=2, le=7)
    nutrition_preference: NutritionPreference | None = None
    tribe_preference: TribePreference | None = None
    display_name: str | None = Field(default=None, max_length=40)
    timezone: str | None = None
    screen: ScreenName | None = None


class OnboardingStatusResponse(BaseModel):
    """Onboarding completion status and resume point (contract `OnboardingStatus`)."""

    status: OnboardingStatusValue
    completed: bool
    last_completed_screen: ScreenName | None = None
    completed_at: datetime | None = None
