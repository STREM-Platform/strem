"""A season plan with no single race: base, build, race season, off-season, recovery (#18).

Volume starts from what the athlete actually trains (recorded) or says they
train, a lighter week every fourth, the long session around a third of the
week, and the focus decides the rest: base builds aerobic volume and strength,
build adds one quality session, race season holds fitness, off-season and
recovery stay light. Races inside the season keep their own race plans; this
plan fills the rest. Every input is listed in the assumptions.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

FOCUS_TITLE = {
    "base": "Base",
    "build": "Build",
    "race_season": "Race season",
    "off_season": "Off-season",
    "recovery": "Recovery",
}
# (weekly volume vs. current at the end of the season, quality sessions, strength sessions)
FOCUS_SHAPE = {
    "base": (1.25, 0, 2),
    "build": (1.15, 1, 1),
    "race_season": (1.0, 1, 1),
    "off_season": (0.6, 0, 2),
    "recovery": (0.4, 0, 0),
}
PHASE = {
    "base": "base",
    "build": "build",
    "race_season": "specific",
    "off_season": "recovery",
    "recovery": "recovery",
}
WEEKDAY = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")


def monday(day: date) -> date:
    return day - timedelta(days=day.weekday())


def weekly_hours(sessions: list[dict[str, Any]], today: date) -> float | None:
    """Average hours over the last four complete weeks of logged/imported sessions."""
    start = monday(today) - timedelta(weeks=4)
    total = 0.0
    for s in sessions:
        try:
            day = datetime.fromisoformat(str(s.get("logged_at")).replace("Z", "+00:00")).date()
        except ValueError:
            continue
        if start <= day < monday(today):
            total += float(s.get("duration_minutes") or 0) / 60
    return round(total / 4, 1) if total else None


def build_season_plan(
    season: dict[str, Any],
    *,
    today: date,
    profile: dict[str, Any] | None,
    sessions: list[dict[str, Any]],
    sport: str,
    timezone: str,
) -> dict[str, Any]:
    focus = str(season.get("focus") or "base")
    end_factor, quality_n, strength_n = FOCUS_SHAPE.get(focus, FOCUS_SHAPE["base"])
    start = max(date.fromisoformat(str(season["start_date"])), today)
    end = date.fromisoformat(str(season["end_date"]))
    first = monday(start)
    n_weeks = max(1, min(52, (monday(end) - first).days // 7 + 1))
    profile = profile or {}
    assumptions: list[str] = []
    recorded = weekly_hours(sessions, today)
    if recorded:
        current = recorded
        assumptions.append(f"Starting from {current} h/week (your recorded last 4 weeks)")
    elif profile.get("weekly_hours"):
        current = float(profile["weekly_hours"])
        assumptions.append(f"Starting from {current} h/week (your profile)")
    else:
        current = 5.0
        assumptions.append(
            "Starting from about 5 h/week (nothing recorded — connect a tracker so it fits you)"
        )
    days = int(profile.get("training_days_per_week") or 4)
    assumptions.append(f"{days} training days a week")
    run = "trail_running" if sport in ("trail_running", "ultra_running") else "running"
    weeks: list[dict[str, Any]] = []
    target = current * end_factor
    for i in range(n_weeks):
        lighter = i % 4 == 3 and i < n_weeks - 1
        # Building blocks ramp toward the target; off-season and recovery sit there from week one.
        level = (
            target if end_factor < 1 else current + (target - current) * (i / max(n_weeks - 1, 1))
        )
        hours = round(level * (0.75 if lighter else 1.0), 1)
        week_start = first + timedelta(weeks=i)
        sessions_out: list[dict[str, Any]] = []

        def add(
            offset: int,
            kind: str,
            title: str,
            minutes: int,
            sport_: str = run,
            intensity: str = "easy",
            key: bool = False,
            _week: date = week_start,
            _out: list[dict[str, Any]] = sessions_out,
            _n: int = i + 1,
        ) -> None:
            day = _week + timedelta(days=offset)
            if day < start or day > end or minutes <= 0:
                return
            _out.append(
                {
                    "id": f"w{_n}-{WEEKDAY[offset]}-{kind}".replace("_", "-"),
                    "date": day.isoformat(),
                    "sport": sport_,
                    "kind": kind,
                    "title": title,
                    "duration_minutes": minutes,
                    "intensity": intensity,
                    "key": key,
                }
            )

        minutes = int(hours * 60)
        long_min = int(minutes * (0.3 if focus != "recovery" else 0.25) / 5) * 5
        add(
            5,
            "long",
            "Long aerobic session" if focus != "off_season" else "Long day out (hike, ride or run)",
            long_min,
            run if focus != "off_season" else "hiking",
            key=True,
        )
        left = minutes - long_min
        if quality_n and not lighter and focus != "recovery":
            q = int(min(60, left * 0.3) / 5) * 5
            add(
                1,
                "tempo" if focus == "race_season" else "hills",
                "Tempo / race-pace session" if focus == "race_season" else "Hill session",
                q,
                intensity="threshold",
                key=True,
            )
            left -= q
        for k in range(strength_n if not lighter else max(strength_n - 1, 0)):
            add(2 if k == 0 else 4, "strength", "Strength & mobility", 40, "strength", "moderate")
            left -= 40
        easy_days = [
            d
            for d in (3, 0, 6, 4, 2)
            if not any(
                s["date"] == (week_start + timedelta(days=d)).isoformat() for s in sessions_out
            )
        ]
        easy_n = max(0, min(days - len(sessions_out), len(easy_days)))
        for d in easy_days[:easy_n]:
            add(
                d,
                "easy" if focus != "off_season" else "cross",
                "Easy aerobic session"
                if focus != "off_season"
                else "Easy cross-training (bike, swim, hike)",
                max(25, int(left / max(easy_n, 1) / 5) * 5),
                run if focus != "off_season" else "cycling",
            )
        if not sessions_out:
            continue
        weeks.append(
            {
                "index": len(weeks) + 1,
                "start_date": week_start.isoformat(),
                "phase": "recovery"
                if lighter and focus in ("base", "build")
                else PHASE.get(focus, "base"),
                "focus": f"{FOCUS_TITLE.get(focus, 'Season')} week"
                + (" · lighter" if lighter else ""),
                "target_hours": round(sum(s["duration_minutes"] for s in sessions_out) / 60, 1),
                "sessions": sorted(sessions_out, key=lambda s: s["date"]),
            }
        )
    name = str(season.get("name") or FOCUS_TITLE.get(focus, "Season"))
    return {
        "headline": f"{name} — {len(weeks)} weeks",
        "summary": (
            f"A {FOCUS_TITLE.get(focus, 'season').lower()} block from {start.isoformat()} to {end.isoformat()}: "
            f"weekly volume moves from about {current:g} h toward {target:.1f} h with a lighter week every fourth week. "
            "Races in this season keep their own race plans."
        ),
        "sport": sport,
        "timezone": timezone,
        "start_date": start.isoformat(),
        "race_date": None,
        "phases": [],
        "weeks": weeks,
        "principles": [
            "Most time is easy; one key session and one long session carry the week.",
            "A lighter week every fourth week lets the work land.",
            "Missed a session? Don't make it up — continue with the next one.",
        ],
        "assumptions": assumptions,
        "warnings": [],
    }
