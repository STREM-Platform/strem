"""Athlete-entered Race Mission foundation. No inferred personal facts."""

import re
import uuid
from datetime import date, datetime
from typing import Literal, Self
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)


class RaceEvent(StrictModel):
    name: str = Field(min_length=2, max_length=160)
    race_date: date
    timezone: str = Field(min_length=1, max_length=64)
    location_name: str = Field(min_length=2, max_length=160)
    distance_km: float = Field(gt=0, le=500, strict=True)
    elevation_gain_m: int | None = Field(default=None, ge=0, le=30000, strict=True)
    cutoff_minutes: int | None = Field(default=None, ge=1, le=4320, strict=True)

    @field_validator("race_date", mode="before")
    @classmethod
    def calendar_date_only(cls, value: object) -> object:
        if type(value) is date:
            return value
        if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise ValueError("Use a calendar date in YYYY-MM-DD format, not a timestamp")
        return value

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("Use a valid IANA timezone, such as Europe/Sofia") from exc
        return value


class RaceGoal(StrictModel):
    outcome: Literal["finish_confidently", "finish", "target_time"]
    target_finish_minutes: int | None = Field(default=None, ge=1, le=4320, strict=True)

    @model_validator(mode="after")
    def target_matches_outcome(self) -> Self:
        if (self.outcome == "target_time") != (self.target_finish_minutes is not None):
            raise ValueError("A target finish time is required only for a target_time goal")
        return self


class RaceMissionCreate(StrictModel):
    event: RaceEvent
    goal: RaceGoal


class RaceMissionUpdate(StrictModel):
    event: RaceEvent | None = None
    goal: RaceGoal | None = None
    correction_reason: str = Field(min_length=3, max_length=500)

    @model_validator(mode="after")
    def has_change(self) -> Self:
        if self.event is None and self.goal is None:
            raise ValueError("Provide event or goal")
        for key in ("event", "goal"):
            if key in self.model_fields_set and getattr(self, key) is None:
                raise ValueError(f"{key} cannot be null")
        return self


class ArchiveMission(StrictModel):
    reason: str = Field(min_length=3, max_length=500)


class DeleteMissionData(StrictModel):
    confirmation: Literal["DELETE MY RACE MISSIONS"]


class RaceMission(StrictModel):
    id: uuid.UUID
    state: Literal["active", "archived"]
    event: RaceEvent
    goal: RaceGoal
    source: Literal["athlete_entry"] = "athlete_entry"
    version: int = Field(ge=1)
    created_at: datetime
    updated_at: datetime


class RaceMissionRevision(StrictModel):
    mission: RaceMission
    reason: str


class RaceMissionExport(StrictModel):
    scope: Literal["race_missions"] = "race_missions"
    exported_at: datetime
    missions: list[RaceMission]
    revisions: list[RaceMissionRevision]
    courses: list[dict[str, object]] = Field(default_factory=list)
