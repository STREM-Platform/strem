"""Periodized training plan from the plan start to race day.

Structure: base -> build -> specific -> taper, a lighter week every fourth
loading week, weekly load rising at most 6-10% (by level), long sessions
progressing toward a race-appropriate peak, ~80% of time easy, and the race
itself as the last session. Everything is computed; every input is listed.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from app.race.context import RaceContext
from app.race.engine.common import (
    BIKE_SPEED,
    RUN_EASY_PACE,
    SWIM_PACE,
    WEEKDAYS,
    Family,
    Level,
    day_text,
    estimate_finish,
    family,
    hm,
    level,
    monday,
)

TAPER_FACTORS = {1: [0.55], 2: [0.72, 0.5], 3: [0.82, 0.65, 0.5]}
TAPER_LONG = {1: [0.4], 2: [0.6, 0.35], 3: [0.7, 0.5, 0.35]}
RAMP = {"new": 1.06, "some": 1.07, "experienced": 1.08, "elite": 1.10}
DEFAULT_DAYS = {"new": 4, "some": 5, "experienced": 5, "elite": 6}
LEVEL_VOLUME = {"new": 0.75, "some": 0.9, "experienced": 1.0, "elite": 1.3}
LEVEL_LONG = {"new": 0.85, "some": 0.95, "experienced": 1.0, "elite": 1.05}


def peak_hours_target(fam: Family, finish: int, lvl: Level) -> float:
    if fam == "run":
        base = 4.5 if finish < 60 else 6 if finish < 120 else 8 if finish < 260 else 10
    elif fam == "trail":
        base = 6 if finish < 120 else 8 if finish < 300 else 10 if finish < 600 else 12
        if finish >= 1200:
            base = 14
    elif fam == "bike":
        base = 7 if finish < 180 else 9 if finish < 360 else 12 if finish < 720 else 14
    elif fam == "swim":
        base = 4 if finish < 60 else 6 if finish < 180 else 8
    elif fam == "tri":
        base = 6 if finish < 120 else 8 if finish < 240 else 11 if finish < 420 else 14
    elif fam == "hike":
        base = 6 if finish < 360 else 9 if finish < 1440 else 12
    else:
        base = 6 if finish < 120 else 8
    return round(base * LEVEL_VOLUME[lvl], 1)


def long_target_minutes(fam: Family, finish: int, lvl: Level) -> int:
    if fam == "run":
        value = min(max(finish * 0.75, 60), 180)
    elif fam == "trail":
        value = finish * 0.8 if finish <= 240 else min(finish * 0.6, 300) if finish <= 480 else 330
    elif fam == "bike":
        value = min(finish * 0.85, 360)
    elif fam == "swim":
        value = min(max(finish, 45), 120)
    elif fam == "tri":
        value = min(max(finish * 0.45, 75), 330)  # the long ride
    elif fam == "hike":
        value = min(finish * 0.6, 480)
    elif fam == "ski":
        value = min(finish * 0.8, 300)
    elif fam == "row":
        value = min(max(finish, 45), 150)
    else:
        value = 90
    return int(round(value * LEVEL_LONG[lvl] / 5) * 5)


def _round(value: float, step: float) -> float:
    return round(round(value / step) * step, 2)


class _Week:
    """Collects one week's sessions with unique ids."""

    def __init__(self, index: int, start: date, phase: str, plan_start: date, race: date) -> None:
        self.index, self.start, self.phase = index, start, phase
        self.plan_start, self.race = plan_start, race
        self.sessions: list[dict[str, Any]] = []
        self._ids: set[str] = set()

    def day(self, weekday: int) -> date:
        return self.start + timedelta(days=weekday % 7)

    def usable(self, weekday: int) -> bool:
        day = self.day(weekday)
        return self.plan_start <= day < self.race

    def add(self, weekday: int, sport: str, kind: str, title: str, **fields: Any) -> None:
        if not self.usable(weekday):
            return
        day = self.day(weekday)
        base = f"w{self.index}-{WEEKDAYS[day.weekday()][:3]}-{kind}"
        sid, n = base, 2
        while sid in self._ids:
            sid, n = f"{base}-{n}", n + 1
        self._ids.add(sid)
        self.sessions.append(
            {
                "id": sid.replace("_", "-"),
                "date": day.isoformat(),
                "sport": sport,
                "kind": kind,
                "title": title,
                **{k: v for k, v in fields.items() if v is not None},
            }
        )


