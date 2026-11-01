"""The race-team cockpit (mobile#119): one call per specialist and a feed of
what changed, computed by the engine from the athlete's own data.

Every call carries a status, a confidence that reflects how much evidence it
rests on, evidence chips with their provenance, and one next action. Nothing
here needs the AI provider, so the cockpit works offline.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from app.race.context import RaceContext
from app.race.engine.common import hm

COURSE_SPORTS = {"trail_running", "hiking", "skimo", "cycling", "gravel", "mountain_biking"}
DONE = {"done", "tested", "packed", "na"}


def _chip(label: str, value: str, source: str) -> dict[str, str]:
    return {"label": label, "value": value, "source": source}


def _items(ctx: RaceContext, kind: str) -> list[dict[str, Any]]:
    layer = ctx.layers.get(kind) or {}
    return [
        i for s in (layer.get("content") or {}).get("sections") or [] for i in s.get("items") or []
    ]


def _layer_call(
    ctx: RaceContext,
    kind: str,
    role: str,
    *,
    due_days: int,
    confidence: str,
    extra: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Shared shape for the Race Lab layers: built? how much is open? is it due?"""
    layer = ctx.layers.get(kind)
    target = f"race?tab={kind}"
    if not layer:
        return {
            "role": role,
            "layer": kind,
            "status": "missing",
            "call": f"No {kind} plan yet — build it so race day has no surprises.",
            "confidence": "low",
            "evidence": extra or [],
            "action": {"label": f"Build the {kind} plan", "target": target},
            "ask": f"What should my {kind} plan cover for {ctx.event.get('name') or 'this race'}?",
        }
    items = _items(ctx, kind)
    done = sum(1 for i in items if i.get("status") in DONE)
    open_items = [i for i in items if i.get("status", "todo") not in DONE]
    content = layer.get("content") or {}
    evidence = [_chip("Checklist", f"{done} of {len(items)} done", "calculated"), *(extra or [])]
    due = ctx.days_to_race <= due_days and bool(open_items)
    if due:
        call = f"{len(open_items)} open before race day — next: {open_items[0].get('title')}."
    elif open_items:
        call = str(content.get("headline") or f"{len(open_items)} items to work through.")
    else:
        call = str(content.get("headline") or "Everything on the list is done.")
    return {
        "role": role,
        "layer": kind,
        "status": "attention" if due else "on_track",
        "call": call,
        "confidence": confidence,
        "evidence": evidence,
        "action": {"label": f"Open {kind}", "target": target},
        "ask": f"What matters most in my {kind} plan right now?",
    }


def _coach(ctx: RaceContext, proposals: list[dict[str, Any]]) -> dict[str, Any]:
    totals = (ctx.progress or {}).get("totals") or {}
    weeks = ctx.evidence_weeks()
    recent = [w for w in weeks[-2:] if (w.get("volume") or {}).get("sessions")]
    evidence: list[dict[str, str]] = []
    if totals.get("planned_to_date"):
        evidence.append(
            _chip(
                "Adherence",
                f"{totals.get('completed', 0)} of {totals['planned_to_date']} sessions",
                "calculated",
            )
        )
    if weeks:
        last = weeks[-1].get("volume") or {}
        evidence.append(
            _chip(
                "This week",
                f"{float(last.get('hours') or 0):.1f} h · {float(last.get('km') or 0):.0f} km",
                "recorded",
            )
        )
    longest = ctx.longest_recent_minutes()
    if longest:
        evidence.append(_chip("Longest recent", hm(longest), "recorded"))
    told = next((m for m in ctx.memories if m["kind"] == "injury"), None)
    if told:
        # What the athlete told the race team counts as evidence (ADR 0010 core context).
        evidence.append(_chip("You told us", str(told["text"])[:80], "athlete"))
    confidence = (
        "high" if ctx.plan and len(recent) == 2 else "medium" if ctx.plan and weeks else "low"
    )
    base = {"role": "coach", "layer": "training", "evidence": evidence, "confidence": confidence}
    if not ctx.plan:
        return {
            **base,
            "status": "missing",
            "call": "No plan yet. Build one from your race and the training you already do.",
            "action": {"label": "Build my plan", "target": "plan"},
            "ask": "What should my training look like until race day?",
        }
    pending = [p for p in proposals if p.get("status") == "pending"]
    if pending:
        return {
            **base,
            "status": "attention",
            "call": str(pending[0].get("summary") or "Your week was adjusted — review it."),
            "action": {"label": "Review the adjusted week", "target": "proposal"},
            "ask": "Why did you adjust my week, and what happens if I keep the old plan?",
        }
    pct = totals.get("consistency_pct")
    missed = int(totals.get("missed") or 0)
    if missed >= 3 or (pct is not None and pct < 70):
        call = (
            f"{missed} sessions without evidence"
            + (f" ({pct}% consistency)" if pct is not None else "")
            + " — sync them or let the plan adapt."
        )
        status = "attention"
    elif pct is not None:
        call = f"On track: {pct}% consistency with {ctx.days_to_race} days to go."
        status = "on_track"
    else:
        call = (
            f"Plan ready, {ctx.days_to_race} days to go. Log or sync sessions so I can track you."
        )
        status = "on_track" if weeks else "attention"
    return {
        **base,
        "status": status,
        "call": call,
        "action": {"label": "Open my plan", "target": "plan"},
        "ask": "Am I on track for race day?",
    }


