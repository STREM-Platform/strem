"""The race context: everything the race team may use about one mission.

Assembled from the owning services in parallel. Absent sources stay absent —
the engine and AI are told what is missing rather than guessing. `render()`
produces the compact, provenance-labelled text the model reads.
"""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from typing import Any

from app.race.clients import RaceServices

SPORT_LABEL = {
    "trail_running": "trail running",
    "road_running": "road running",
    "triathlon": "triathlon",
    "duathlon": "duathlon",
    "cycling": "road cycling",
    "gravel": "gravel cycling",
    "mountain_biking": "mountain biking",
    "swimming": "open-water swimming",
    "hiking": "hiking / fastpacking",
    "skimo": "ski mountaineering",
    "nordic_skiing": "nordic skiing",
    "rowing": "rowing / paddling",
    "hybrid": "hybrid fitness racing",
    "multisport": "multisport / adventure racing",
    "custom": "custom endurance challenge",
}


@dataclass
class CourseSummary:
    """A light course model for planning; geometry never goes to the model."""

    distance_km: float
    ascent_m: float | None
    descent_m: float | None
    lowest_m: float | None
    highest_m: float | None
    # (start_km, end_km, elevation_change_m, grade_pct) per km-ish chunk
    profile: list[tuple[float, float, float | None, float | None]]
    climbs: list[dict[str, Any]]
    source_url: str | None = None


@dataclass
class RaceContext:
    mission: dict[str, Any]
    today: date
    user: dict[str, Any] | None = None
    profile: dict[str, Any] | None = None
    course: CourseSummary | None = None
    plan: dict[str, Any] | None = None
    progress: dict[str, Any] | None = None
    checkins: list[dict[str, Any]] = field(default_factory=list)
    races: list[dict[str, Any]] = field(default_factory=list)
    race_sessions: list[dict[str, Any]] = field(default_factory=list)
    layers: dict[str, dict[str, Any]] = field(default_factory=dict)
    sessions: list[dict[str, Any]] = field(default_factory=list)
    sources: list[dict[str, Any]] = field(default_factory=list)
    recovery: list[dict[str, Any]] = field(default_factory=list)
    conditions: dict[str, Any] | None = None
    other_missions: list[dict[str, Any]] = field(default_factory=list)

    # ── Convenience accessors ────────────────────────────────────────────────
    @property
    def mission_id(self) -> uuid.UUID:
        return uuid.UUID(str(self.mission["id"]))

    @property
    def event(self) -> dict[str, Any]:
        return dict(self.mission.get("event") or {})

    @property
    def goal(self) -> dict[str, Any]:
        return dict(self.mission.get("goal") or {})

    @property
    def prep(self) -> dict[str, Any]:
        return dict(self.mission.get("preparation") or {})

    @property
    def sport(self) -> str:
        return str(self.event.get("sport") or "trail_running")

    @property
    def race_date(self) -> date:
        return date.fromisoformat(str(self.event["race_date"]))

    @property
    def days_to_race(self) -> int:
        return (self.race_date - self.today).days

    @property
    def distance_km(self) -> float:
        return float(self.event.get("distance_km") or 0)

    @property
    def elevation_m(self) -> int | None:
        value = self.event.get("elevation_gain_m")
        if value is None and self.course and self.course.ascent_m is not None:
            return round(self.course.ascent_m)
        return int(value) if value is not None else None

    @property
    def weight_kg(self) -> float | None:
        value = (self.profile or {}).get("weight_kg")
        return float(value) if value else None

    @property
    def athlete_name(self) -> str | None:
        user = self.user or {}
        for key in ("display_name", "first_name", "name"):
            if user.get(key):
                return str(user[key])
        return None

    def evidence_weeks(self) -> list[dict[str, Any]]:
        return list(((self.progress or {}).get("evidence") or {}).get("weeks") or [])

    def recent_weekly_hours(self, weeks: int = 4) -> float | None:
        """Average weekly training hours over the last complete weeks, if recorded."""
        rows = self.evidence_weeks()
        if not rows:
            return None
        recent = rows[-(weeks + 1) : -1] or rows[-weeks:]
        hours = [float((row.get("volume") or {}).get("hours") or 0) for row in recent]
        if not any(hours):
            return None
        return round(sum(hours) / len(hours), 1)

    def longest_recent_minutes(self) -> int | None:
        longest = ((self.progress or {}).get("evidence") or {}).get("longest_recent")
        if longest and longest.get("duration_minutes"):
            return int(longest["duration_minutes"])
        return None


