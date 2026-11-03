"""The daily race brief, computed from real data only.

Answers the 15-second questions: which race and how long, which phase, what
matters most today, what evidence supports it, and what to do next. Facts the
engine does not have are reported as missing, never invented.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from app.race.context import RaceContext
from app.race.engine.common import hm, when


def _plan_today(
    ctx: RaceContext,
) -> tuple[dict[str, Any] | None, dict[str, Any] | None, list[dict[str, Any]]]:
    """(today's week, today's main session, upcoming key sessions)."""
    content = (ctx.plan or {}).get("content") or {}
    today = ctx.today.isoformat()
    week_now = None
    today_session = None
    upcoming: list[dict[str, Any]] = []
    for week in content.get("weeks") or []:
        start = date.fromisoformat(week["start_date"])
        if start <= ctx.today < start + timedelta(days=7):
            week_now = week
        for session in week.get("sessions") or []:
            if session.get("date") == today and session.get("kind") != "rest":
                if today_session is None or (session.get("duration_minutes") or 0) > (
                    today_session.get("duration_minutes") or 0
                ):
                    today_session = session
            elif session.get("date", "") > today and session.get("key"):
                upcoming.append(session)
    return week_now, today_session, upcoming[:3]


def _open_items(ctx: RaceContext, kind: str) -> list[dict[str, Any]]:
    layer = ctx.layers.get(kind) or {}
    items = [
        i for s in (layer.get("content") or {}).get("sections") or [] for i in s.get("items") or []
    ]
    return [i for i in items if i.get("status", "todo") == "todo"]


def build_brief(ctx: RaceContext) -> dict[str, Any]:
    days = ctx.days_to_race
    week, session, upcoming = _plan_today(ctx)
    event = ctx.event
    evidence: list[dict[str, str]] = []
    risks: list[dict[str, str]] = []
    actions: list[dict[str, str]] = []

    totals = (ctx.progress or {}).get("totals") or {}
    if totals.get("planned_to_date"):
        evidence.append(
            {
                "label": "Plan adherence",
                "value": f"{totals.get('completed', 0)} of {totals['planned_to_date']} sessions done"
                + (
                    f" · {totals['consistency_pct']}% consistency"
                    if totals.get("consistency_pct") is not None
                    else ""
                ),
                "source": "calculated",
            }
        )
    weeks = ctx.evidence_weeks()
    if weeks:
        last = weeks[-1].get("volume") or {}
        evidence.append(
            {
                "label": "This week so far",
                "value": f"{float(last.get('hours') or 0):.1f} h · {float(last.get('km') or 0):.1f} km · +{last.get('elevation_m') or 0} m",
                "source": "recorded",
            }
        )
    longest = ((ctx.progress or {}).get("evidence") or {}).get("longest_recent")
    if longest:
        evidence.append(
            {
                "label": "Longest recent session",
                "value": f"{hm(longest.get('duration_minutes'))}"
                + (f" · {longest['distance_km']} km" if longest.get("distance_km") else ""),
                "source": "recorded",
            }
        )
    checkin = ctx.checkins[0] if ctx.checkins else None
    checked_today = bool(checkin and checkin.get("day") == ctx.today.isoformat())
    if checkin and checkin.get("illness") and checked_today:
        risks.append(
            {
                "title": "You reported illness today",
                "detail": "Rest. Training while ill delays the build.",
                "severity": "critical",
            }
        )
    elif checkin and checked_today and (checkin.get("soreness") or 0) >= 4:
        risks.append(
            {
                "title": "High soreness",
                "detail": "Swap today's quality for easy time or rest.",
                "severity": "attention",
            }
        )
    missed = totals.get("missed", 0)
    if missed >= 3:
        risks.append(
            {
                "title": f"{missed} planned sessions without evidence",
                "detail": "Log or sync them, or let the plan adapt.",
                "severity": "attention",
            }
        )
    if not ctx.course and ctx.sport in (
        "trail_running",
        "hiking",
        "skimo",
        "cycling",
        "gravel",
        "mountain_biking",
    ):
        risks.append(
            {
                "title": "No course file yet",
                "detail": "Upload the GPX so pacing and terrain prep follow the real course.",
                "severity": "attention",
            }
        )
        actions.append({"title": "Upload the course GPX", "target": "course"})
    if not ctx.plan:
        actions.insert(0, {"title": "Build your training plan", "target": "plan"})
    for kind, label in (("logistics", "logistics"), ("gear", "gear"), ("fuel", "fuel rehearsal")):
        open_items = _open_items(ctx, kind)
        due = [
            i
            for i in open_items
            if i.get("due_date") and i["due_date"] <= (ctx.today + timedelta(days=7)).isoformat()
        ]
        critical = [i for i in open_items if i.get("priority") == "critical"]
        if due:
            risks.append(
                {
                    "title": f"{len(due)} {label} task(s) due this week",
                    "detail": due[0]["title"],
                    "severity": "attention",
                }
            )
            actions.append({"title": due[0]["title"], "target": kind})
        elif critical and days <= 21:
            risks.append(
                {
                    "title": f"Critical {label} item open",
                    "detail": critical[0]["title"],
                    "severity": "attention",
                }
            )
    if not checked_today:
        actions.append(
            {"title": "60-second check-in: sleep, energy, soreness", "target": "checkin"}
        )
    if not ctx.sources and not ctx.sessions:
        actions.append({"title": "Connect Strava or log your first session", "target": "sources"})

    phase = (week or {}).get("phase")
    if days < 0:
        headline = "Race done — time to debrief"
        message = "Log your result and what you learned; it becomes evidence for your next mission."
        actions.insert(0, {"title": "Record your result", "target": "debrief"})
    elif days == 0:
        headline = f"Race day: {event.get('name')}"
        message = "Execute the plan you rehearsed. Start easy, fuel early, race your own race."
    elif session:
        headline = f"Today: {session.get('title')}"
        bits = [hm(session.get("duration_minutes"))]
        if session.get("distance_km"):
            bits.append(f"{session['distance_km']:g} km")
        if session.get("elevation_m"):
            bits.append(f"+{session['elevation_m']} m")
        message = f"{' · '.join(bits)}. {session.get('purpose') or ''}".strip()
        actions.insert(
            0, {"title": f"Open today's session: {session.get('title')}", "target": "plan"}
        )
    elif ctx.plan:
        headline = "Rest day — let the training land"
        message = "Sleep, eat well and keep moving gently. " + (
            f"Next key session: {upcoming[0]['title']} "
            f"{when(date.fromisoformat(upcoming[0]['date']), ctx.today)}."
            if upcoming
            else ""
        )
    else:
        headline = f"{days} days to {event.get('name')}"
        message = "Your race is set. Build the plan so every day has a purpose."
    if phase and days > 0:
        message += f" Phase: {phase}."
    return {
        "headline": headline[:200],
        "message": message.strip()[:1200],
        "phase": phase,
        "days_to_race": days,
        "today_session_id": (session or {}).get("id"),
        "evidence": evidence[:6],
        "risks": risks[:5],
        "actions": actions[:5],
    }