def build_plan(ctx: RaceContext) -> dict[str, Any]:
    fam, lvl = family(ctx), level(ctx)
    finish = estimate_finish(ctx)
    prep = ctx.prep
    race = ctx.race_date
    requested_start = date.fromisoformat(prep["start_date"]) if prep.get("start_date") else None
    plan_start = max(ctx.today, requested_start or ctx.today)
    plan_start = min(plan_start, race)
    first_monday, race_monday = monday(plan_start), monday(race)
    n_weeks = (race_monday - first_monday).days // 7 + 1

    assumptions: list[str] = []
    warnings: list[str] = []
    days = prep.get("training_days_per_week")
    if days:
        assumptions.append(f"{days} training days per week (your answer)")
    else:
        days = DEFAULT_DAYS[lvl]
        assumptions.append(
            f"{days} training days per week (default for your level — edit in intake)"
        )
    days = int(days)

    available = prep.get("weekly_hours")
    peak_target = peak_hours_target(fam, finish.minutes, lvl)
    if available:
        assumptions.append(f"{available} h available per week (your answer)")
        peak = min(float(available), peak_target * 1.15)
    else:
        peak = peak_target
        assumptions.append(f"Peak week of about {peak:.1f} h (typical for this race and level)")

    current = prep.get("current_weekly_hours")
    if current:
        assumptions.append(f"Starting from {current} h/week (your answer)")
    else:
        recorded = ctx.recent_weekly_hours()
        if recorded:
            current = recorded
            assumptions.append(f"Starting from {recorded} h/week (your recorded last 4 weeks)")
        else:
            current = round(peak * 0.55, 1)
            assumptions.append(
                f"Starting from about {current} h/week (no volume recorded or entered — "
                "connect Strava or enter it so the plan fits you)"
            )
    current = float(current)
    peak = max(peak, current)
    if available and float(available) < peak_target * 0.7:
        warnings.append(
            f"About {peak_target:.0f} h/week is typical at the peak for this race; with "
            f"{available} h the plan protects the long session and race-specific work first."
        )

    finish_min = finish.minutes
    # Multi-day events are rehearsed day by day: size the long session from one
    # stage/day, and keep it within a sane share of the peak week.
    days_racing = 1
    if ctx.event.get("end_date"):
        days_racing = (date.fromisoformat(ctx.event["end_date"]) - race).days + 1
    stages = max(int(ctx.event.get("stages") or 1), days_racing)
    day_minutes = finish_min / stages if stages > 1 else finish_min
    long_wanted = long_target_minutes(fam, int(day_minutes), lvl)
    back_to_back_event = fam in ("trail", "hike") and (finish_min >= 360 or stages > 1)
    long_peak = min(long_wanted, int(peak * 60 * (0.46 if back_to_back_event else 0.5)))
    if long_wanted - long_peak >= 20:
        warnings.append(
            f"With {peak:g} h a week the long session tops out at {hm(long_peak)}; about "
            f"{hm(long_wanted)} is typical for this race. More weekly time would let it grow."
        )
    longest_recent = None
    if prep.get("longest_recent_hours"):
        longest_recent = float(prep["longest_recent_hours"]) * 60
    elif ctx.longest_recent_minutes():
        longest_recent = float(ctx.longest_recent_minutes() or 0)
    # Start from a regular long session, not the longest effort (often a race),
    # and never above what the current weekly volume supports.
    if longest_recent:
        long_start = min(longest_recent * 0.85, current * 60 * 0.4)
    else:
        long_start = current * 60 * 0.3
    long_start = max(30.0, min(long_start, long_peak))
    assumptions.append(finish.note + f": {hm(finish_min)}")
    assumptions.append(f"Long session builds from {hm(long_start)} toward {hm(long_peak)}")

    taper_n = 1 if finish_min < 120 else 2 if finish_min < 330 else 3
    taper_n = min(taper_n, max(n_weeks - 1, 1)) if n_weeks > 1 else 1
    load_weeks = n_weeks - taper_n
    if load_weeks >= 12:
        split = (0.4, 0.35)
    elif load_weeks >= 6:
        split = (0.3, 0.35)
    elif load_weeks >= 3:
        split = (0.0, 0.5)
    else:
        split = (0.0, 0.0)
    base_n = round(load_weeks * split[0])
    build_n = round(load_weeks * split[1])
    specific_n = max(load_weeks - base_n - build_n, 0)
    phase_of: list[str] = (
        ["base"] * base_n + ["build"] * build_n + ["specific"] * specific_n + ["taper"] * taper_n
    )
    if n_weeks <= 1:
        phase_of = ["race"]
    else:
        phase_of[-1] = "race"
    minimum = {"run": 8, "trail": 10, "bike": 8, "swim": 6, "tri": 12, "hike": 8}.get(fam, 8)
    if finish_min > 300:
        minimum += 4
    if n_weeks < minimum:
        warnings.append(
            f"{n_weeks} weeks is a short runway for this race (about {minimum}+ is typical). "
            "The plan prioritizes arriving healthy and rehearsing race day over chasing fitness."
        )

    # Weekly hours: ramp toward the peak with a lighter week every fourth loading
    # week, spread so the peak arrives with the race-specific block — never
    # faster than the level's safe weekly increase.
    hours: list[float] = []
    level_hours = min(current, peak)
    ramping = [
        i
        for i in range(1, min(base_n + build_n, load_weeks))
        if not (i % 4 == 3 and i < load_weeks - 1)
    ]
    ramp = RAMP[lvl]
    if ramping and level_hours > 0:
        ramp = min(ramp, max(1.0, (peak / level_hours) ** (1 / len(ramping))))
    for i in range(load_weeks):
        if i % 4 == 3 and i < load_weeks - 1:
            hours.append(round(level_hours * 0.7, 2))
            continue
        if i > 0:
            level_hours = min(peak, level_hours * ramp)
        hours.append(round(level_hours, 2))
    peak_reached = max(hours) if hours else current
    for factor in TAPER_FACTORS[taper_n] if n_weeks > 1 else [0.5]:
        hours.append(round(peak_reached * factor, 2))
    hours = hours[:n_weeks]

    # Long session: linear progression across non-lighter loading weeks.
    loading = [i for i in range(load_weeks) if not (i % 4 == 3 and i < load_weeks - 1)]
    longs: list[float] = []
    for i in range(n_weeks):
        if i < load_weeks:
            if i in loading:
                pos = loading.index(i)
                frac = pos / max(len(loading) - 1, 1)
                value = long_start + (long_peak - long_start) * frac
            else:
                value = (longs[-1] if longs else long_start) * 0.7
        else:
            factors = TAPER_LONG[taper_n]
            value = long_peak * factors[min(i - load_weeks, len(factors) - 1)]
        longs.append(value)

    long_day = WEEKDAYS.index(prep["long_session_day"]) if prep.get("long_session_day") else 5
    strength_n = prep.get("strength_sessions_per_week")
    if strength_n is None:
        strength_n = 2 if lvl == "new" else 1
    strength_n = int(strength_n)

    density = (ctx.elevation_m or 0) / max(ctx.distance_km, 1)
    weeks: list[dict[str, Any]] = []
    for i in range(n_weeks):
        start = first_monday + timedelta(weeks=i)
        phase = phase_of[i]
        lighter = i < load_weeks and i % 4 == 3 and i < load_weeks - 1
        wk = _Week(i + 1, start, phase, plan_start, race)
        long_min = int(_round(min(longs[i], hours[i] * 60 * 0.5), 5))
        _fill_week(
            wk,
            fam,
            lvl,
            phase,
            minutes=int(hours[i] * 60),
            long_min=long_min,
            days=days,
            long_day=long_day,
            strength_n=0 if phase in ("taper", "race") else strength_n,
            density=density,
            finish_min=finish_min,
            race_sim=(phase == "specific" and i % 2 == 1),
            back_to_back=(back_to_back_event and phase == "specific"),
        )
        if phase == "race":
            _race_days(wk, ctx, finish_min)
        if not wk.sessions:
            continue
        planned_km = sum(s.get("distance_km") or 0 for s in wk.sessions if s["kind"] != "race")
        planned_elev = sum(s.get("elevation_m") or 0 for s in wk.sessions if s["kind"] != "race")
        weeks.append(
            {
                "index": i + 1,
                "start_date": start.isoformat(),
                "phase": phase,
                "focus": _focus(fam, phase, lighter, long_min),
                "target_hours": round(
                    sum(
                        (s.get("duration_minutes") or 0) for s in wk.sessions if s["kind"] != "race"
                    )
                    / 60,
                    1,
                ),
                "target_km": round(planned_km, 1) if planned_km else None,
                "target_elevation_m": int(planned_elev) if planned_elev else None,
                "long_session": _long_label(wk.sessions),
                "sessions": sorted(wk.sessions, key=lambda s: (s["date"], s["kind"] == "rest")),
            }
        )
    for index, week in enumerate(weeks, start=1):
        week["index"] = index
    phases = _phase_ranges(weeks, race)
    if any(i.get("area") for i in (ctx.profile or {}).get("injuries") or []):
        warnings.append(
            "You reported an injury history. Keep intensity easy when it flares, and get "
            "persistent pain assessed by a physio or doctor — STREM does not diagnose."
        )
    ill = [c for c in ctx.checkins[:3] if c.get("illness")]
    if ill:
        warnings.append("Recent check-ins report illness: rest until symptoms clear; resume easy.")
    title = ctx.event.get("name") or "your race"
    return {
        "headline": f"{len(weeks)} weeks to {title}",
        "summary": (
            f"A {len(weeks)}-week {fam if fam != 'tri' else 'multisport'} build from "
            f"{day_text(plan_start)} to race day: {base_n} base, {build_n} build, "
            f"{specific_n} race-specific and {taper_n} taper week(s). Weekly load rises "
            f"gradually to about {peak_reached:.1f} h with a lighter week every fourth week; "
            f"the long session grows to {hm(long_peak)}. Most time is easy — the hard work is "
            "concentrated in one quality session and the long session each week."
        ),
        "sport": ctx.sport,
        "timezone": str(ctx.event.get("timezone") or "UTC"),
        "start_date": plan_start.isoformat(),
        "race_date": race.isoformat(),
        "phases": phases,
        "weeks": weeks,
        "principles": [
            "About 80% of training time is easy (you can talk in full sentences).",
            f"Weekly load rises at most ~{round((RAMP[lvl] - 1) * 100)}% per week, with a lighter week every fourth week.",
            "One quality session and one long session carry the week; everything else is easy.",
            "Long sessions double as race-day rehearsals: fuel, gear and pacing.",
            "Taper cuts volume, not intensity, so you arrive fresh and sharp.",
            "Missed a session? Don't make it up — continue with the next one.",
        ],
        "assumptions": assumptions[:16],
        "warnings": warnings[:12],
    }