def summarize_course(course: dict[str, Any] | None) -> CourseSummary | None:
    if not course or not course.get("course"):
        return None
    geometry = course["course"]
    analysis = course.get("analysis") or {}
    sections = analysis.get("sections") or []
    chunks: list[tuple[float, float, float | None, float | None]] = []
    bucket: list[dict[str, Any]] = []

    def flush() -> None:
        if not bucket:
            return
        start = float(bucket[0]["start_distance_m"]) / 1000
        end = float(bucket[-1]["end_distance_m"]) / 1000
        changes = [s.get("elevation_change_m") for s in bucket]
        known = [c for c in changes if c is not None]
        change = round(sum(known), 1) if len(known) == len(changes) else None
        length_m = (end - start) * 1000
        grade = round(100 * change / length_m, 1) if change is not None and length_m > 0 else None
        chunks.append((round(start, 2), round(end, 2), change, grade))
        bucket.clear()

    for section in sections:
        bucket.append(section)
        if float(section["end_distance_m"]) - float(bucket[0]["start_distance_m"]) >= 1000:
            flush()
    flush()
    climbs = [
        {
            "direction": run.get("direction"),
            "start_km": round(float(run["start_distance_m"]) / 1000, 2),
            "end_km": round(float(run["end_distance_m"]) / 1000, 2),
            "change_m": round(float(run.get("net_elevation_change_m") or 0)),
            "grade_pct": round(float(run.get("average_grade_percent") or 0), 1),
        }
        for run in analysis.get("sustained_runs") or []
    ]
    return CourseSummary(
        distance_km=round(float(geometry.get("distance_m") or 0) / 1000, 2),
        ascent_m=geometry.get("ascent_m"),
        descent_m=geometry.get("descent_m"),
        lowest_m=geometry.get("lowest_elevation_m"),
        highest_m=geometry.get("highest_elevation_m"),
        profile=chunks,
        climbs=climbs,
        source_url=course.get("source_url"),
    )


async def assemble(
    services: RaceServices,
    mission_id: uuid.UUID,
    *,
    conditions: Any = None,
    today: date | None = None,
) -> RaceContext:
    mission = await services.mission(mission_id)
    # Independent reads run concurrently; each task keeps its own type.
    user = asyncio.create_task(services.user())
    profile = asyncio.create_task(services.athlete_profile())
    course = asyncio.create_task(services.course(mission_id))
    plan = asyncio.create_task(services.plan(mission_id))
    progress = asyncio.create_task(services.progress(mission_id))
    checkins = asyncio.create_task(services.checkins())
    races = asyncio.create_task(services.races())
    race_sessions = asyncio.create_task(services.race_sessions())
    layers = asyncio.create_task(services.layers(mission_id))
    sessions = asyncio.create_task(services.sessions())
    sources = asyncio.create_task(services.sources())
    recovery = asyncio.create_task(services.recovery())
    missions = asyncio.create_task(services.missions())
    ctx = RaceContext(
        mission=mission,
        today=today or datetime.now(UTC).date(),
        user=await user,
        profile=await profile,
        course=summarize_course(await course),
        plan=await plan,
        progress=await progress,
        checkins=await checkins,
        races=await races,
        race_sessions=await race_sessions,
        layers=await layers,
        sessions=await sessions,
        sources=[s for s in await sources if s.get("on")],
        recovery=await recovery,
        other_missions=[m for m in await missions if str(m.get("id")) != str(mission_id)],
    )
    if conditions is not None:
        try:
            ctx.conditions = await conditions(ctx)
        except Exception:  # noqa: BLE001 — conditions are optional enrichment
            ctx.conditions = None
    return ctx


# ── Rendering for the model ──────────────────────────────────────────────────


def _hm(minutes: float | int | None) -> str:
    if minutes is None:
        return "unknown"
    minutes = int(round(minutes))
    return f"{minutes // 60}h{minutes % 60:02d}"


