"""Request/response schemas mirroring contracts/training/openapi.yml."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class SessionType(StrEnum):
    """Training session type — identical to the training.session_logged enum."""

    STRENGTH = "strength"
    RUNNING = "running"
    MOBILITY = "mobility"


class LogTrainingSessionRequest(BaseModel):
    session_type: SessionType
    duration_minutes: int = Field(ge=1)
    distance_km: float | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=500)
    logged_at: datetime | None = None


class TrainingSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    session_type: SessionType
    duration_minutes: int
    distance_km: float | None = None
    notes: str | None = None
    logged_at: datetime
    created_at: datetime


class Pagination(BaseModel):
    limit: int
    offset: int
    total: int


class TrainingSessionPage(BaseModel):
    items: list[TrainingSessionResponse]
    pagination: Pagination
