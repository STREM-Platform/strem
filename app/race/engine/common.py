"""Shared engine helpers: sport families, athlete level and finish estimates."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Literal, cast

from app.race.context import RaceContext

Family = Literal["run", "trail", "bike", "swim", "tri", "hike", "ski", "row", "hybrid"]
Level = Literal["new", "some", "experienced", "elite"]

FAMILY: dict[str, Family] = {
    "trail_running": "trail",
    "road_running": "run",
    "triathlon": "tri",
    "duathlon": "tri",
    "cycling": "bike",
    "gravel": "bike",
    "mountain_biking": "bike",
    "swimming": "swim",
    "hiking": "hike",
    "skimo": "ski",
    "nordic_skiing": "ski",
    "rowing": "row",
    "hybrid": "hybrid",
    "multisport": "tri",
    "custom": "run",
}

WEEKDAYS = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")


def family(ctx: RaceContext) -> Family:
    fam = FAMILY.get(ctx.sport, "run")
    if ctx.sport == "custom":
        legs = {leg.get("discipline") for leg in ctx.event.get("legs") or []}
        if legs == {"bike"}:
            return "bike"
        if legs == {"swim"}:
            return "swim"
        if legs == {"hike"}:
            return "hike"
        if len(legs) > 1:
            return "tri"
    if fam == "run" and (ctx.elevation_m or 0) / max(ctx.distance_km, 1) > 20:
        return "trail"
    return fam


def level(ctx: RaceContext) -> Level:
    stated = ctx.prep.get("experience")
    if stated in ("new", "some", "experienced", "elite"):
        return cast(Level, stated)
    finished = [r for r in ctx.races if r.get("status") == "finished"]
    years = (ctx.profile or {}).get("years_training") or 0
    if len(finished) >= 8 or years >= 8:
        return "experienced"
    if finished or years >= 2:
        return "some"
    return "new"


def monday(day: date) -> date:
    return day - timedelta(days=day.weekday())


def hm(minutes: float | int | None) -> str:
    if minutes is None:
        return "unknown"
    total = int(round(minutes))
    hours, mins = divmod(total, 60)
    if not hours:
        return f"{mins} min"
    return f"{hours} h {mins:02d}" if mins else f"{hours} h"


def day_text(day: date) -> str:
    """'Sat 24 Oct': how dates read in athlete-facing prose."""
    return f"{day.strftime('%a')} {day.day} {day.strftime('%b')}"


def when(day: date, today: date) -> str:
    """'today', 'tomorrow' or 'on Sat 24 Oct' — never a raw ISO date in prose."""
    delta = (day - today).days
    if delta == 0:
        return "today"
    if delta == 1:
        return "tomorrow"
    return f"on {day_text(day)}"


def slug(text: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return (value or "item")[:60]


# ── Finish estimate ──────────────────────────────────────────────────────────

# Easy/race paces per level. Running: min/km on flat; trail: min per "effort km"
# (1 km + 100 m climbing ≈ 1 effort km); bike: km/h; swim: min/100 m.
RUN_RACE_PACE = {"new": 7.0, "some": 6.0, "experienced": 5.2, "elite": 4.0}
RUN_EASY_PACE = {"new": 7.6, "some": 6.7, "experienced": 5.9, "elite": 4.8}
TRAIL_RACE_PACE = {"new": 7.2, "some": 6.0, "experienced": 5.0, "elite": 3.6}
BIKE_SPEED = {"new": 22.0, "some": 26.0, "experienced": 30.0, "elite": 36.0}
BIKE_VAM = {"new": 500.0, "some": 700.0, "experienced": 900.0, "elite": 1200.0}
SWIM_PACE = {"new": 2.9, "some": 2.3, "experienced": 1.9, "elite": 1.4}
HIKE_SPEED = {"new": 3.8, "some": 4.3, "experienced": 4.8, "elite": 5.5}
HIKE_VERT = {"new": 350.0, "some": 450.0, "experienced": 550.0, "elite": 700.0}


def effort_km(distance_km: float, elevation_m: float | None) -> float:
    return distance_km + (elevation_m or 0) / 100.0


def _riegel(base_minutes: float, distance_km: float, reference_km: float) -> float:
    """Fatigue: pace slows as distance grows (Riegel exponent 1.06)."""
    if distance_km <= reference_km:
        return base_minutes
    return float(base_minutes * (distance_km / reference_km) ** 0.06)


@dataclass(frozen=True)
class FinishEstimate:
    minutes: int
    basis: Literal["goal", "calculated"]
    note: str


def estimate_finish(ctx: RaceContext) -> FinishEstimate:
    target = ctx.goal.get("target_finish_minutes")
    if target:
        return FinishEstimate(int(target), "goal", f"Your target finish time ({hm(target)})")
    lvl = level(ctx)
    fam = family(ctx)
    km = ctx.distance_km
    elev = float(ctx.elevation_m or 0)
    minutes: float
    if fam == "trail":
        ekm = effort_km(km, elev)
        minutes = _riegel(ekm * TRAIL_RACE_PACE[lvl], ekm, 20)
    elif fam == "run":
        minutes = _riegel(km * RUN_RACE_PACE[lvl], km, 21.1)
    elif fam == "bike":
        minutes = (km / BIKE_SPEED[lvl] + 0.6 * elev / BIKE_VAM[lvl]) * 60
    elif fam == "swim":
        minutes = km * 10 * SWIM_PACE[lvl] * 1.05
    elif fam == "hike":
        minutes = (km / HIKE_SPEED[lvl] + elev / HIKE_VERT[lvl]) * 60
    elif fam == "tri":
        legs = ctx.event.get("legs") or []
        if not legs:
            legs = _default_tri_legs(km)
        minutes = 0.0
        for leg in legs:
            d = float(leg.get("distance_km") or 0)
            disc = leg.get("discipline")
            if disc == "swim":
                minutes += d * 10 * SWIM_PACE[lvl] * 1.05
            elif disc == "bike":
                minutes += (d / BIKE_SPEED[lvl]) * 60
            elif disc in ("run", "hike"):
                minutes += _riegel(d * RUN_RACE_PACE[lvl] * 1.1, d, 21.1)
            else:
                minutes += d * RUN_RACE_PACE[lvl] * 1.5
        minutes += 8 if km < 60 else 15  # transitions
        minutes += 0.4 * elev / BIKE_VAM[lvl] * 60
    elif fam == "ski":
        minutes = (
            km / {"new": 6, "some": 8, "experienced": 10, "elite": 13}[lvl] + elev / 600
        ) * 60
    elif fam == "row":
        minutes = km / {"new": 7.0, "some": 8.5, "experienced": 10.0, "elite": 12.0}[lvl] * 60
    else:  # hybrid
        minutes = max(60.0, km * RUN_RACE_PACE[lvl] * 1.6)
    stages = ctx.event.get("stages") or 1
    if ctx.event.get("format") == "multi_stage" and stages > 1:
        note = f"Calculated for {stages} stages from distance, climbing and your level"
    else:
        note = "Calculated from distance, climbing and your level — not a prediction"
    cutoff = ctx.event.get("cutoff_minutes")
    if cutoff and minutes > cutoff:
        note += f"; it exceeds the {hm(cutoff)} cutoff, so plans aim to finish inside the cutoff"
        minutes = cutoff * 0.92
    return FinishEstimate(int(round(minutes)), "calculated", note)


def _default_tri_legs(total_km: float) -> list[dict[str, Any]]:
    if total_km >= 200:
        return [
            {"discipline": "swim", "distance_km": 3.8},
            {"discipline": "bike", "distance_km": 180},
            {"discipline": "run", "distance_km": 42.2},
        ]
    if total_km >= 100:
        return [
            {"discipline": "swim", "distance_km": 1.9},
            {"discipline": "bike", "distance_km": 90},
            {"discipline": "run", "distance_km": 21.1},
        ]
    if total_km >= 45:
        return [
            {"discipline": "swim", "distance_km": 1.5},
            {"discipline": "bike", "distance_km": 40},
            {"discipline": "run", "distance_km": 10},
        ]
    return [
        {"discipline": "swim", "distance_km": 0.75},
        {"discipline": "bike", "distance_km": 20},
        {"discipline": "run", "distance_km": 5},
    ]


def race_start_hour(ctx: RaceContext) -> tuple[int, int] | None:
    start = ctx.event.get("start_time")
    if not start:
        return None
    hours, minutes = str(start).split(":")
    return int(hours), int(minutes)


def expected_temperature(ctx: RaceContext) -> float | None:
    """Expected race-day max temperature (°C) from conditions, if known."""
    cond = ctx.conditions or {}
    value = cond.get("temp_max_c")
    return float(value) if value is not None else None