def _fill_week(
    wk: _Week,
    fam: Family,
    lvl: Level,
    phase: str,
    *,
    minutes: int,
    long_min: int,
    days: int,
    long_day: int,
    strength_n: int,
    density: float,
    finish_min: int,
    race_sim: bool,
    back_to_back: bool,
) -> None:
    if phase == "race":
        _race_week(wk, fam, lvl, long_day, minutes)
        return
    L = long_day
    order = [L, L - 4, L - 2, L + 1, L - 3, L - 5, L - 1][: max(1, min(days, 7))]
    strength_minutes = 35 * strength_n
    endurance = max(minutes - strength_minutes, long_min + 30)
    if fam == "tri":
        _tri_week(wk, lvl, phase, endurance, long_min, days, L, race_sim)
    else:
        quality = int(max(35, min(90, endurance * 0.16)))
        second_long = int(_round(long_min * 0.4, 5)) if back_to_back else 0
        easy_slots = [d for d in order if d not in (L, L - 4)]
        if back_to_back and (L + 1) in easy_slots:
            easy_slots.remove(L + 1)
        remaining = endurance - long_min - quality - second_long
        easy_count = len(easy_slots)
        while easy_count and remaining / easy_count < 25:
            easy_count -= 1
        easy_each = int(max(25, min(80, remaining / easy_count))) if easy_count else 0
        _long_session(wk, fam, lvl, phase, L, long_min, density, finish_min, race_sim)
        if days >= 2:
            _quality_session(wk, fam, lvl, phase, L - 4, quality, density)
        if second_long:
            _endurance(wk, fam, lvl, L + 1, second_long, density, "back_to_back", phase)
        for slot in easy_slots[:easy_count]:
            _endurance(wk, fam, lvl, slot, easy_each, density, "easy", phase)
    strength_days = [d for d in (L - 5, L - 2, L - 3) if wk.usable(d)][:strength_n]
    for slot in strength_days:
        wk.add(
            slot,
            "strength",
            "strength",
            "Strength & stability",
            purpose="Durability: legs, hips and core resist fatigue late in the race.",
            duration_minutes=35,
            intensity="moderate",
            structure=[
                "5 min mobility warm-up",
                "3 rounds: split squats 8/side, step-ups 10/side, single-leg RDL 8/side",
                "3 rounds: calf raises 15, side plank 30 s/side, dead bug 10",
                "5 min stretch",
            ],
        )
    used = {date.fromisoformat(s["date"]).weekday() for s in wk.sessions}
    for weekday in range(7):
        if weekday not in used and wk.usable(weekday):
            wk.add(
                weekday,
                "rest",
                "rest",
                "Rest",
                purpose="Adaptation happens here. Sleep, eat well, move gently if you like.",
                duration_minutes=0,
                intensity="rest",
            )


