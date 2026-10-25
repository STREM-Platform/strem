"""Race history: the athlete's previous races and what they learned from them.

Entries come from the athlete, from a completed Race Mission, or from races a
connected source flagged (e.g. a Strava activity marked as a race). The AI reads
them as evidence of experience — finish times, DNFs, fueling and gear lessons.
"""

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import Field, field_validator

from app.schemas.race_mission import Sport, StrictModel, _calendar_date

ResultSource = Literal["athlete", "mission", "strava"]


class RaceResultInput(StrictModel):
    name: str = Field(min_length=2, max_length=160)
    race_date: date
    sport: Sport = "trail_running"
    location_name: str | None = Field(default=None, max_length=160)
    distance_km: float | None = Field(default=None, gt=0, le=10000)
    elevation_gain_m: int | None = Field(default=None, ge=0, le=100000)
    status: Literal["finished", "dnf", "dns"] = "finished"
    finish_minutes: int | None = Field(default=None, ge=1, le=43200)
    placement: str | None = Field(default=None, max_length=80)
    rating: int | None = Field(default=None, ge=1, le=5)
    conditions: str | None = Field(default=None, max_length=300)
    fueling_notes: str | None = Field(default=None, max_length=600)
    gear_notes: str | None = Field(default=None, max_length=600)
    notes: str | None = Field(default=None, max_length=2000)
    lessons: list[str] = Field(default_factory=list, max_length=10)

    @field_validator("race_date", mode="before")
    @classmethod
    def calendar_date_only(cls, value: object) -> object:
        return _calendar_date(value)

    @field_validator("lessons")
    @classmethod
    def short_lessons(cls, value: list[str]) -> list[str]:
        if any(len(item) > 300 for item in value):
            raise ValueError("Keep each lesson under 300 characters")
        return [item.strip() for item in value if item.strip()]


class ImportedRace(RaceResultInput):
    external_id: str = Field(min_length=1, max_length=80)


class RaceImport(StrictModel):
    source: Literal["strava"]
    items: list[ImportedRace] = Field(max_length=200)


class RaceResult(RaceResultInput):
    id: uuid.UUID
    source: ResultSource
    mission_id: uuid.UUID | None = None
    external_id: str | None = None
    created_at: datetime
    updated_at: datetime


class RaceResultList(StrictModel):
    items: list[RaceResult]


class RaceImportResult(StrictModel):
    created: int
    updated: int
    items: list[RaceResult]
