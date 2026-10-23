"""Training plan documents for a Race Mission (docs#26).

A plan is phases -> weeks -> sessions from the plan start to race day. The race
engine, the AI and the athlete all write this same shape; `origin` records who
produced the current version. Athlete-owned session state (status, note, RPE,
matched activities) survives regeneration.
"""

from __future__ import annotations

import datetime as dt
import re
import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

PlanSport = Literal[
    "running",
    "trail_running",
    "cycling",
    "swimming",
    "strength",
    "mobility",
    "hiking",
    "rowing",
    "skiing",
    "hybrid",
    "brick",
    "rest",
    "other",
]
SessionKind = Literal[
    "easy",
    "long",
    "tempo",
    "intervals",
    "hills",
    "recovery",
    "strength",
    "mobility",
    "race_sim",
    "brick",
    "back_to_back",
    "technique",
    "test",
    "cross",
    "rest",
    "race",
]
Intensity = Literal["rest", "very_easy", "easy", "moderate", "steady", "threshold", "hard", "race"]
SessionStatus = Literal["planned", "done", "partial", "skipped", "moved"]
Phase = Literal["base", "build", "specific", "peak", "taper", "race", "recovery"]
Origin = Literal["engine", "ai", "athlete"]

_SLUG = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")


def _slug(value: str) -> str:
    if not _SLUG.match(value):
        raise ValueError("Ids are lowercase slugs: a-z, 0-9, '-', '_' (max 64)")
    return value


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)


class PlanSession(StrictModel):
    id: str
    date: dt.date
    sport: PlanSport
    kind: SessionKind
    title: str = Field(min_length=1, max_length=120)
    purpose: str = Field(default="", max_length=600)
    duration_minutes: int | None = Field(default=None, ge=0, le=1440)
    distance_km: float | None = Field(default=None, ge=0, le=1000)
    elevation_m: int | None = Field(default=None, ge=0, le=20000)
    intensity: Intensity = "easy"
    structure: list[str] = Field(default_factory=list, max_length=12)
    fueling: str | None = Field(default=None, max_length=300)
    terrain: str | None = Field(default=None, max_length=120)
    key: bool = False
    status: SessionStatus = "planned"
    matched_session_ids: list[uuid.UUID] = Field(default_factory=list, max_length=6)
    athlete_note: str | None = Field(default=None, max_length=500)
    rpe: int | None = Field(default=None, ge=1, le=10)

    @field_validator("id")
    @classmethod
    def slug_id(cls, value: str) -> str:
        return _slug(value)

    @field_validator("structure")
    @classmethod
    def short_steps(cls, value: list[str]) -> list[str]:
        if any(len(step) > 200 for step in value):
            raise ValueError("Keep each structure step under 200 characters")
        return value


class PlanWeek(StrictModel):
    index: int = Field(ge=1, le=80)
    start_date: dt.date
    phase: Phase
    focus: str = Field(min_length=1, max_length=240)
    target_hours: float | None = Field(default=None, ge=0, le=60)
    target_km: float | None = Field(default=None, ge=0, le=3000)
    target_elevation_m: int | None = Field(default=None, ge=0, le=50000)
    long_session: str | None = Field(default=None, max_length=160)
    sessions: list[PlanSession] = Field(default_factory=list, max_length=21)
    notes: str | None = Field(default=None, max_length=600)


class PlanPhase(StrictModel):
    phase: Phase
    start_date: dt.date
    end_date: dt.date
    goal: str = Field(min_length=1, max_length=300)


class PlanContent(StrictModel):
    headline: str = Field(min_length=1, max_length=200)
    summary: str = Field(default="", max_length=2400)
    sport: str = Field(min_length=1, max_length=40)
    timezone: str = Field(default="UTC", max_length=64)
    start_date: dt.date
    race_date: dt.date
    phases: list[PlanPhase] = Field(default_factory=list, max_length=8)
    weeks: list[PlanWeek] = Field(default_factory=list, max_length=80)
    principles: list[str] = Field(default_factory=list, max_length=10)
    assumptions: list[str] = Field(default_factory=list, max_length=16)
    warnings: list[str] = Field(default_factory=list, max_length=12)

    @field_validator("principles", "assumptions", "warnings")
    @classmethod
    def short_lines(cls, value: list[str]) -> list[str]:
        if any(len(line) > 400 for line in value):
            raise ValueError("Keep each line under 400 characters")
        return value

    @model_validator(mode="after")
    def coherent(self) -> PlanContent:
        if self.race_date < self.start_date:
            raise ValueError("race_date cannot be before start_date")
        ids = [s.id for w in self.weeks for s in w.sessions]
        if len(set(ids)) != len(ids):
            raise ValueError("Session ids must be unique within a plan")
        indexes = [w.index for w in self.weeks]
        if indexes != sorted(indexes) or len(set(indexes)) != len(indexes):
            raise ValueError("Weeks must be in ascending, unique index order")
        return self