def _pace(fam: Family, lvl: Level) -> float:
    """Easy minutes per km for distance estimates."""
    if fam == "trail":
        return RUN_EASY_PACE[lvl] * 1.25
    if fam == "hike":
        return 60 / 4.2
    if fam == "bike":
        return 60 / (BIKE_SPEED[lvl] * 0.85)
    if fam == "swim":
        return SWIM_PACE[lvl] * 1.15 * 10
    if fam == "ski":
        return 60 / 7.0
    if fam == "row":
        return 60 / 8.0
    return RUN_EASY_PACE[lvl]


def _sport(fam: Family) -> str:
    return {
        "run": "running",
        "trail": "trail_running",
        "bike": "cycling",
        "swim": "swimming",
        "hike": "hiking",
        "ski": "skiing",
        "row": "rowing",
        "hybrid": "hybrid",
        "tri": "running",
    }[fam]


def _distance(fam: Family, lvl: Level, minutes: int) -> float | None:
    if fam == "hybrid":
        return None
    step = 0.1 if fam == "swim" else 0.5
    return _round(minutes / _pace(fam, lvl), step)


def _elevation(fam: Family, km: float | None, density: float, phase: str) -> int | None:
    if fam not in ("trail", "hike", "ski") or not km or density <= 0:
        return None
    factor = {"base": 0.5, "build": 0.8, "specific": 1.0, "taper": 0.6}.get(phase, 0.6)
    return int(_round(km * density * factor, 50)) or None


