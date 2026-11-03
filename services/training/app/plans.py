"""Mission training plans and the progress tracker (docs#26).

Plans share the course owner-generation fence: a mission-data purge bumps the
generation and deletes plans with courses, so a late write cannot resurrect a
deleted plan. Progress compares the plan with sessions the athlete logged or
imported. A past session with no evidence is "missed" — derived, and labelled as
such — never silently marked done.
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import UTC, date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import JSON, DateTime, Integer, String, delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.courses import lock_owner
from app.db import Base
from app.errors import AppError
from app.models import TrainingSession
from app.plan_schemas import (
    ActivityRef,
    EvidenceSummary,
    EvidenceWeek,
    LongSessionPoint,
    MissionPlan,
    MissionProgress,
    PlanContent,
    PlanWrite,
    ProgressTotals,
    SessionPatch,
    SessionProgress,
    Volume,
    WeekProgress,
)

ANY_VERSION = -1
PARTIAL_THRESHOLD = 0.6

# Which logged session types count as evidence for a planned sport.
COMPATIBLE: dict[str, set[str]] = {
    "running": {"running", "trail_running"},
    "trail_running": {"trail_running", "running", "hiking"},
    "cycling": {"cycling"},
    "swimming": {"swimming"},
    "strength": {"strength", "hybrid"},
    "mobility": {"mobility"},
    "hiking": {"hiking", "trail_running"},
    "rowing": {"rowing"},
    "skiing": {"skiing"},
    "hybrid": {"hybrid", "strength"},
    "brick": {"cycling", "running", "trail_running"},
}


class MissionPlanRecord(Base):
    __tablename__ = "mission_plans"
    mission_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    version: Mapped[int] = mapped_column(Integer)
    origin: Mapped[str] = mapped_column(String(16))
    model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    inputs_digest: Mapped[str | None] = mapped_column(String(64), nullable=True)
    content: Mapped[dict[str, object]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


def parse_if_match(value: str | None) -> int | None:
    if value is None:
        return None
    value = value.strip()
    if value == "*":
        return ANY_VERSION
    if len(value) >= 3 and value[0] == value[-1] == '"' and value[1:-1].isdigit():
        number = int(value[1:-1])
        if number <= 10**9:
            return number
    raise AppError(400, "invalid_if_match", 'If-Match must be "*", or a quoted version like "3".')


def to_plan(record: MissionPlanRecord) -> MissionPlan:
    return MissionPlan.model_validate(
        {
            "mission_id": record.mission_id,
            "version": record.version,
            "origin": record.origin,
            "model": record.model,
            "inputs_digest": record.inputs_digest,
            "content": record.content,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
        }
    )


def _check_generation(owner_generation: int, access: dict[str, object]) -> None:
    if owner_generation != access["generation"]:
        raise AppError(409, "course_generation_conflict", "Mission data changed. Reload and retry.")


_ATHLETE_KEYS = ("status", "matched_session_ids", "athlete_note", "rpe")


def preserve_athlete_state(previous: dict[str, Any], incoming: PlanContent) -> dict[str, Any]:
    """Carry athlete-owned session state into a regenerated plan by session id."""
    kept: dict[str, dict[str, Any]] = {}
    for week in previous.get("weeks", []):
        for session in week.get("sessions", []):
            if (
                session.get("status", "planned") != "planned"
                or session.get("matched_session_ids")
                or session.get("athlete_note")
                or session.get("rpe")
            ):
                kept[str(session.get("id"))] = session
    content = incoming.model_dump(mode="json")
    for week in content["weeks"]:
        for session in week["sessions"]:
            old = kept.get(session["id"])
            if old is None:
                continue
            for key in _ATHLETE_KEYS:
                default: object = "planned" if key == "status" else None
                if key == "matched_session_ids":
                    default = []
                if session.get(key) in (default, None, []) and old.get(key) not in (None, []):
                    session[key] = old[key]
    return content


async def _record(
    session: AsyncSession, user_id: uuid.UUID, mission_id: uuid.UUID
) -> MissionPlanRecord | None:
    record = await session.get(MissionPlanRecord, mission_id)
    if record is not None and record.user_id != user_id:
        return None
    return record


async def get_plan(
    session: AsyncSession, user_id: uuid.UUID, mission_id: uuid.UUID, access: dict[str, object]
) -> MissionPlan:
    owner = await lock_owner(session, user_id)
    _check_generation(owner.generation, access)
    record = await _record(session, user_id, mission_id)
    if record is None:
        raise AppError(404, "plan_not_found", "No training plan has been built for this mission.")
    return to_plan(record)


async def put_plan(
    session: AsyncSession,
    user_id: uuid.UUID,
    mission_id: uuid.UUID,
    access: dict[str, object],
    body: PlanWrite,
    expected: int | None,
) -> MissionPlan:
    if access["state"] != "active":
        raise AppError(409, "mission_not_active", "Only an active mission's plan can change.")
    owner = await lock_owner(session, user_id)
    _check_generation(owner.generation, access)
    existing = await session.get(MissionPlanRecord, mission_id)
    if existing is not None and existing.user_id != user_id:
        raise AppError(404, "plan_not_found", "No training plan has been built for this mission.")
    now = datetime.now(UTC)
    if existing is None:
        if expected not in (None, 0, ANY_VERSION):
            raise AppError(412, "version_conflict", "This plan does not exist yet.")
        existing = MissionPlanRecord(
            mission_id=mission_id,
            user_id=user_id,
            version=1,
            origin=body.origin,
            model=body.model,
            inputs_digest=body.inputs_digest,
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
        existing.inputs_digest = body.inputs_digest
        existing.updated_at = now
    await session.commit()
    return to_plan(existing)


async def patch_session(
    session: AsyncSession,
    user_id: uuid.UUID,
    mission_id: uuid.UUID,
    access: dict[str, object],
    session_id: str,
    body: SessionPatch,
    expected: int | None,
) -> MissionPlan:
    if access["state"] != "active":
        raise AppError(409, "mission_not_active", "Only an active mission's plan can change.")
    owner = await lock_owner(session, user_id)
    _check_generation(owner.generation, access)
    record = await _record(session, user_id, mission_id)
    if record is None:
        raise AppError(404, "plan_not_found", "No training plan has been built for this mission.")
    if expected is not None and expected != ANY_VERSION and expected != record.version:
        raise AppError(412, "version_conflict", "This plan changed. Reload before saving.")
    content = apply_session_patch(dict(record.content), session_id, body)
    record.content = PlanContent.model_validate(content).model_dump(mode="json")
    record.version += 1
    record.updated_at = datetime.now(UTC)
    await session.commit()
    return to_plan(record)


def apply_session_patch(
    content: dict[str, Any], session_id: str, body: SessionPatch
) -> dict[str, Any]:
    """Apply athlete changes to one session of a plan document (mission or base)."""
    found = False
    weeks = []
    for week in content.get("weeks", []):
        sessions = []
        for item in week.get("sessions", []):
            if item.get("id") == session_id:
                found = True
                item = {**item}
                for key in ("status", "athlete_note", "rpe"):
                    if key in body.model_fields_set:
                        item[key] = getattr(body, key)
                if "date" in body.model_fields_set and body.date is not None:
                    # A moved session stays matchable against activity on its new day.
                    item["date"] = body.date.isoformat()
                if "matched_session_ids" in body.model_fields_set:
                    item["matched_session_ids"] = [
                        str(value) for value in body.matched_session_ids or []
                    ]
            sessions.append(item)
        weeks.append({**week, "sessions": sessions})
    if not found:
        raise AppError(404, "plan_session_not_found", "That session is not part of this plan.")
    return {**content, "weeks": weeks}


async def delete_plan(
    session: AsyncSession, user_id: uuid.UUID, mission_id: uuid.UUID, access: dict[str, object]
) -> None:
    owner = await lock_owner(session, user_id)
    _check_generation(owner.generation, access)
    record = await _record(session, user_id, mission_id)
    if record is not None:
        await session.delete(record)
        await session.commit()


async def purge_plans(session: AsyncSession, user_id: uuid.UUID) -> None:
    """Called inside the course purge transaction (same generation fence)."""
    from app.athlete_plan import purge_base
    from app.seasons import purge as purge_seasons

    await session.execute(delete(MissionPlanRecord).where(MissionPlanRecord.user_id == user_id))
    await purge_base(session, user_id)
    await purge_seasons(session, user_id)


async def export_plans(session: AsyncSession, user_id: uuid.UUID) -> list[dict[str, object]]:
    rows = await session.scalars(
        select(MissionPlanRecord)
        .where(MissionPlanRecord.user_id == user_id)
        .order_by(MissionPlanRecord.mission_id)
    )
    from app.athlete_plan import get_base

    exported: list[dict[str, object]] = [to_plan(row).model_dump(mode="json") for row in rows]
    base = await get_base(session, user_id)
    if base is not None:
        exported.append({"scope": "athlete", **base.model_dump(mode="json")})
    from app.seasons import list_seasons

    exported += [
        {"scope": "season", **s.model_dump(mode="json")}
        for s in await list_seasons(session, user_id)
    ]
    return exported


# ── Progress ─────────────────────────────────────────────────────────────────


def _zone(name: str) -> ZoneInfo:
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("UTC")


def _local_day(moment: datetime, zone: ZoneInfo) -> date:
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=UTC)
    return moment.astimezone(zone).date()


def _ref(row: TrainingSession, zone: ZoneInfo) -> ActivityRef:
    return ActivityRef(
        id=row.id,
        date=_local_day(row.logged_at, zone),
        session_type=row.session_type,
        title=row.title or row.notes,
        duration_minutes=row.duration_minutes,
        distance_km=row.distance_km,
        elevation_m=row.elevation_m,
        source=row.source,
        is_race=bool(row.is_race),
    )


def _add(volume: Volume, minutes: int | None, km: float | None, elevation: int | None) -> None:
    volume.sessions += 1
    volume.hours = round(volume.hours + (minutes or 0) / 60, 2)
    volume.km = round(volume.km + (km or 0), 2)
    volume.elevation_m += elevation or 0


def evidence_summary(rows: list[TrainingSession], today: date, zone: ZoneInfo) -> EvidenceSummary:
    """The last eight Monday-based weeks of real training, newest last."""
    monday = today - timedelta(days=today.weekday())
    starts = [monday - timedelta(weeks=offset) for offset in range(7, -1, -1)]
    buckets: dict[date, EvidenceWeek] = {
        start: EvidenceWeek(start_date=start, volume=Volume()) for start in starts
    }
    longest: TrainingSession | None = None
    for row in rows:
        day = _local_day(row.logged_at, zone)
        start = day - timedelta(days=day.weekday())
        week = buckets.get(start)
        if week is None:
            continue
        _add(week.volume, row.duration_minutes, row.distance_km, row.elevation_m)
        if row.session_type in ("strength", "mobility"):
            continue  # the longest session means endurance, not a gym hour
        if row.duration_minutes > week.longest_minutes:
            week.longest_minutes = row.duration_minutes
            week.longest_km = row.distance_km
        if longest is None or row.duration_minutes > longest.duration_minutes:
            longest = row
    newest = max(rows, key=lambda r: r.logged_at, default=None)
    return EvidenceSummary(
        weeks=[buckets[start] for start in starts],
        longest_recent=_ref(longest, zone) if longest else None,
        races_recorded=sum(1 for row in rows if row.is_race),
        last_activity=_ref(newest, zone) if newest else None,
    )


def compute_progress(
    mission_id: uuid.UUID,
    plan: MissionPlan | None,
    rows: list[TrainingSession],
    now: datetime | None = None,
) -> MissionProgress:
    parts = progress_parts(
        plan.content if plan else None, plan.version if plan else None, rows, now
    )
    return MissionProgress(mission_id=mission_id, **parts)


def progress_parts(
    content: Any,
    version: int | None,
    rows: list[TrainingSession],
    now: datetime | None = None,
) -> dict[str, Any]:
    """Plan vs. evidence for any plan-shaped content (a mission plan or the athlete timeline)."""
    zone = _zone(content.timezone if content else "UTC")
    today = _local_day(now or datetime.now(UTC), zone)
    evidence = evidence_summary(rows, today, zone)
    if content is None:
        return {"as_of": today, "evidence": evidence}
    by_id = {row.id: row for row in rows}
    by_day: dict[date, list[TrainingSession]] = defaultdict(list)
    for row in rows:
        by_day[_local_day(row.logged_at, zone)].append(row)
    claimed: set[uuid.UUID] = set()
    # Athlete-confirmed matches claim their activities first.
    for week in content.weeks:
        for planned in week.sessions:
            claimed.update(planned.matched_session_ids)

    totals = ProgressTotals()
    weeks: list[WeekProgress] = []
    sessions: list[SessionProgress] = []
    long_points: list[LongSessionPoint] = []
    for week in content.weeks:
        end = week.start_date + timedelta(days=7)
        timing = "past" if end <= today else "future" if week.start_date > today else "current"
        planned_volume, actual_volume = Volume(), Volume()
        for row in rows:
            day = _local_day(row.logged_at, zone)
            if week.start_date <= day < end:
                _add(actual_volume, row.duration_minutes, row.distance_km, row.elevation_m)
        for planned in week.sessions:
            if planned.sport != "rest" and planned.kind != "rest":
                _add(
                    planned_volume,
                    planned.duration_minutes,
                    planned.distance_km,
                    planned.elevation_m,
                )
            matched = [by_id[i] for i in planned.matched_session_ids if i in by_id]
            source = (
                "athlete" if planned.status not in ("planned", "moved") or matched else "derived"
            )
            status: str
            if planned.sport == "rest" or planned.kind == "rest":
                status = "rest"
            elif planned.status in ("done", "partial", "skipped"):
                status = planned.status
            elif matched:
                status = "done"
            else:
                candidates = [
                    row
                    for row in by_day.get(planned.date, [])
                    if row.id not in claimed
                    and row.session_type in COMPATIBLE.get(planned.sport, {row.session_type})
                ]
                if candidates:
                    best = max(candidates, key=lambda r: r.duration_minutes)
                    claimed.add(best.id)
                    matched = [best]
                    source = "matched"
                    target = planned.duration_minutes or 0
                    ratio = best.duration_minutes / target if target else 1.0
                    status = "done" if ratio >= PARTIAL_THRESHOLD else "partial"
                elif planned.date < today:
                    status = "missed"
                else:
                    status = "planned"
            if status in ("done", "partial", "missed", "skipped"):
                totals.planned_to_date += 1
                totals.key_planned_to_date += int(planned.key)
            if status == "done":
                totals.completed += 1
                totals.key_completed += int(planned.key)
            elif status == "partial":
                totals.partial += 1
            elif status == "missed":
                totals.missed += 1
            for row in matched:
                _add(totals.done, row.duration_minutes, row.distance_km, row.elevation_m)
            sessions.append(
                SessionProgress(
                    id=planned.id,
                    date=planned.date,
                    week_index=week.index,
                    title=planned.title,
                    kind=planned.kind,
                    sport=planned.sport,
                    key=planned.key,
                    planned_minutes=planned.duration_minutes,
                    planned_km=planned.distance_km,
                    derived_status=status,  # type: ignore[arg-type]
                    status_source=source,  # type: ignore[arg-type]
                    matched=[_ref(row, zone) for row in matched],
                )
            )
            if planned.kind in ("long", "back_to_back", "race_sim"):
                long_points.append(
                    LongSessionPoint(
                        date=planned.date,
                        planned_minutes=planned.duration_minutes,
                        planned_km=planned.distance_km,
                        actual_minutes=max((r.duration_minutes for r in matched), default=None),
                        actual_km=max(
                            (r.distance_km for r in matched if r.distance_km), default=None
                        ),
                        status=status,
                    )
                )
        completion = None
        if timing != "future" and planned_volume.hours > 0:
            completion = min(999, round(100 * actual_volume.hours / planned_volume.hours))
        weeks.append(
            WeekProgress(
                index=week.index,
                start_date=week.start_date,
                phase=week.phase,
                focus=week.focus,
                timing=timing,  # type: ignore[arg-type]
                planned=planned_volume,
                actual=actual_volume,
                completion_pct=completion,
            )
        )
    resolved = totals.completed + totals.partial + totals.missed
    if resolved:
        totals.consistency_pct = round(100 * (totals.completed + 0.5 * totals.partial) / resolved)
    window_start, window_end = content.start_date, min(content.race_date or today, today)
    unplanned = [
        _ref(row, zone)
        for row in rows
        if row.id not in claimed and window_start <= _local_day(row.logged_at, zone) <= window_end
    ]
    return dict(
        as_of=today,
        plan_version=version,
        totals=totals,
        weeks=weeks,
        sessions=sessions,
        long_sessions=long_points,
        unplanned=unplanned[-30:],
        evidence=evidence,
    )


async def load_window(
    session: AsyncSession, user_id: uuid.UUID, start: date, end: date
) -> list[TrainingSession]:
    since = datetime.combine(start - timedelta(days=1), datetime.min.time(), tzinfo=UTC)
    until = datetime.combine(end + timedelta(days=2), datetime.min.time(), tzinfo=UTC)
    rows = await session.scalars(
        select(TrainingSession)
        .where(
            TrainingSession.user_id == user_id,
            TrainingSession.logged_at >= since,
            TrainingSession.logged_at < until,
        )
        .order_by(TrainingSession.logged_at)
    )
    return list(rows)
