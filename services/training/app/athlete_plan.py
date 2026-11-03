"""The athlete's plan: one timeline before, between and after races (issue #23).

Two kinds of stored plans feed it:

- mission plans (``mission_plans``) — built for one Race Mission, unchanged;
- the base plan (``athlete_plans``) — the athlete's own ongoing training with no
  race attached (an imported weekly template, an off-season block).

``compose`` lays them on one calendar. For each week the governing race is the
highest-priority upcoming race whose plan covers that week (A before B before C,
then the nearest); a week no race plan covers falls back to the base plan. Race
days of other races in a governed week stay visible as race sessions. Session
ids are prefixed by source (``m<8 hex>-`` / ``b-``) so one PATCH route can find
the owning plan. Nothing is copied: edits go to the source plan.
"""

from __future__ import annotations

import datetime as dt
import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any, Literal

import httpx
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import JSON, DateTime, Integer, String, delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.courses import lock_owner
from app.db import Base
from app.errors import AppError
from app.plan_schemas import (
    MissionPlan,
    Origin,
    PlanContent,
    PlanPhase,
    PlanSession,
    PlanWeek,
    SessionPatch,
    StrictModel,
)

PRIORITY_RANK = {"A": 0, "B": 1, "C": 2}
HISTORY_WEEKS = 12
MAX_WEEKS = 80