class PlanWrite(StrictModel):
    content: PlanContent
    origin: Origin
    model: str | None = Field(default=None, max_length=80)
    inputs_digest: str | None = Field(default=None, max_length=64)


class SessionPatch(StrictModel):
    status: SessionStatus | None = None
    athlete_note: str | None = Field(default=None, max_length=500)
    rpe: int | None = Field(default=None, ge=1, le=10)
    date: dt.date | None = None
    matched_session_ids: list[uuid.UUID] | None = Field(default=None, max_length=6)

    @model_validator(mode="after")
    def has_change(self) -> SessionPatch:
        fields = {"status", "athlete_note", "rpe", "date", "matched_session_ids"}
        if not self.model_fields_set & fields:
            raise ValueError("Provide at least one change")
        for key in ("status", "date", "matched_session_ids"):
            if key in self.model_fields_set and getattr(self, key) is None:
                raise ValueError(f"{key} cannot be null")
        return self


class MissionPlan(StrictModel):
    mission_id: uuid.UUID
    version: int = Field(ge=1)
    origin: Origin
    model: str | None = None
    inputs_digest: str | None = None
    content: PlanContent
    created_at: dt.datetime
    updated_at: dt.datetime


# ── Progress (the tracker) ───────────────────────────────────────────────────


class Volume(BaseModel):
    sessions: int = 0
    hours: float = 0.0
    km: float = 0.0
    elevation_m: int = 0


class ActivityRef(BaseModel):
    id: uuid.UUID
    date: dt.date
    session_type: str
    title: str | None = None
    duration_minutes: int
    distance_km: float | None = None
    elevation_m: int | None = None
    source: str
    is_race: bool = False


class SessionProgress(BaseModel):
    id: str
    date: dt.date
    week_index: int
    title: str
    kind: str
    sport: str
    key: bool
    planned_minutes: int | None = None
    planned_km: float | None = None
    # done/partial come from a matched activity or the athlete; missed is derived
    # only for past sessions with no evidence; planned = upcoming.
    derived_status: Literal["done", "partial", "missed", "skipped", "moved", "planned", "rest"]
    status_source: Literal["athlete", "matched", "derived"]
    matched: list[ActivityRef] = Field(default_factory=list)


class WeekProgress(BaseModel):
    index: int
    start_date: dt.date
    phase: str
    focus: str
    timing: Literal["past", "current", "future"]
    planned: Volume
    actual: Volume
    completion_pct: int | None = None


class LongSessionPoint(BaseModel):
    date: dt.date
    planned_minutes: int | None = None
    planned_km: float | None = None
    actual_minutes: int | None = None
    actual_km: float | None = None
    status: str


class ProgressTotals(BaseModel):
    planned_to_date: int = 0
    completed: int = 0
    partial: int = 0
    missed: int = 0
    consistency_pct: int | None = None
    key_planned_to_date: int = 0
    key_completed: int = 0
    done: Volume = Field(default_factory=Volume)


class EvidenceWeek(BaseModel):
    start_date: dt.date
    volume: Volume
    longest_minutes: int = 0
    longest_km: float | None = None


class EvidenceSummary(BaseModel):
    """What the athlete has actually done recently, with or without a plan."""

    weeks: list[EvidenceWeek]
    longest_recent: ActivityRef | None = None
    races_recorded: int = 0
    last_activity: ActivityRef | None = None


class MissionProgress(BaseModel):
    mission_id: uuid.UUID
    as_of: dt.date
    plan_version: int | None = None
    totals: ProgressTotals | None = None
    weeks: list[WeekProgress] = Field(default_factory=list)
    sessions: list[SessionProgress] = Field(default_factory=list)
    long_sessions: list[LongSessionPoint] = Field(default_factory=list)
    unplanned: list[ActivityRef] = Field(default_factory=list)
    evidence: EvidenceSummary