def _long_session(
    wk: _Week,
    fam: Family,
    lvl: Level,
    phase: str,
    slot: int,
    minutes: int,
    density: float,
    finish_min: int,
    race_sim: bool,
) -> None:
    km = _distance(fam, lvl, minutes)
    noun = {
        "bike": "ride",
        "swim": "swim",
        "hike": "hike",
        "ski": "tour",
        "row": "row",
    }.get(fam, "run")
    if race_sim:
        title = f"Race simulation {noun}"
        purpose = (
            "Dress rehearsal: race kit, race shoes, race fuel at race-day carbs per hour, "
            "terrain like the course. Note what worked in the session notes."
        )
        kind = "race_sim"
    elif phase == "specific":
        title = f"Long {noun} on race-like terrain"
        purpose = "Builds the durability the course demands; practice fueling every 20-30 min."
        kind = "long"
    else:
        title = f"Long {noun}"
        purpose = (
            "Aerobic endurance at conversational effort. Practice drinking and eating on the move."
        )
        kind = "long"
    fuel = None
    if minutes >= 75:
        carbs = 30 if phase == "base" else 50 if phase == "build" else 70
        fuel = f"Rehearse {carbs} g carbs per hour with the products you will race with."
    wk.add(
        slot,
        _sport(fam),
        kind,
        title,
        purpose=purpose,
        duration_minutes=minutes,
        distance_km=km,
        elevation_m=_elevation(fam, km, density, phase),
        intensity="steady" if race_sim else "easy",
        structure=_long_structure(fam, phase, minutes, race_sim),
        fueling=fuel,
        terrain="Like the course: climbs and technical descents"
        if fam in ("trail", "hike")
        else None,
        key=True,
    )