def _course(ctx: RaceContext) -> dict[str, Any]:
    checkpoints = [c for c in ctx.event.get("checkpoints") or [] if c.get("km") is not None]
    evidence = []
    if ctx.course:
        evidence.append(_chip("Course", f"{ctx.course.distance_km:.1f} km", "official"))
        if ctx.course.ascent_m is not None:
            evidence.append(_chip("Climbing", f"+{round(ctx.course.ascent_m)} m", "calculated"))
        ups = [c for c in ctx.course.climbs if (c.get("change_m") or 0) > 0]
        if ups:
            evidence.append(_chip("Sustained climbs", str(len(ups)), "calculated"))
    if checkpoints:
        evidence.append(_chip("Checkpoints", str(len(checkpoints)), "athlete"))
    needs_course = ctx.sport in COURSE_SPORTS
    base = {"role": "course", "layer": "course", "evidence": evidence}
    if needs_course and not ctx.course:
        return {
            **base,
            "status": "missing",
            "call": "No course file yet. Add the GPX so pacing follows the real climbs.",
            "confidence": "low",
            "action": {"label": "Add the course", "target": "race?tab=course"},
            "ask": "What should I know about this course before I have the GPX?",
        }
    if ctx.course and not checkpoints and ctx.distance_km >= 20:
        climbs = [c for c in ctx.course.climbs if (c.get("change_m") or 0) > 0]
        biggest = max(climbs, key=lambda c: c.get("change_m") or 0) if climbs else None
        return {
            **base,
            "status": "attention",
            "call": "Course loaded"
            + (
                f"; the biggest climb is +{biggest['change_m']} m at km {biggest['start_km']:g}"
                if biggest
                else ""
            )
            + ". Add the checkpoints for a leg-by-leg plan.",
            "confidence": "medium",
            "action": {"label": "Add checkpoints", "target": "race?tab=course"},
            "ask": "How should I pace the biggest climb?",
        }
    return {
        **base,
        "status": "on_track",
        "call": "Course and checkpoints are in. Pacing and fuel follow them leg by leg."
        if ctx.course
        else f"{ctx.distance_km:g} km — no course file needed for this race.",
        "confidence": "high" if ctx.course else "medium",
        "action": {"label": "Open the course", "target": "race?tab=course"},
        "ask": "Which section of the course will decide my race?",
    }


def build_specialists(ctx: RaceContext, proposals: list[dict[str, Any]]) -> list[dict[str, Any]]:
    fuel_extra = [_chip("Body weight", f"{ctx.weight_kg:g} kg", "athlete")] if ctx.weight_kg else []
    past_fuel = [r for r in ctx.races if (r.get("race_day") or {}).get("carbs_g_per_hour")]
    if past_fuel:
        fuel_extra.append(_chip("Race memory", f"{len(past_fuel)} past races", "athlete"))
    fuel = _layer_call(
        ctx,
        "fuel",
        "fuel",
        due_days=21,
        confidence="high" if ctx.weight_kg and past_fuel else "medium" if ctx.weight_kg else "low",
        extra=fuel_extra,
    )
    logistics_extra = (
        [
            _chip(
                "Conditions",
                str(ctx.conditions.get("summary") or "known"),
                str(ctx.conditions.get("kind") or "assumption"),
            )
        ]
        if ctx.conditions
        else []
    )
    return [
        _coach(ctx, proposals),
        fuel,
        _course(ctx),
        _layer_call(ctx, "gear", "gear", due_days=14, confidence="medium"),
        _layer_call(
            ctx,
            "logistics",
            "logistics",
            due_days=21,
            confidence="high" if ctx.conditions else "medium",
            extra=logistics_extra,
        ),
        _layer_call(
            ctx,
            "strategy",
            "strategy",
            due_days=10,
            confidence="high" if ctx.course and ctx.event.get("checkpoints") else "medium",
        ),
    ]


