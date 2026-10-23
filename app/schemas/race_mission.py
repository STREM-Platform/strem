"""Athlete-entered Race Missions for any endurance race or self-set challenge.

A mission is the athlete's statement of commitment: the event (or challenge), the
goal, an optional cover photo with its attribution, and the preparation intake the
race engine plans around. Nothing here is inferred: absent facts stay null.
"""

import re
import uuid
from datetime import date, datetime
from typing import Literal, Self
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Sport = Literal[
    "trail_running",
    "road_running",
    "triathlon",
    "duathlon",
    "cycling",
    "gravel",
    "mountain_biking",
    "swimming",
    "hiking",
    "skimo",
    "nordic_skiing",
    "rowing",
    "hybrid",
    "multisport",
    "custom",
]
RaceFormat = Literal["single_day", "multi_stage", "non_stop"]
Support = Literal["aid_stations", "crewed", "self_supported", "unsupported"]
LegDiscipline = Literal["swim", "bike", "run", "hike", "paddle", "ski", "other"]
Weekday = Literal["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
Terrain = Literal[
    "flat_roads",
    "rolling_hills",
    "trails",
    "mountains",
    "track",
    "treadmill",
    "pool",
    "open_water",
    "indoor_trainer",
    "gym",
    "snow",
    "heat",
    "altitude",
]

_HTTP_URL = re.compile(r"^https?://[^\s]+$")


def _http_url(value: str | None) -> str | None:
    if value is not None and not _HTTP_URL.match(value):
        raise ValueError("Use an http(s) URL")
    return value


def _calendar_date(value: object) -> object:
    if value is None or type(value) is date:
        return value
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("Use a calendar date in YYYY-MM-DD format, not a timestamp")
    return value


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)


class RaceLeg(StrictModel):
    """One discipline of a multisport event, e.g. the 180 km bike of an Ironman."""

    discipline: LegDiscipline
    distance_km: float = Field(gt=0, le=10000)
    label: str | None = Field(default=None, max_length=60)


class RaceEvent(StrictModel):
    name: str = Field(min_length=2, max_length=160)
    race_date: date
    timezone: str = Field(min_length=1, max_length=64)
    location_name: str = Field(min_length=2, max_length=160)
    distance_km: float = Field(gt=0, le=10000, strict=True)
    elevation_gain_m: int | None = Field(default=None, ge=0, le=100000, strict=True)
    cutoff_minutes: int | None = Field(default=None, ge=1, le=43200, strict=True)
    sport: Sport = "trail_running"
    format: RaceFormat = "single_day"
    support: Support | None = None
    start_time: str | None = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    end_date: date | None = None
    stages: int | None = Field(default=None, ge=1, le=60)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    country_code: str | None = Field(default=None, pattern=r"^[A-Z]{2}$")
    website_url: str | None = Field(default=None, max_length=300)
    description: str | None = Field(default=None, max_length=1000)
    legs: list[RaceLeg] | None = Field(default=None, max_length=10)

    @field_validator("race_date", "end_date", mode="before")
    @classmethod
    def calendar_date_only(cls, value: object) -> object:
        return _calendar_date(value)

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("Use a valid IANA timezone, such as Europe/Sofia") from exc
        return value

    @field_validator("website_url")
    @classmethod
    def website_is_http(cls, value: str | None) -> str | None:
        return _http_url(value)

    @model_validator(mode="after")
    def consistent_shape(self) -> Self:
        if self.end_date is not None and self.end_date < self.race_date:
            raise ValueError("end_date cannot be before race_date")
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Provide latitude and longitude together")
        return self


class RaceGoal(StrictModel):
    outcome: Literal["finish_confidently", "finish", "target_time", "compete"]
    target_finish_minutes: int | None = Field(default=None, ge=1, le=43200, strict=True)
    motivation: str | None = Field(default=None, max_length=600)
    priority: Literal["A", "B", "C"] = "A"

    @model_validator(mode="after")
    def target_matches_outcome(self) -> Self:
        if self.outcome == "target_time" and self.target_finish_minutes is None:
            raise ValueError("A target finish time is required for a target_time goal")
        if self.outcome in ("finish", "finish_confidently") and self.target_finish_minutes:
            raise ValueError("A target finish time applies only to target_time or compete goals")
        return self