def _long_structure(fam: Family, phase: str, minutes: int, race_sim: bool) -> list[str]:
    if race_sim:
        return [
            "Race-morning routine: same breakfast and timing as race day",
            f"{max(15, minutes // 6)} min easy, then settle into planned race effort",
            "Eat and drink on your race schedule from the first 30 min",
            "Last 20 min: hold form when tired — this is the finish of your race",
        ]
    if fam in ("trail", "hike", "ski"):
        return [
            "Start easy for 20 min",
            "Power-hike steep climbs; keep effort conversational",
            "Descend relaxed with quick feet — practice, don't race the downhills",
        ]
    return [
        "First third very easy",
        "Middle third steady and relaxed",
        "Final third: smooth, controlled — finish feeling you could do more",
    ]


def _quality_session(
    wk: _Week, fam: Family, lvl: Level, phase: str, slot: int, minutes: int, density: float
) -> None:
    sport = _sport(fam)
    if phase == "base":
        title, kind, intensity = "Steady + strides", "tempo", "moderate"
        structure = [
            "15 min easy",
            f"{max(15, minutes - 30)} min steady (comfortably hard, short sentences)",
            "6 × 20 s fast & relaxed with full recovery",
            "10 min easy",
        ]
        purpose = "Raises aerobic capacity and keeps leg speed without fatigue."
    elif phase == "build":
        if fam in ("trail", "hike", "ski"):
            title, kind, intensity = "Hill repeats", "hills", "hard"
            structure = [
                "15 min easy to the hill",
                "6-10 × 3 min uphill at hard effort, walk/jog down",
                "Descend the last rep with quick, light steps",
                "10 min easy",
            ]
            purpose = "Climbing strength and power — the engine for the course's ascents."
        elif fam == "bike":
            title, kind, intensity = "Threshold intervals", "intervals", "threshold"
            structure = [
                "15 min progressive warm-up",
                "3 × 12 min at threshold, 5 min easy",
                "10 min easy",
            ]
            purpose = "Raises the power you can hold for hours."
        elif fam == "swim":
            title, kind, intensity = "Threshold set", "intervals", "threshold"
            structure = ["400 easy + drills", "10 × 100 at threshold pace, 15 s rest", "200 easy"]
            purpose = "Sustainable speed for the race distance."
        else:
            title, kind, intensity = "Tempo intervals", "intervals", "threshold"
            structure = [
                "15 min easy + 4 strides",
                "3 × 10 min at threshold (comfortably hard), 3 min jog",
                "10 min easy",
            ]
            purpose = "Raises the pace you can sustain without blowing up."
    elif phase == "specific":
        if fam in ("trail", "hike", "ski"):
            title, kind, intensity = "Race-specific climbing", "hills", "steady"
            structure = [
                "15 min easy",
                "3-5 × 10 min climbing at race effort (power-hike where you will in the race)",
                "Controlled technical descents between reps",
                "10 min easy",
            ]
            purpose = "Rehearses exactly how you will climb and descend on race day."
        else:
            title, kind, intensity = "Race-pace blocks", "tempo", "steady"
            structure = ["15 min easy", "3 × 15 min at goal race effort, 4 min easy", "10 min easy"]
            purpose = "Locks in goal effort so race day feels familiar."
    else:  # taper
        title, kind, intensity = "Sharpener", "intervals", "moderate"
        structure = ["15 min easy", "5 × 2 min at race effort, 2 min easy", "10 min easy"]
        purpose = "Keeps the legs sharp while fatigue drains away."
    km = _distance(fam, lvl, minutes)
    wk.add(
        slot,
        sport,
        kind,
        title,
        purpose=purpose,
        duration_minutes=minutes,
        distance_km=km,
        elevation_m=_elevation(fam, km, density, phase),
        intensity=intensity,
        structure=structure,
        key=phase != "taper",
    )


def _endurance(
    wk: _Week,
    fam: Family,
    lvl: Level,
    slot: int,
    minutes: int,
    density: float,
    kind: str,
    phase: str,
) -> None:
    km = _distance(fam, lvl, minutes)
    if kind == "back_to_back":
        title = "Back-to-back long (tired legs)"
        purpose = "Second long day: teaches you to move well on tired legs, like the late race."
        intensity = "easy"
    else:
        title = {
            "bike": "Endurance ride",
            "swim": "Endurance swim",
            "hike": "Easy hike or run",
        }.get(fam, "Easy run")
        purpose = "Easy aerobic time. Keep it truly easy so the key sessions stay high quality."
        intensity = "easy"
    wk.add(
        slot,
        _sport(fam),
        kind,
        title,
        purpose=purpose,
        duration_minutes=minutes,
        distance_km=km,
        elevation_m=_elevation(fam, km, density, phase) if kind == "back_to_back" else None,
        intensity=intensity,
        key=kind == "back_to_back",
    )