def _m(value: float | None, missing: str = "?") -> str:
    return str(round(value)) if value is not None else missing


def _line(label: str, value: Any) -> str | None:
    if value in (None, "", [], {}):
        return None
    return f"- {label}: {value}"


def render(ctx: RaceContext) -> str:
    """Compact, provenance-labelled context. [athlete]=entered by the athlete,
    [recorded]=imported/logged, [calculated]=derived by STREM, [plan]=current plan."""
    event, goal, prep = ctx.event, ctx.goal, ctx.prep
    out: list[str] = [f"TODAY: {ctx.today.isoformat()} ({ctx.days_to_race} days to race day)"]
    out.append("\n## RACE MISSION [athlete]")
    lines = [
        _line("Event", event.get("name")),
        _line("Sport", SPORT_LABEL.get(ctx.sport, ctx.sport)),
        _line("Format", event.get("format")),
        _line("Support", event.get("support")),
        _line(
            "Date",
            f"{event.get('race_date')}"
            + (f" start {event['start_time']}" if event.get("start_time") else ""),
        ),
        _line("End date", event.get("end_date")),
        _line("Stages", event.get("stages")),
        _line("Location", f"{event.get('location_name')} ({event.get('timezone')})"),
        _line(
            "Coordinates",
            f"{event.get('latitude')}, {event.get('longitude')}"
            if event.get("latitude") is not None
            else None,
        ),
        _line("Distance", f"{event.get('distance_km')} km"),
        _line(
            "Elevation gain",
            f"{event['elevation_gain_m']} m"
            if event.get("elevation_gain_m") is not None
            else "not entered",
        ),
        _line(
            "Cutoff",
            _hm(event.get("cutoff_minutes")) if event.get("cutoff_minutes") else "not entered",
        ),
        _line(
            "Checkpoints",
            "; ".join(
                f"{c.get('name')} km {c.get('km')}"
                + (f" ({', '.join(c['services'])})" if c.get("services") else " (no services)")
                + (f" cutoff {_hm(c['cutoff_minutes'])}" if c.get("cutoff_minutes") else "")
                for c in event.get("checkpoints") or []
            )
            or "not entered",
        ),
        _line(
            "Legs",
            ", ".join(
                f"{leg['discipline']} {leg['distance_km']} km" for leg in event.get("legs") or []
            )
            or None,
        ),
        _line("Description", event.get("description")),
        _line(
            "Goal",
            str(goal.get("outcome"))
            + (
                f" in {_hm(goal['target_finish_minutes'])}"
                if goal.get("target_finish_minutes")
                else ""
            ),
        ),
        _line("Priority", goal.get("priority")),
        _line("Why it matters (athlete's words)", goal.get("motivation")),
    ]
    out.extend(line for line in lines if line)

    out.append("\n## PREPARATION INTAKE [athlete]")
    intake = [
        _line("Experience", prep.get("experience")),
        _line("Training days/week", prep.get("training_days_per_week")),
        _line("Hours available/week", prep.get("weekly_hours")),
        _line("Long session day", prep.get("long_session_day")),
        _line("Current weekly km", prep.get("current_weekly_km")),
        _line("Current weekly hours", prep.get("current_weekly_hours")),
        _line(
            "Longest recent",
            f"{prep.get('longest_recent_km') or '?'} km / "
            f"{prep.get('longest_recent_hours') or '?'} h"
            if prep.get("longest_recent_km") or prep.get("longest_recent_hours")
            else None,
        ),
        _line("Strength sessions/week", prep.get("strength_sessions_per_week")),
        _line("Terrain access", ", ".join(prep.get("terrain_access") or []) or None),
        _line("Life constraints", prep.get("constraints")),
        _line("Home", prep.get("home_location")),
        _line("Travel", prep.get("travel_notes")),
    ]
    provided = [line for line in intake if line]
    out.extend(provided or ["- (not provided)"])

    profile = ctx.profile or {}
    if profile.get("is_started"):
        out.append("\n## ATHLETE PROFILE [athlete]")
        rows = [
            _line("Age band", profile.get("age_band")),
            _line("Sex (for physiology norms only)", profile.get("biological_sex")),
            _line("Weight", f"{profile['weight_kg']} kg" if profile.get("weight_kg") else None),
            _line("Height", f"{profile['height_cm']} cm" if profile.get("height_cm") else None),
            _line("Years training", profile.get("years_training")),
            _line(
                "Injuries",
                "; ".join(
                    f"{i.get('area')}" + (f" ({i['note']})" if i.get("note") else "")
                    for i in profile.get("injuries") or []
                )
                or None,
            ),
            _line(
                "Dietary constraints", ", ".join(profile.get("dietary_constraints") or []) or None
            ),
            _line(
                "PRs",
                "; ".join(
                    f"{p.get('exercise')} {p.get('time') or ''}".strip()
                    for p in profile.get("personal_records") or []
                )
                or None,
            ),
        ]
        out.extend(line for line in rows if line)

    if ctx.races or ctx.race_sessions:
        out.append("\n## RACE HISTORY")
        for race in ctx.races[:12]:
            bits = [str(race.get("race_date")), str(race.get("name")), str(race.get("status"))]
            if race.get("distance_km"):
                bits.append(f"{race['distance_km']} km")
            if race.get("elevation_gain_m"):
                bits.append(f"+{race['elevation_gain_m']} m")
            if race.get("finish_minutes"):
                bits.append(_hm(race["finish_minutes"]))
            src = "recorded" if race.get("source") == "strava" else "athlete"
            out.append(f"- [{src}] " + " · ".join(bits))
            for key in ("fueling_notes", "gear_notes", "notes"):
                if race.get(key):
                    out.append(f"    {key.replace('_', ' ')}: {race[key]}")
            for lesson in race.get("lessons") or []:
                out.append(f"    lesson: {lesson}")
        known = {str(r.get("external_id")) for r in ctx.races}
        for session in ctx.race_sessions[:10]:
            if f"strava:{session.get('id')}" in known:
                continue
            out.append(
                f"- [recorded race activity] {str(session.get('logged_at'))[:10]} "
                f"{session.get('title') or session.get('session_type')} "
                f"{session.get('distance_km') or '?'} km {_hm(session.get('duration_minutes'))}"
            )

    if ctx.course:
        c = ctx.course
        out.append("\n## COURSE (from the athlete's GPX) [calculated]")
        out.append(
            f"- {c.distance_km} km, ascent {_m(c.ascent_m, 'unknown')} m, "
            f"descent {_m(c.descent_m, 'unknown')} m, "
            f"altitude {_m(c.lowest_m)}–{_m(c.highest_m)} m"
        )
        for climb in c.climbs[:16]:
            out.append(
                f"- {climb['direction']} km {climb['start_km']}–{climb['end_km']}: "
                f"{climb['change_m']} m at {climb['grade_pct']}%"
            )

    weeks = ctx.evidence_weeks()
    if weeks:
        out.append("\n## RECENT TRAINING (last 8 weeks, Monday-based) [recorded]")
        for row in weeks:
            vol = row.get("volume") or {}
            out.append(
                f"- week of {row.get('start_date')}: {vol.get('sessions', 0)} sessions, "
                f"{vol.get('hours', 0)} h, {vol.get('km', 0)} km, +{vol.get('elevation_m', 0)} m; "
                f"longest {_hm(row.get('longest_minutes'))}"
            )
    recent = ctx.sessions[:12]
    if recent:
        out.append("\n## LAST SESSIONS [recorded]")
        for s in recent:
            bits = [str(s.get("logged_at", ""))[:10], str(s.get("session_type"))]
            if s.get("title"):
                bits.append(f'"{s["title"]}"')
            if s.get("distance_km"):
                bits.append(f"{s['distance_km']} km")
            if s.get("elevation_m"):
                bits.append(f"+{s['elevation_m']} m")
            bits.append(_hm(s.get("duration_minutes")))
            if s.get("avg_hr"):
                bits.append(f"avg HR {s['avg_hr']}")
            bits.append(f"({s.get('source', 'manual')})")
            out.append("- " + " ".join(bits))

    if ctx.checkins:
        out.append("\n## CHECK-INS (1-5; soreness/stress 5 = worst) [athlete]")
        for checkin in ctx.checkins[:7]:
            fields = [
                f"{k} {checkin[k]}"
                for k in (
                    "sleep_quality",
                    "sleep_hours",
                    "energy",
                    "soreness",
                    "stress",
                    "motivation",
                )
                if checkin.get(k) is not None
            ]
            if checkin.get("illness"):
                fields.append("ILL")
            if checkin.get("pain_note"):
                fields.append(f"pain: {checkin['pain_note']}")
            if checkin.get("note"):
                fields.append(f"note: {checkin['note']}")
            out.append(f"- {checkin.get('day')}: " + ", ".join(fields))

    if ctx.recovery:
        out.append("\n## RECOVERY (wearable) [recorded]")
        for r in ctx.recovery[:7]:
            out.append(
                f"- {str(r.get('date'))[:10]}: HRV {r.get('hrv_ms') or '?'} ms, RHR "
                f"{r.get('resting_hr') or '?'}, sleep {r.get('sleep_hours') or '?'} h, "
                f"recovery {r.get('recovery_score') or '?'}"
            )
    out.append(
        "\n## CONNECTED SOURCES: "
        + (", ".join(str(s.get("label")) for s in ctx.sources) or "none (manual evidence only)")
    )

    if ctx.plan:
        content = ctx.plan.get("content") or {}
        out.append(
            f"\n## CURRENT PLAN [plan, origin {ctx.plan.get('origin')}, v{ctx.plan.get('version')}]"
        )
        out.append(f"- {content.get('headline')}")
        today_iso = ctx.today.isoformat()
        horizon = (ctx.today + timedelta(days=14)).isoformat()
        for week in content.get("weeks") or []:
            sessions = [
                s for s in week.get("sessions") or [] if today_iso <= str(s.get("date")) <= horizon
            ]
            if not sessions:
                continue
            out.append(f"- week {week.get('index')} ({week.get('phase')}): {week.get('focus')}")
            for s in sessions:
                out.append(
                    f"    {s.get('date')} [{s.get('id')}] {s.get('title')} — {s.get('kind')}, "
                    f"{_hm(s.get('duration_minutes'))}"
                    + (f", {s['distance_km']} km" if s.get("distance_km") else "")
                    + (f", +{s['elevation_m']} m" if s.get("elevation_m") else "")
                    + f", status {s.get('status')}"
                )
    if ctx.progress and ctx.progress.get("totals"):
        t = ctx.progress["totals"]
        out.append(
            f"\n## PLAN ADHERENCE [calculated]: {t.get('completed')} done, "
            f"{t.get('partial')} partial, "
            f"{t.get('missed')} missed of {t.get('planned_to_date')} due; consistency "
            f"{t.get('consistency_pct') if t.get('consistency_pct') is not None else 'n/a'}%; "
            f"key sessions {t.get('key_completed')}/{t.get('key_planned_to_date')}"
        )

    for kind in ("fuel", "gear", "logistics", "strategy"):
        layer = ctx.layers.get(kind)
        if not layer:
            continue
        content = layer.get("content") or {}
        items = [i for s in content.get("sections") or [] for i in s.get("items") or []]
        done = sum(1 for i in items if i.get("status") in ("done", "tested", "packed"))
        out.append(
            f"\n## {kind.upper()} LAYER [origin {layer.get('origin')}]: {content.get('headline')} "
            f"({done}/{len(items)} items done)"
        )
        for metric in content.get("metrics") or []:
            unit = metric.get("unit") or ""
            out.append(f"- {metric.get('label')}: {metric.get('value')} {unit}".rstrip())

    if ctx.conditions:
        cond = ctx.conditions
        out.append(f"\n## CONDITIONS [{cond.get('kind')}]: {cond.get('summary')}")
    if ctx.other_missions:
        out.append("\n## OTHER ACTIVE MISSIONS [athlete]")
        for m in ctx.other_missions[:5]:
            ev = m.get("event") or {}
            priority = (m.get("goal") or {}).get("priority")
            out.append(
                f"- {ev.get('race_date')} {ev.get('name')} "
                f"({ev.get('distance_km')} km, priority {priority})"
            )
    return "\n".join(out)