class CoverMedia(StrictModel):
    """A cover photo and the attribution its licence requires. Never scraped:
    openly licensed (Openverse, Wikimedia Commons) or supplied by the athlete."""

    url: str = Field(max_length=1000)
    thumb_url: str | None = Field(default=None, max_length=1000)
    title: str | None = Field(default=None, max_length=300)
    creator: str | None = Field(default=None, max_length=200)
    creator_url: str | None = Field(default=None, max_length=1000)
    license: str = Field(min_length=2, max_length=60)
    license_url: str | None = Field(default=None, max_length=300)
    source_url: str = Field(max_length=1000)
    provider: Literal["openverse", "wikimedia", "athlete"]
    depicts: Literal["event", "location", "atmosphere"] = "atmosphere"

    @field_validator("url", "thumb_url", "creator_url", "license_url", "source_url")
    @classmethod
    def urls_are_http(cls, value: str | None) -> str | None:
        return _http_url(value)


class Preparation(StrictModel):
    """What the athlete tells STREM about their starting point and real life."""

    experience: Literal["new", "some", "experienced", "elite"] | None = None
    start_date: date | None = None
    training_days_per_week: int | None = Field(default=None, ge=1, le=7)
    weekly_hours: float | None = Field(default=None, ge=0.5, le=40)
    long_session_day: Weekday | None = None
    current_weekly_km: float | None = Field(default=None, ge=0, le=2000)
    current_weekly_hours: float | None = Field(default=None, ge=0, le=60)
    longest_recent_km: float | None = Field(default=None, ge=0, le=1000)
    longest_recent_hours: float | None = Field(default=None, ge=0, le=72)
    strength_sessions_per_week: int | None = Field(default=None, ge=0, le=4)
    terrain_access: list[Terrain] = Field(default_factory=list, max_length=13)
    constraints: str | None = Field(default=None, max_length=600)
    home_location: str | None = Field(default=None, max_length=160)
    travel_notes: str | None = Field(default=None, max_length=400)

    @field_validator("start_date", mode="before")
    @classmethod
    def calendar_date_only(cls, value: object) -> object:
        return _calendar_date(value)


class RaceResultSummary(StrictModel):
    status: Literal["finished", "dnf", "dns"]
    finish_minutes: int | None = Field(default=None, ge=1, le=43200)
    placement: str | None = Field(default=None, max_length=80)
    rating: int | None = Field(default=None, ge=1, le=5)
    notes: str | None = Field(default=None, max_length=2000)
    lessons: list[str] = Field(default_factory=list, max_length=10)
    completed_at: datetime | None = None

    @field_validator("lessons")
    @classmethod
    def short_lessons(cls, value: list[str]) -> list[str]:
        if any(len(item) > 300 for item in value):
            raise ValueError("Keep each lesson under 300 characters")
        return [item.strip() for item in value if item.strip()]


class RaceMissionCreate(StrictModel):
    event: RaceEvent
    goal: RaceGoal
    cover: CoverMedia | None = None
    preparation: Preparation | None = None


class RaceMissionUpdate(StrictModel):
    event: RaceEvent | None = None
    goal: RaceGoal | None = None
    cover: CoverMedia | None = None
    preparation: Preparation | None = None
    correction_reason: str = Field(min_length=3, max_length=500)

    @model_validator(mode="after")
    def has_change(self) -> Self:
        changed = self.model_fields_set & {"event", "goal", "cover", "preparation"}
        if not changed:
            raise ValueError("Provide event, goal, cover or preparation")
        for key in ("event", "goal"):
            if key in self.model_fields_set and getattr(self, key) is None:
                raise ValueError(f"{key} cannot be null")
        return self


class ArchiveMission(StrictModel):
    reason: str = Field(min_length=3, max_length=500)


class CompleteMission(StrictModel):
    result: RaceResultSummary


class DeleteMissionData(StrictModel):
    confirmation: Literal["DELETE MY RACE MISSIONS"]


class RaceMission(StrictModel):
    id: uuid.UUID
    state: Literal["active", "archived", "completed"]
    event: RaceEvent
    goal: RaceGoal
    cover: CoverMedia | None = None
    preparation: Preparation | None = None
    result: RaceResultSummary | None = None
    source: Literal["athlete_entry"] = "athlete_entry"
    version: int = Field(ge=1)
    created_at: datetime
    updated_at: datetime


class RaceMissionList(StrictModel):
    items: list[RaceMission]


class RaceMissionRevision(StrictModel):
    mission: RaceMission
    reason: str


class RaceMissionExport(StrictModel):
    scope: Literal["race_missions"] = "race_missions"
    exported_at: datetime
    missions: list[RaceMission]
    revisions: list[RaceMissionRevision]
    layers: list[dict[str, object]] = Field(default_factory=list)
    courses: list[dict[str, object]] = Field(default_factory=list)