def _session_day(session: dict[str, Any]) -> date | None:
    try:
        return datetime.fromisoformat(str(session.get("logged_at")).replace("Z", "+00:00")).date()
    except ValueError:
        return None


MILESTONES = (
    (21, "fuel", "Three weeks out: rehearse race fueling on every long session."),
    (14, "gear", "Two weeks out: race in the exact kit on one long session."),
    (7, "logistics", "Race week: travel, bib pick-up and race morning are set now."),
    (2, "strategy", "Two days to go: read your pacing and checkpoint plan once more."),
)


def build_feed(ctx: RaceContext, proposals: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """What changed, newest and most decision-relevant first."""
    feed: list[dict[str, Any]] = []
    for p in proposals:
        if p.get("status") == "pending":
            feed.append(
                {
                    "kind": "proposal",
                    "role": "coach",
                    "title": "Your week was adjusted",
                    "detail": str(p.get("summary") or ""),
                    "when": str(p.get("created_at") or "")[:10] or None,
                    "evidence": [_chip("Changes", str(len(p.get("changes") or [])), "calculated")],
                    "action": {"label": "Review", "target": "proposal"},
                }
            )
    since = ctx.today - timedelta(days=3)
    fresh = [s for s in ctx.sessions if (day := _session_day(s)) and day >= since]
    if fresh:
        minutes = sum(int(s.get("duration_minutes") or 0) for s in fresh)
        feed.append(
            {
                "kind": "training",
                "role": "coach",
                "title": f"{len(fresh)} new session{'s' if len(fresh) != 1 else ''} since {since.strftime('%a %d %b')}",
                "detail": f"{hm(minutes)} recorded. Your plan's progress now counts them.",
                "when": max(str(_session_day(s)) for s in fresh),
                "evidence": [_chip("Recorded", hm(minutes), "recorded")],
                "action": {"label": "See progress", "target": "plan"},
            }
        )
    checkin = ctx.checkins[0] if ctx.checkins else None
    if checkin and str(checkin.get("day")) >= (ctx.today - timedelta(days=1)).isoformat():
        sore = int(checkin.get("soreness") or 0)
        ill = bool(checkin.get("illness"))
        feed.append(
            {
                "kind": "checkin",
                "role": "coach",
                "title": "You reported illness"
                if ill
                else "High soreness"
                if sore >= 4
                else "Check-in received",
                "detail": "Rest today; training while ill delays the build."
                if ill
                else "Swap quality for easy time or rest."
                if sore >= 4
                else "Readiness looks normal — train as planned.",
                "when": str(checkin.get("day")),
                "evidence": [
                    _chip(k.replace("_", " ").title(), str(checkin[k]), "athlete")
                    for k in ("energy", "sleep_quality", "soreness")
                    if checkin.get(k) is not None
                ],
                "action": {"label": "Today's plan", "target": "plan"},
                "severity": "critical" if ill else "attention" if sore >= 4 else "info",
            }
        )
    if ctx.conditions and 0 <= ctx.days_to_race <= 10:
        feed.append(
            {
                "kind": "conditions",
                "role": "logistics",
                "title": "Race forecast",
                "detail": str(ctx.conditions.get("summary") or ""),
                "when": ctx.today.isoformat(),
                "evidence": [],
                "action": {"label": "Check logistics", "target": "race?tab=logistics"},
            }
        )
    for days, role, text in MILESTONES:
        if days - 3 < ctx.days_to_race <= days:
            feed.append(
                {
                    "kind": "milestone",
                    "role": role,
                    "title": f"{ctx.days_to_race} days to go",
                    "detail": text,
                    "when": ctx.today.isoformat(),
                    "evidence": [],
                    "action": {"label": f"Open {role}", "target": f"race?tab={role}"},
                }
            )
            break
    return feed[:8]


def build_cockpit(ctx: RaceContext, proposals: list[dict[str, Any]]) -> dict[str, Any]:
    specialists = build_specialists(ctx, proposals)
    return {
        "days_to_race": ctx.days_to_race,
        "specialists": specialists,
        "feed": build_feed(ctx, proposals),
        "summary": {
            status: sum(1 for s in specialists if s["status"] == status)
            for status in ("on_track", "attention", "missing")
        },
    }
