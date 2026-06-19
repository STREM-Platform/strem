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
    TRAIL_RUNNING = "trail_running"
    CYCLING = "cycling"
    SWIMMING = "swimming"
    MOBILITY = "mobility"
    HYBRID = "hybrid"


# Disciplines for which a distance is meaningful.
DISTANCE_TYPES = {
    SessionType.RUNNING,
    SessionType.TRAIL_RUNNING,
    SessionType.CYCLING,
    SessionType.SWIMMING,
}


class LogTrainingSessionRequest(BaseModel):
    session_type: SessionType
    duration_minutes: int = Field(ge=1)
    distance_km: float | None = Field(default=None, ge=0)
    elevation_m: int | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=500)
    logged_at: datetime | None = None


class TrainingSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    session_type: SessionType
    duration_minutes: int
    distance_km: float | None = None
    elevation_m: int | None = None
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


class LogSetRequest(BaseModel):
    """One performed set in a live session (D1/D2)."""

    exercise: str = Field(min_length=1, max_length=80)
    set_index: int = Field(ge=0)
    reps: int = Field(ge=1)
    kg: float = Field(ge=0)
    rpe: int | None = Field(default=None, ge=1, le=10)
    base_rest_s: int = Field(default=90, ge=0)


class NextTargetResponse(BaseModel):
    """The autoregulated target for the next set."""

    rest_s: int
    load_kg: float
    message: str


class WorkoutSetResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    exercise: str
    set_index: int
    reps: int
    kg: float
    rpe: int | None = None
    rest_s: int | None = None
    done_at: datetime


class LogSetResponse(BaseModel):
    """The persisted set plus the autoregulated next-set target."""

    set: WorkoutSetResponse
    next_target: NextTargetResponse


class PersonalRecordResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    exercise: str
    reps: int
    kg: float
    estimated_1rm: float
    session_id: uuid.UUID
    achieved_at: datetime


class PersonalRecordPage(BaseModel):
    items: list[PersonalRecordResponse]
    pagination: Pagination


class FinishSessionResponse(BaseModel):
    """PRs detected when the live session was finished (may be empty)."""

    prs_detected: list[PersonalRecordResponse]


# ── Connected-source ingestion (A3) ──────────────────────────────────────────
class IntegrationSource(BaseModel):
    """One connectable source and its live connection state (FE `ContextSource`)."""

    id: str
    label: str
    icon: str
    on: bool
    last: str
    metric: str


class IntegrationSourceList(BaseModel):
    items: list[IntegrationSource]


class ConnectRequest(BaseModel):
    """The OAuth `code` (and redirect) returned by the provider's consent screen."""

    code: str = Field(min_length=1)
    redirect_uri: str = ""


class SyncResponse(BaseModel):
    """Counts of new records normalized in from a sync."""

    synced_sessions: int
    synced_recovery: int


class RecoverySampleResponse(BaseModel):
    id: uuid.UUID
    source: str
    date: datetime
    hrv_ms: float | None = None
    resting_hr: int | None = None
    sleep_hours: float | None = None
    recovery_score: int | None = None


class RecoverySampleList(BaseModel):
    items: list[RecoverySampleResponse]
