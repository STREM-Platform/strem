"""Profile request/response schemas mirroring contracts/user/openapi.yml."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.enums import TrainingLevel, TransformationGoal


class UserProfileResponse(BaseModel):
    """The current user's profile (contract `UserProfile`)."""

    user_id: uuid.UUID
    display_name: str
    identity_statement: str | None = None
    transformation_goal: TransformationGoal | None = None
    training_level: TrainingLevel | None = None
    weekly_target_days: int | None = None
    onboarding_completed: bool
    created_at: datetime


class UpdateProfileRequest(BaseModel):
    """Partial profile update; at least one field must be present."""

    display_name: str | None = Field(default=None, max_length=40)
    identity_statement: str | None = Field(default=None, max_length=280)
    transformation_goal: TransformationGoal | None = None