def _tri_week(
    wk: _Week,
    lvl: Level,
    phase: str,
    minutes: int,
    long_min: int,
    days: int,
    L: int,
    race_sim: bool,
) -> None:
    long_ride = long_min
    long_run = int(min(150, max(45, long_min * 0.45)))
    remaining = max(minutes - long_ride - long_run, 90)
    swim_each = int(max(30, min(75, remaining * 0.35 / 2)))
    bike_q = int(max(45, min(90, remaining * 0.3)))
    run_q = int(max(35, min(75, remaining * 0.25)))
    brick = phase in ("build", "specific")
    wk.add(
        L,
        "cycling",
        "race_sim" if race_sim else "long",
        "Long ride" + (" + brick run" if brick else ""),
        purpose="Bike endurance at controlled effort; fuel 60-80 g/h. Brick: run 15-20 min straight off the bike.",
        duration_minutes=long_ride,
        distance_km=_distance("bike", lvl, long_ride),
        intensity="steady" if race_sim else "easy",
        fueling="Rehearse race-day bottles and gels: 60-80 g carbs per hour.",
        key=True,
    )
    if brick:
        wk.add(
            L,
            "running",
            "brick",
            "Brick run off the bike",
            purpose="Teaches the legs to run immediately after riding.",
            duration_minutes=20,
            distance_km=_distance("run", lvl, 20),
            intensity="steady",
        )
    wk.add(
        L + 1,
        "running",
        "long",
        "Long run",
        purpose="Run endurance at easy effort.",
        duration_minutes=long_run,
        distance_km=_distance("run", lvl, long_run),
        intensity="easy",
        key=True,
    )
    wk.add(
        L - 4,
        "cycling",
        "intervals",
        "Bike intervals",
        purpose="Sustainable power for the bike leg.",
        duration_minutes=bike_q,
        distance_km=_distance("bike", lvl, bike_q),
        intensity="threshold",
        structure=["15 min warm-up", "4 × 8 min at threshold, 4 min easy", "10 min easy"],
        key=True,
    )
    wk.add(
        L - 2,
        "running",
        "tempo",
        "Run tempo",
        purpose="Run strength at goal effort.",
        duration_minutes=run_q,
        distance_km=_distance("run", lvl, run_q),
        intensity="threshold",
        structure=["15 min easy", "3 × 8 min at threshold, 2 min jog", "10 min easy"],
    )
    swims = [L - 5, L - 3] + ([L - 1] if days >= 6 else [])
    for n, slot in enumerate(swims):
        wk.add(
            slot,
            "swimming",
            "technique" if n == 0 else "intervals",
            "Swim technique" if n == 0 else "Swim endurance set",
            purpose="Efficient technique saves energy for the bike and run.",
            duration_minutes=swim_each,
            distance_km=_distance("swim", lvl, swim_each),
            intensity="easy" if n == 0 else "moderate",
            structure=[
                "300 easy",
                "Drills: catch-up, fingertip drag, 6 × 50",
                "Main set: 8 × 100 steady",
                "200 easy",
            ]
            if n
            else ["400 easy", "8 × 50 drills", "4 × 100 smooth", "200 easy"],
        )


def _race_week(wk: _Week, fam: Family, lvl: Level, long_day: int, minutes: int) -> None:
    """Race week: short, sharp and rested. The race itself is added separately."""
    race_wd = wk.race.weekday()
    for offset, title, mins, intensity, structure in (
        (-6, "Easy session", 40, "easy", None),
        (
            -4,
            "Race-week openers",
            35,
            "moderate",
            ["15 min easy", "4 × 1 min at race effort, 2 min easy", "10 min easy"],
        ),
        (-2, "Shakeout", 20, "very_easy", ["15-20 min very easy", "3 × 20 s relaxed strides"]),
    ):
        weekday = race_wd + offset
        if weekday < 0:
            continue
        km = _distance(fam if fam != "tri" else "run", lvl, mins)
        wk.add(
            weekday,
            _sport(fam),
            "easy" if intensity != "moderate" else "intervals",
            title,
            purpose="Keep the legs awake without adding fatigue.",
            duration_minutes=mins,
            distance_km=km,
            intensity=intensity,
            structure=structure or [],
        )
    used = {date.fromisoformat(s["date"]) for s in wk.sessions}
    day = wk.start
    while day < wk.race:
        if day not in used and day >= wk.plan_start:
            wk.add(
                (day - wk.start).days,
                "rest",
                "rest",
                "Rest",
                purpose="Rest, hydrate and sleep. Check your Race Lab logistics.",
                duration_minutes=0,
                intensity="rest",
            )
        day += timedelta(days=1)


