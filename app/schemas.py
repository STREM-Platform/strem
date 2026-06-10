"""Request/response schemas mirroring contracts/ai/openapi.yml."""

from __future__ import annotations

import uuid
from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel

from app.enums import MissionDifficulty, MissionState, MissionType


class Mission(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: str
    duration_days: int
    xp_reward: int
    type: MissionType
    completion_condition: str
    difficulty: MissionDifficulty
    state: MissionState
    generated_at: datetime
    expires_at: datetime
    completed_at: datetime | None = None


class MissionList(BaseModel):
    items: list[Mission]


class Pagination(BaseModel):
    limit: int
    offset: int
    total: int


class MissionPage(BaseModel):
    items: list[Mission]
    pagination: Pagination


class MissionGenerationResult(BaseModel):
    missions: list[Mission]
    generated_count: int
    reason: str | None = None


class WeeklyRecap(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    week_start: date_type
    week_end: date_type
    narrative: str
    generated_at: datetime


class WeeklyRecapPage(BaseModel):
    items: list[WeeklyRecap]
    pagination: Pagination


class Season(BaseModel):
    """A seasonal arc: a themed, time-boxed window with an XP multiplier (P2-03)."""

    key: str
    name: str
    theme: str
    xp_multiplier: float
    starts_on: date_type
    ends_on: date_type


class SeasonStatus(BaseModel):
    """Whether a season is currently running, and which one."""

    active: bool
    season: Season | None = None


class CoachAdaptation(BaseModel):
    """The coach's current proactive adaptation (P2-04)."""

    signal: str
    headline: str
    action: str
