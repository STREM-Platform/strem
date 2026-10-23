"""Race logistics: a dated timeline from today to the finish line.

Deadlines are placed relative to race day and never before today (an overdue
task is due today). Crew, drop bags and travel tasks appear only when the race
format or the athlete's situation calls for them.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from app.race.context import RaceContext
from app.race.engine.common import estimate_finish, family, hm, race_start_hour

Item = dict[str, Any]


def build_logistics(ctx: RaceContext) -> dict[str, Any]:
    race = ctx.race_date
    today = ctx.today
    fam = family(ctx)
    minutes = estimate_finish(ctx).minutes
    support = ctx.event.get("support")
    fmt = ctx.event.get("format") or "single_day"
    home = ctx.prep.get("home_location")
    travel_note = ctx.prep.get("travel_notes")
    far = (
        isinstance(home, str)
        and bool(home.strip())
        and (home.strip().lower() not in str(ctx.event.get("location_name", "")).lower())
    )

    def due(days_before: int) -> str:
        return max(today, race - timedelta(days=days_before)).isoformat()

    admin: list[Item] = [
        {
            "id": "registration",
            "title": "Confirm registration and bib category",
            "due_date": due(70),
            "priority": "high",
        },
        {
            "id": "race-rules",
            "title": "Read the athlete guide: rules, cutoffs, aid stations",
            "due_date": due(42),
            "priority": "high",
        },
        {
            "id": "insurance",
            "title": "Check health / rescue insurance covers the race",
            "detail": "Mountain and overseas races often require rescue cover.",
            "due_date": due(42),
        },
        {
            "id": "medical-cert",
            "title": "Medical certificate or licence if the race requires it",
            "detail": "Some countries require a doctor-signed certificate.",
            "due_date": due(35),
        },
        {
            "id": "calendar-block",
            "title": "Block race weekend and key long sessions in your calendar",
            "due_date": due(60),
        },
    ]
    if far or travel_note:
        travel: list[Item] = [
            {
                "id": "book-travel",
                "title": "Book travel to the race",
                "detail": travel_note or f"From {home}.",
                "due_date": due(56),
                "priority": "high",
            },
            {
                "id": "book-stay",
                "title": "Book accommodation close to the start",
                "detail": "Book early — race towns fill up.",
                "due_date": due(56),
                "priority": "high",
            },
            {
                "id": "arrival-day",
                "title": "Plan to arrive at least 1-2 days before",
                "detail": "Longer if crossing 3+ time zones or racing at altitude.",
                "due_date": due(42),
            },
            {
                "id": "start-transport",
                "title": "Plan transport to the start on race morning",
                "detail": "Shuttle times, parking, walking time.",
                "due_date": due(14),
            },
        ]
    else:
        travel = [
            {
                "id": "start-transport",
                "title": "Plan transport to the start on race morning",
                "detail": "Shuttle times, parking, walking time.",
                "due_date": due(14),
            },
            {
                "id": "home-support",
                "title": "Arrange family/work cover for race day and long-session days",
                "due_date": due(30),
            },
        ]
    sections: list[dict[str, Any]] = [
        {"id": "admin", "title": "Registration & admin", "kind": "checklist", "items": admin},
        {"id": "travel", "title": "Travel & stay", "kind": "checklist", "items": travel},
    ]
    if support == "crewed" or fmt in ("multi_stage", "non_stop") or minutes >= 10 * 60:
        crew: list[Item] = [
            {
                "id": "drop-bags",
                "title": "Plan drop-bag contents per location",
                "detail": "Spare socks, fuel refills, layers, lights.",
                "due_date": due(10),
                "priority": "high",
            },
            {
                "id": "label-bags",
                "title": "Label and hand in drop bags at registration",
                "due_date": due(1),
            },
        ]
        if support == "crewed":
            crew = [
                {
                    "id": "crew-brief",
                    "title": "Brief your crew: plan, splits, what you need where",
                    "due_date": due(14),
                    "priority": "high",
                },
                {
                    "id": "crew-access",
                    "title": "Map crew access points, parking and travel times",
                    "due_date": due(21),
                },
                {
                    "id": "crew-kit",
                    "title": "Pack a crew box: food, spares, first aid, layers",
                    "due_date": due(3),
                },
                *crew,
            ]
        sections.append(
            {"id": "crew", "title": "Crew & drop bags", "kind": "checklist", "items": crew}
        )
    sections.append(_race_week(ctx, race, today, fam))
    sections.append(_race_morning(ctx, minutes, fam))
    sections.append(
        {
            "id": "after",
            "title": "After the finish",
            "kind": "checklist",
            "items": [
                {"id": "recovery-food", "title": "Eat and drink within 60 minutes of finishing"},
                {"id": "ride-home", "title": "Transport from the finish arranged"},
                {
                    "id": "debrief",
                    "title": "Log your result and lessons in STREM within 2 days",
                    "due_date": (race + timedelta(days=2)).isoformat(),
                },
            ],
        }
    )
    overdue = [
        item["title"]
        for section in sections
        for item in section["items"]
        if item.get("due_date") == today.isoformat() and (race - today).days > 3
    ]
    warnings = []
    if overdue:
        warnings.append("Already due: " + "; ".join(overdue[:4]))
    return {
        "headline": f"{(race - today).days} days of logistics, sequenced to race morning",
        "summary": (
            "Everything that is not training but can still ruin race day: admin, travel, "
            "accommodation, transport to the start, crew and drop bags, the race week and the "
            "race-morning routine. Tick tasks off as you go; overdue ones surface on your home screen."
        ),
        "metrics": [
            {"label": "Tasks", "value": str(sum(len(s["items"]) for s in sections))},
            {"label": "Race start", "value": str(ctx.event.get("start_time") or "unknown")},
        ],
        "sections": sections,
        "warnings": warnings,
        "assumptions": [
            "Deadlines are typical lead times; follow organizer deadlines where they differ.",
            *(
                ["Start time unknown — race-morning times are relative to the start"]
                if not ctx.event.get("start_time")
                else []
            ),
        ],
        "sources": ["STREM race engine: race date, format, support and your travel answers"],
    }


def _race_week(ctx: RaceContext, race: date, today: date, fam: str) -> dict[str, Any]:
    plan = [
        (7, "Check the long-range forecast; adjust gear and fluids", "high"),
        (5, "Charge everything; download the course to your watch", "normal"),
        (3, "Lay out all race kit and fuel; tick the gear list", "high"),
        (2, "Start carb loading; travel if needed", "normal"),
        (1, "Bib pickup and race briefing; final kit check; early night", "critical"),
    ]
    items = []
    for days_before, title, priority in plan:
        day = race - timedelta(days=days_before)
        if day < today:
            continue
        items.append(
            {
                "id": f"race-week-{days_before}",
                "title": title,
                "when": f"Race day −{days_before}",
                "due_date": day.isoformat(),
                "priority": priority,
            }
        )
    return {
        "id": "race-week",
        "title": "Race week",
        "kind": "timeline",
        "description": "Training is tapering; logistics take over.",
        "items": items,
    }


def _race_morning(ctx: RaceContext, minutes: int, fam: str) -> dict[str, Any]:
    start = race_start_hour(ctx)

    def at(offset_min: int) -> str:
        if not start:
            return f"Start {'+' if offset_min >= 0 else '−'}{hm(abs(offset_min))}"
        total = start[0] * 60 + start[1] + offset_min
        total %= 24 * 60
        return f"{total // 60:02d}:{total % 60:02d}"

    steps = [
        (-180, "wake", "Wake up, drink 300-500 ml"),
        (-170, "breakfast", "Race breakfast (rehearsed)"),
        (-90, "leave", "Leave for the start with everything packed"),
        (-60, "arrive", "Arrive, toilet, drop bags, final kit check"),
        (-25, "warm-up", "Short warm-up and mobility"),
        (-10, "corral", "In the start area, first sip, deep breaths"),
        (0, "start", "Start — first 20% deliberately easy"),
    ]
    if fam == "tri":
        steps.insert(3, (-75, "transition", "Rack bike, set up transition, check tyres"))
    items = [
        {"id": f"morning-{key}", "title": title, "when": at(offset)} for offset, key, title in steps
    ]
    return {
        "id": "race-morning",
        "title": "Race morning",
        "kind": "timeline",
        "description": "Rehearse this timing before a long session at least once.",
        "items": items,
    }