class AthletePlanRecord(Base):
    __tablename__ = "athlete_plans"
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    version: Mapped[int] = mapped_column(Integer)
    origin: Mapped[str] = mapped_column(String(16))
    model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    content: Mapped[dict[str, object]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


# ── Schemas ──────────────────────────────────────────────────────────────────


class BasePlanContent(PlanContent):
    """A plan with no race: `race_date` is empty."""

    race_date: dt.date | None = None  # type: ignore[assignment]

    @model_validator(mode="after")
    def coherent(self) -> BasePlanContent:
        if self.race_date is not None and self.race_date < self.start_date:
            raise ValueError("race_date cannot be before start_date")
        ids = [s.id for w in self.weeks for s in w.sessions]
        if len(set(ids)) != len(ids):
            raise ValueError("Session ids must be unique within a plan")
        indexes = [w.index for w in self.weeks]
        if indexes != sorted(indexes) or len(set(indexes)) != len(indexes):
            raise ValueError("Weeks must be in ascending, unique index order")
        return self


class BasePlanWrite(StrictModel):
    content: BasePlanContent
    origin: Origin
    model: str | None = Field(default=None, max_length=80)


class BasePlan(StrictModel):
    version: int = Field(ge=1)
    origin: Origin
    model: str | None = None
    content: BasePlanContent
    created_at: dt.datetime
    updated_at: dt.datetime


class TimelineSession(PlanSession):
    @field_validator("id")
    @classmethod
    def slug_id(cls, value: str) -> str:  # source-prefixed ids may exceed the slug limit
        return value


class TimelineWeek(PlanWeek):
    index: int = Field(ge=1, le=MAX_WEEKS)
    sessions: list[TimelineSession] = Field(default_factory=list, max_length=28)  # type: ignore[assignment]
    source: Literal["race", "season", "base"]
    mission_id: uuid.UUID | None = None
    season_id: uuid.UUID | None = None
    origin: Origin


class TimelineContent(BasePlanContent):
    phases: list[PlanPhase] = Field(default_factory=list, max_length=60)
    weeks: list[TimelineWeek] = Field(default_factory=list, max_length=MAX_WEEKS)  # type: ignore[assignment]


class TimelineRace(BaseModel):
    mission_id: uuid.UUID
    name: str
    race_date: dt.date
    priority: Literal["A", "B", "C"]
    sport: str
    state: Literal["active", "completed"]
    has_plan: bool


class TimelineSeason(BaseModel):
    id: uuid.UUID
    name: str
    start_date: dt.date
    end_date: dt.date
    focus: str
    has_plan: bool
    current: bool


class AthletePlan(BaseModel):
    as_of: dt.date
    content: TimelineContent | None = None
    races: list[TimelineRace] = Field(default_factory=list)
    seasons: list[TimelineSeason] = Field(default_factory=list)
    base_version: int | None = None
    next_race: TimelineRace | None = None


# ── Base plan storage ────────────────────────────────────────────────────────


def to_base(record: AthletePlanRecord) -> BasePlan:
    return BasePlan.model_validate(
        {
            "version": record.version,
            "origin": record.origin,
            "model": record.model,
            "content": record.content,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
        }
    )


async def get_base(session: AsyncSession, user_id: uuid.UUID) -> BasePlan | None:
    record = await session.get(AthletePlanRecord, user_id)
    return to_base(record) if record else None


async def put_base(
    session: AsyncSession, user_id: uuid.UUID, body: BasePlanWrite, expected: int | None
) -> BasePlan:
    from app.plans import ANY_VERSION, preserve_athlete_state

    await lock_owner(session, user_id)
    existing = await session.get(AthletePlanRecord, user_id)
    now = datetime.now(UTC)
    if existing is None:
        if expected not in (None, 0, ANY_VERSION):
            raise AppError(412, "version_conflict", "This plan does not exist yet.")
        existing = AthletePlanRecord(
            user_id=user_id,
            version=1,
            origin=body.origin,
            model=body.model,
            content=body.content.model_dump(mode="json"),
            created_at=now,
            updated_at=now,
        )
        session.add(existing)
    else:
        if expected is None or (expected != ANY_VERSION and expected != existing.version):
            raise AppError(412, "version_conflict", "This plan changed. Reload before saving.")
        existing.content = preserve_athlete_state(existing.content, body.content)
        existing.version += 1
        existing.origin = body.origin
        existing.model = body.model
        existing.updated_at = now
    await session.commit()
    return to_base(existing)


async def delete_base(session: AsyncSession, user_id: uuid.UUID) -> None:
    await lock_owner(session, user_id)
    record = await session.get(AthletePlanRecord, user_id)
    if record is not None:
        await session.delete(record)
        await session.commit()


async def patch_base_session(
    session: AsyncSession, user_id: uuid.UUID, session_id: str, body: SessionPatch
) -> None:
    from app.plans import apply_session_patch

    await lock_owner(session, user_id)
    record = await session.get(AthletePlanRecord, user_id)
    if record is None:
        raise AppError(404, "plan_not_found", "You have no plan outside your races yet.")
    content = apply_session_patch(dict(record.content), session_id, body)
    record.content = BasePlanContent.model_validate(content).model_dump(mode="json")
    record.version += 1
    record.updated_at = datetime.now(UTC)
    await session.commit()


async def purge_base(session: AsyncSession, user_id: uuid.UUID) -> None:
    await session.execute(delete(AthletePlanRecord).where(AthletePlanRecord.user_id == user_id))


# ── Races from user-service ─────────────────────────────────────────────────


async def athlete_races(token: str, base_url: str) -> list[dict[str, Any]]:
    """Active and completed Race Missions, read with the athlete's own token."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            result = await client.get(
                f"{base_url.rstrip('/')}/race-missions",
                headers={"Authorization": f"Bearer {token}"},
            )
        if result.status_code != 200:
            raise ValueError
        items = result.json().get("items")
        if not isinstance(items, list):
            raise ValueError
    except (httpx.HTTPError, ValueError, AttributeError):
        raise AppError(
            503, "missions_unavailable", "Your races could not be loaded. Retry."
        ) from None
    races = []
    for item in items:
        try:
            if item.get("state") not in ("active", "completed"):
                continue
            event, goal = item["event"], item.get("goal") or {}
            races.append(
                {
                    "mission_id": uuid.UUID(str(item["id"])),
                    "name": str(event.get("name") or "Race"),
                    "race_date": date.fromisoformat(str(event["race_date"])),
                    "priority": goal.get("priority")
                    if goal.get("priority") in PRIORITY_RANK
                    else "A",
                    "sport": str(event.get("sport") or "trail_running"),
                    "state": item["state"],
                }
            )
        except (KeyError, TypeError, ValueError):
            continue
    return races


# ── Composition ──────────────────────────────────────────────────────────────


def monday(day: date) -> date:
    return day - timedelta(days=day.weekday())


def prefix_for(mission_id: uuid.UUID | None) -> str:
    return f"m{mission_id.hex[:8]}-" if mission_id else "b-"


def season_prefix(season_id: uuid.UUID) -> str:
    return f"s{season_id.hex[:8]}-"


def _sessions(week: dict[str, Any], prefix: str) -> list[dict[str, Any]]:
    return [{**s, "id": f"{prefix}{s['id']}"} for s in week.get("sessions", [])]


def compose(
    races: list[dict[str, Any]],
    plans: dict[uuid.UUID, MissionPlan],
    base: BasePlan | None,
    today: date,
    seasons: list[Any] | None = None,
) -> AthletePlan:
    meta = [
        TimelineRace(**race, has_plan=race["mission_id"] in plans)
        for race in sorted(races, key=lambda r: (r["race_date"], PRIORITY_RANK[r["priority"]]))
    ]
    upcoming = [r for r in meta if r.state == "active" and r.race_date >= today]
    next_race = next((r for r in upcoming if r.priority != "C"), upcoming[0] if upcoming else None)
    # Candidates per calendar week (Monday): race weeks up to race day, then base weeks.
    candidates: dict[
        date, list[tuple[TimelineRace | None, dict[str, Any], MissionPlan | BasePlan]]
    ] = {}
    for race in meta:
        plan = plans.get(race.mission_id)
        if plan is None:
            continue
        for week in plan.content.model_dump(mode="json")["weeks"]:
            start = monday(date.fromisoformat(week["start_date"]))
            if start <= race.race_date:
                candidates.setdefault(start, []).append((race, week, plan))
    if base is not None:
        for week in base.content.model_dump(mode="json")["weeks"]:
            start = monday(date.fromisoformat(week["start_date"]))
            candidates.setdefault(start, []).append((None, week, base))
    # Season plans (#18): a week inside a season follows that season's plan when no race governs it.
    seasons = seasons or []
    season_weeks: dict[date, tuple[dict[str, Any], Any]] = {}
    for season in seasons:
        if season.plan is None:
            continue
        for week in season.plan.model_dump(mode="json")["weeks"]:
            start = monday(date.fromisoformat(week["start_date"]))
            if season.start_date - timedelta(days=6) <= start <= season.end_date:
                season_weeks[start] = (week, season)
                candidates.setdefault(start, [])
    season_meta = [
        TimelineSeason(
            id=s.id,
            name=s.name,
            start_date=s.start_date,
            end_date=s.end_date,
            focus=s.focus,
            has_plan=s.plan is not None,
            current=s.start_date <= today <= s.end_date,
        )
        for s in seasons
    ]
    if not candidates:
        return AthletePlan(
            as_of=today,
            races=meta,
            seasons=season_meta,
            base_version=base.version if base else None,
            next_race=next_race,
        )

    floor = monday(today) - timedelta(weeks=HISTORY_WEEKS)
    mondays = sorted(m for m in candidates if m >= floor)[:MAX_WEEKS]
    weeks: list[dict[str, Any]] = []
    for index, start in enumerate(mondays, start=1):
        options = candidates[start]
        racing = [(r, w, p) for r, w, p in options if r is not None]
        owner: Any
        season_id = None
        if racing:
            lead, week, owner = min(
                racing, key=lambda c: (PRIORITY_RANK[c[0].priority], c[0].race_date)
            )
            sessions = _sessions(week, prefix_for(lead.mission_id))
            # Other races' race days in this week stay on the calendar — unless the
            # governing plan already placed that race (the engine fits B/C races in).
            raced = {x["date"] for x in sessions if x.get("kind") == "race"}
            for other, other_week, _ in racing:
                if other is not lead:
                    extra = _sessions(other_week, prefix_for(other.mission_id))
                    sessions += [
                        x for x in extra if x.get("kind") == "race" and x["date"] not in raced
                    ]
            source, mission_id = "race", lead.mission_id
        elif start in season_weeks:
            week, season = season_weeks[start]
            sessions, source, mission_id = _sessions(week, season_prefix(season.id)), "season", None
            season_id, owner = season.id, season
        else:
            _, week, owner = options[0]
            sessions, source, mission_id = _sessions(week, "b-"), "base", None
        if season_id is None:
            season_id = next((s.id for s in seasons if s.start_date <= start <= s.end_date), None)
        weeks.append(
            {
                **week,
                "index": index,
                "start_date": start.isoformat(),
                "sessions": sorted(sessions, key=lambda s: s["date"]),
                "source": source,
                "mission_id": mission_id,
                "season_id": season_id,
                "origin": getattr(owner, "plan_origin", None) or owner.origin,
            }
        )
    phases: list[dict[str, Any]] = []
    for week in weeks:
        end = (date.fromisoformat(week["start_date"]) + timedelta(days=6)).isoformat()
        key = (week["phase"], week["mission_id"], week["season_id"])
        if phases and phases[-1]["_key"] == key:
            phases[-1]["end_date"] = end
        else:
            phases.append(
                {
                    "_key": key,
                    "phase": week["phase"],
                    "start_date": week["start_date"],
                    "end_date": end,
                    "goal": week["focus"][:300],
                }
            )
    for phase in phases:
        phase.pop("_key")
    governing = next_race or (meta[-1] if meta else None)
    timezone = next(
        (p.content.timezone for p in plans.values()),
        base.content.timezone if base else "UTC",
    )
    content = TimelineContent.model_validate(
        {
            "headline": "Your plan",
            "summary": _summary(meta, base, today),
            "sport": governing.sport if governing else (base.content.sport if base else "running"),
            "timezone": timezone,
            "start_date": weeks[0]["start_date"],
            "race_date": next_race.race_date if next_race else None,
            "phases": phases[:60],
            "weeks": weeks,
        }
    )
    return AthletePlan(
        as_of=today,
        content=content,
        races=meta,
        seasons=season_meta,
        base_version=base.version if base else None,
        next_race=next_race,
    )


def _summary(races: list[TimelineRace], base: BasePlan | None, today: date) -> str:
    ahead = [r for r in races if r.state == "active" and r.race_date >= today]
    parts = []
    if ahead:
        names = ", ".join(f"{r.name} ({r.priority})" for r in ahead[:4])
        parts.append(f"{len(ahead)} race{'s' if len(ahead) != 1 else ''} ahead: {names}.")
    if base is not None:
        parts.append("Weeks no race plan covers follow your own plan.")
    return " ".join(parts)


def split_session_id(composed: str) -> tuple[str | None, str]:
    """`m1a2b3c4d-w3-long` → ("m1a2b3c4d", "w3-long"): a race plan; `s…` a season plan;
    `b-…` → (None, "…"): the base plan."""
    if composed.startswith("b-"):
        return None, composed[2:]
    if len(composed) > 10 and composed[0] in "ms" and composed[9] == "-":
        return composed[:9], composed[10:]
    raise AppError(404, "plan_session_not_found", "That session is not part of your plan.")


async def mission_plans(session: AsyncSession, user_id: uuid.UUID) -> dict[uuid.UUID, MissionPlan]:
    from app.plans import MissionPlanRecord, to_plan

    rows = await session.scalars(
        select(MissionPlanRecord).where(MissionPlanRecord.user_id == user_id)
    )
    return {row.mission_id: to_plan(row) for row in rows}


class AthleteProgress(BaseModel):
    """The tracker for the whole timeline (same shape as mission progress, no mission id)."""

    as_of: dt.date
    plan_version: int | None = None
    totals: Any = None
    weeks: list[Any] = Field(default_factory=list)
    sessions: list[Any] = Field(default_factory=list)
    long_sessions: list[Any] = Field(default_factory=list)
    unplanned: list[Any] = Field(default_factory=list)
    evidence: Any