def _race_days(wk: _Week, ctx: RaceContext, finish_min: int) -> None:
    race = ctx.race_date
    end = date.fromisoformat(ctx.event["end_date"]) if ctx.event.get("end_date") else race
    stages = int(ctx.event.get("stages") or 1)
    total_days = (end - race).days + 1
    name = str(ctx.event.get("name") or "Race day")
    sid_base = f"w{wk.index}-race"
    day = race
    n = 1
    while day <= end:
        multi = total_days > 1 or stages > 1
        wk.sessions.append(
            {
                "id": sid_base if n == 1 else f"{sid_base}-{n}",
                "date": day.isoformat(),
                "sport": _race_sport(ctx),
                "kind": "race",
                "title": f"{name}" + (f" — stage {n}" if multi else ""),
                "purpose": "Race day. Execute the strategy and fuel plan in Race Lab.",
                "duration_minutes": int(finish_min / max(total_days, 1)) if multi else finish_min,
                "distance_km": round(ctx.distance_km / max(total_days, 1), 1)
                if multi
                else ctx.distance_km,
                "elevation_m": (ctx.elevation_m or 0) // max(total_days, 1) or None,
                "intensity": "race",
                "key": True,
            }
        )
        day += timedelta(days=1)
        n += 1


def _race_sport(ctx: RaceContext) -> str:
    return {
        "trail_running": "trail_running",
        "road_running": "running",
        "cycling": "cycling",
        "gravel": "cycling",
        "mountain_biking": "cycling",
        "swimming": "swimming",
        "hiking": "hiking",
        "skimo": "skiing",
        "nordic_skiing": "skiing",
        "rowing": "rowing",
        "hybrid": "hybrid",
    }.get(ctx.sport, "other")


def _focus(fam: Family, phase: str, lighter: bool, long_min: int) -> str:
    if lighter:
        return "Lighter week: absorb the training, sleep more, stay easy."
    return {
        "base": "Base: build the aerobic engine and the habit — easy time and a growing long session.",
        "build": "Build: add quality — climbing strength, threshold work — while the long session grows.",
        "specific": f"Race-specific: rehearse race day. Long session up to {hm(long_min)} on race-like terrain.",
        "taper": "Taper: volume drops, intensity stays. Trust the work.",
        "race": "Race week: rest, rehearse logistics, arrive fresh.",
    }.get(phase, "Train consistently.")


def _long_label(sessions: list[dict[str, Any]]) -> str | None:
    longs = [s for s in sessions if s["kind"] in ("long", "race_sim")]
    if not longs:
        return None
    s = max(longs, key=lambda x: x.get("duration_minutes") or 0)
    parts = [hm(s.get("duration_minutes"))]
    if s.get("distance_km"):
        parts.append(f"{s['distance_km']:g} km")
    if s.get("elevation_m"):
        parts.append(f"+{s['elevation_m']} m")
    return " · ".join(parts)


def _phase_ranges(weeks: list[dict[str, Any]], race: date) -> list[dict[str, Any]]:
    goals = {
        "base": "Aerobic engine and consistency",
        "build": "Strength and sustainable speed",
        "specific": "Rehearse the race: terrain, fuel, gear, pacing",
        "taper": "Shed fatigue, stay sharp",
        "race": "Arrive fresh and execute",
    }
    ranges: list[dict[str, Any]] = []
    for week in weeks:
        start = date.fromisoformat(week["start_date"])
        end = min(start + timedelta(days=6), race)
        if ranges and ranges[-1]["phase"] == week["phase"]:
            ranges[-1]["end_date"] = end.isoformat()
        else:
            ranges.append(
                {
                    "phase": week["phase"],
                    "start_date": start.isoformat(),
                    "end_date": end.isoformat(),
                    "goal": goals.get(week["phase"], "Train"),
                }
            )
    return ranges[:8]
