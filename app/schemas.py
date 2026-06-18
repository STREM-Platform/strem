"""Request/response schemas mirroring contracts/ai/openapi.yml."""

from __future__ import annotations

import uuid
from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.enums import MissionDifficulty, MissionState, MissionType


class CamelModel(BaseModel):
    """Base for the Forge agent schemas — serialised as camelCase to match the
    frontend contract in ``strem-mobile/lib/agent/types.ts``."""

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)


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


class TribeCoachSummary(BaseModel):
    """An identity-grounded narrative over a tribe's weekly accountability (MVP-16)."""

    tribe_id: uuid.UUID
    name: str
    narrative: str
    tribe_power: int
    checkins_this_week: int
    active_member_count: int
    inactive_member_count: int


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


# ── Forge agent: context graph (A6) + signals (A4) + memory (A5) ──────────────
class ContextSource(CamelModel):
    """A connected source feeding the graph ("What your coach sees")."""

    id: str
    label: str
    icon: str
    on: bool
    last: str
    metric: str


class ContextSignals(CamelModel):
    """Derived signals the coach reasons over (A4). Recovery fields are nullable
    until a wearable is connected — never fabricated."""

    readiness: int
    readiness_label: str
    sleep_hours: str | None = None
    sleep_delta: str | None = None
    hrv: int | None = None
    hrv_delta: str | None = None
    resting_hr: int | None = None
    load7: int
    load28: int
    acwr: float
    load_label: str
    momentum: str
    streak_risk: bool


class MemoryItem(CamelModel):
    """A long-term memory the coach remembers so it never re-asks (A5)."""

    icon: str
    text: str


class AthleteContext(CamelModel):
    """The one graph snapshot every Forge surface reads (A6)."""

    sources: list[ContextSource]
    signals: ContextSignals
    memory: list[MemoryItem]


class MemoryCreate(CamelModel):
    icon: str
    text: str


class MemoryList(CamelModel):
    items: list[MemoryItem]


# ── Forge agent: chat (B1) + action log (B3) ─────────────────────────────────
class CitedDatum(CamelModel):
    """A grounding chip — one of the user's own signals the agent cited."""

    icon: str
    text: str


class ChatRequest(CamelModel):
    message: str


class CoachReply(CamelModel):
    """A cited, grounded coach reply (B1)."""

    text: str
    cites: list[CitedDatum] = []


class ActionCreate(CamelModel):
    """Request a typed agent action (the FE tool helpers post this)."""

    capability: str
    type: str
    summary: str
    reasoning: str
    cited_data: list[CitedDatum] = []


class AgentActionOut(CamelModel):
    """A recorded agent action (B3) — reasoning + cited data + status."""

    id: uuid.UUID
    capability: str
    type: str
    summary: str
    reasoning: str
    cited_data: list[CitedDatum]
    status: str
    autonomy: str
    created_at: datetime


class AgentActionPage(CamelModel):
    items: list[AgentActionOut]
    pagination: Pagination


# ── Forge agent: insights (B8) + adaptive plan (B4) ──────────────────────────
class Insight(CamelModel):
    """A cross-domain correlation, grounded in a sample size (B8)."""

    icon: str
    tone: str  # "green" | "amber" | "red"
    title: str
    body: str
    chip: str


class InsightList(CamelModel):
    items: list[Insight]


class AdaptiveMission(CamelModel):
    icon: str
    title: str
    tone: str  # "green" | "amber" | "red"
    xp: int
    days: int
    why: str


class AdaptivePlan(CamelModel):
    """Readiness-aware mission suggestions for the Coach Plan view (B4)."""

    reason: str
    missions: list[AdaptiveMission]
