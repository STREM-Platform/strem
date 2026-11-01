"""Retrieval tools for the race team graph (ADR 0010, ai#58 phase 2).

Instead of one block with fixed caps (12 sessions, 7 check-ins, 12 races), a
specialist asks for what the question needs. Tools read the RaceContext that
`load_context()` already assembled from the owning services, so no service
boundary changes. Every result keeps its provenance tag.
"""

from __future__ import annotations

import json
from datetime import timedelta
from typing import Any

from langchain_core.tools import BaseTool, tool

from app.race.context import RaceContext
from app.race.engine.memory import memory_lines, race_memory


def _day(value: Any) -> str:
    return str(value or "")[:10]


def _out(tag: str, rows: Any) -> str:
    return json.dumps({"provenance": tag, "data": rows}, ensure_ascii=False, default=str)


def build_tools(ctx: RaceContext) -> list[BaseTool]:
    """Tools bound to one athlete's loaded context."""

    @tool
    def training(start: str, end: str, sport: str | None = None) -> str:
        """Logged or imported sessions between two ISO dates (inclusive), newest first.
        Optional sport filter, e.g. running, trail_running, cycling, strength."""
        rows = [
            {
                "date": _day(s.get("logged_at")),
                "type": s.get("session_type"),
                "title": s.get("title"),
                "minutes": s.get("duration_minutes"),
                "km": s.get("distance_km"),
                "elevation_m": s.get("elevation_m"),
                "avg_hr": s.get("avg_hr"),
                "notes": s.get("notes"),
            }
            for s in ctx.sessions
            if start <= _day(s.get("logged_at")) <= end
            and (not sport or s.get("session_type") == sport)
        ]
        return _out("recorded", rows[:60])

    @tool
    def long_sessions(count: int = 6) -> str:
        """The athlete's longest recent sessions (by duration), with date and distance."""
        rows = sorted(ctx.sessions, key=lambda s: s.get("duration_minutes") or 0, reverse=True)
        return _out(
            "recorded",
            [
                {
                    "date": _day(s.get("logged_at")),
                    "title": s.get("title"),
                    "minutes": s.get("duration_minutes"),
                    "km": s.get("distance_km"),
                    "elevation_m": s.get("elevation_m"),
                }
                for s in rows[: max(1, min(count, 20))]
            ],
        )

    @tool
    def checkins(days: int = 14) -> str:
        """Daily check-ins (1-5 scales; soreness and stress 5 = worst), illness, pain and notes."""
        since = (ctx.today - timedelta(days=max(1, min(days, 60)))).isoformat()
        rows = [
            {
                k: c.get(k)
                for k in (
                    "day",
                    "sleep_quality",
                    "sleep_hours",
                    "energy",
                    "soreness",
                    "stress",
                    "motivation",
                    "illness",
                    "pain_note",
                    "note",
                )
            }
            for c in ctx.checkins
            if str(c.get("day")) >= since
        ]
        return _out("athlete", rows)

    @tool
    def recovery(days: int = 14) -> str:
        """Wearable recovery: HRV, resting heart rate, sleep hours, recovery score."""
        since = (ctx.today - timedelta(days=max(1, min(days, 60)))).isoformat()
        rows = [
            {
                "date": _day(r.get("date")),
                "hrv_ms": r.get("hrv_ms"),
                "resting_hr": r.get("resting_hr"),
                "sleep_hours": r.get("sleep_hours"),
                "recovery_score": r.get("recovery_score"),
            }
            for r in ctx.recovery
            if _day(r.get("date")) >= since
        ]
        return _out("recorded", rows)

    @tool
    def races(query: str | None = None) -> str:
        """Past races with results, race-day data (carbs, fluid, GI issues, pacing, cramps)
        and lessons. Optional text filter, e.g. 'stomach', 'heat', 'Vitosha'."""
        rows = [
            {
                k: r.get(k)
                for k in (
                    "race_date",
                    "name",
                    "status",
                    "distance_km",
                    "elevation_gain_m",
                    "finish_minutes",
                    "lessons",
                    "race_day",
                    "notes",
                )
            }
            for r in sorted(ctx.races, key=lambda r: str(r.get("race_date") or ""), reverse=True)
        ]
        note = None
        if query:
            needle = query.lower()
            matched = [r for r in rows if needle in json.dumps(r, default=str).lower()]
            # Words differ ("stomach" vs "gi_issues"): no match returns every race.
            if matched:
                rows = matched
            else:
                note = f"No race mentions {query!r} literally; all races returned."
        lessons = memory_lines(race_memory(ctx.races))
        return _out("athlete", {"races": rows[:20], "what_they_teach": lessons, "note": note})

    @tool
    def course() -> str:
        """The race course from the athlete's GPX: distance, climbing, high and low points,
        and the sustained climbs and descents with where they start."""
        c = ctx.course
        if not c:
            return _out(
                "official", {"available": False, "checkpoints": ctx.event.get("checkpoints") or []}
            )
        return _out(
            "calculated",
            {
                "distance_km": c.distance_km,
                "ascent_m": c.ascent_m,
                "descent_m": c.descent_m,
                "highest_m": c.highest_m,
                "lowest_m": c.lowest_m,
                "climbs_and_descents": c.climbs[:30],
                "checkpoints": ctx.event.get("checkpoints") or [],
            },
        )

    @tool
    def layer(kind: str) -> str:
        """A Race Lab layer: fuel, gear, logistics or strategy — headline, metrics and
        items with the athlete's status."""
        doc = ctx.layers.get(kind)
        if not doc:
            return _out("plan", {"available": False})
        content = doc.get("content") or {}
        items = [
            {
                "title": i.get("title"),
                "status": i.get("status", "todo"),
                "detail": i.get("detail"),
                "note": i.get("note"),
            }
            for s in content.get("sections") or []
            for i in s.get("items") or []
        ]
        return _out(
            "plan",
            {
                "headline": content.get("headline"),
                "metrics": content.get("metrics"),
                "warnings": content.get("warnings"),
                "items": items[:60],
            },
        )

    @tool
    def plan_week(day: str | None = None) -> str:
        """The training plan week containing an ISO date (default today), with each
        session's purpose and the athlete's adherence so far."""
        target = day or ctx.today.isoformat()
        weeks = ((ctx.plan or {}).get("content") or {}).get("weeks") or []
        week = next(
            (
                w
                for i, w in enumerate(weeks)
                if w.get("start_date", "") <= target
                and (weeks[i + 1].get("start_date", "9999") if i + 1 < len(weeks) else "9999")
                > target
            ),
            None,
        )
        totals = (ctx.progress or {}).get("totals")
        return _out("plan", {"week": week, "adherence": totals})

    @tool
    def conditions() -> str:
        """Expected race-day weather (forecast close to the race, typical climate otherwise)."""
        return _out("assumption", ctx.conditions or {"available": False})

    return [
        training,
        long_sessions,
        checkins,
        recovery,
        races,
        course,
        layer,
        plan_week,
        conditions,
    ]
