"""Race strategy: even-effort pacing by segment, cutoffs and contingencies.

With a course (athlete GPX) segments follow the terrain; time is allocated by
effort-distance (climbing costs time, descending saves a little). Without one,
the race is split by distance with a conservative first fifth.
"""

from __future__ import annotations

from typing import Any

from app.race.context import CourseSummary, RaceContext
from app.race.engine.common import (
    effort_km,
    estimate_finish,
    expected_temperature,
    family,
    hm,
    level,
)
from app.race.engine.fuel import carb_target, fluid_target, sodium_target

# Minutes stopped at a station, by what it offers (crew/drop bag dominate).
STOP_MINUTES = {"drop_bag": 6, "crew": 5, "food": 3, "medical": 1, "water": 1, "toilet": 1}
SOFT_BOTTLE_ML = 500


def _segments_from_course(course: CourseSummary) -> list[dict[str, Any]]:
    """Merge 1 km chunks into terrain segments: climb / descent / rolling."""
    segments: list[dict[str, Any]] = []
    for start, end, change, grade in course.profile:
        if grade is None:
            terrain = "unknown"
        elif grade >= 4:
            terrain = "climb"
        elif grade <= -4:
            terrain = "descent"
        else:
            terrain = "rolling"
        if segments and segments[-1]["terrain"] == terrain:
            seg = segments[-1]
            seg["end_km"] = end
            seg["gain_m"] += max(change or 0, 0)
            seg["loss_m"] += max(-(change or 0), 0)
        else:
            segments.append(
                {
                    "start_km": start,
                    "end_km": end,
                    "terrain": terrain,
                    "gain_m": max(change or 0, 0),
                    "loss_m": max(-(change or 0), 0),
                }
            )
    # Fold tiny segments (<1.5 km) into their neighbour so the table stays readable.
    merged: list[dict[str, Any]] = []
    for seg in segments:
        if merged and (seg["end_km"] - seg["start_km"] < 1.5 or len(merged) >= 14):
            prev = merged[-1]
            prev["end_km"] = seg["end_km"]
            prev["gain_m"] += seg["gain_m"]
            prev["loss_m"] += seg["loss_m"]
            if prev["terrain"] != seg["terrain"]:
                prev["terrain"] = "mixed" if prev["terrain"] != "rolling" else seg["terrain"]
        else:
            merged.append(dict(seg))
    return merged


def _segments_by_distance(km: float) -> list[dict[str, Any]]:
    cuts = [0.0, 0.2, 0.5, 0.8, 1.0]
    return [
        {
            "start_km": round(km * a, 1),
            "end_km": round(km * b, 1),
            "terrain": "rolling",
            "gain_m": 0.0,
            "loss_m": 0.0,
        }
        for a, b in zip(cuts, cuts[1:], strict=False)
    ]


EFFORT = {
    "climb": "Power-hike the steep parts, short steps, breathe — save matches",
    "descent": "Relaxed and quick; protect the quads, don't sprint",
    "rolling": "Settle into conversational race effort",
    "mixed": "Effort steady; walk steep pitches, run the rest",
    "unknown": "Even effort",
}


def build_strategy(ctx: RaceContext) -> dict[str, Any]:
    fam = family(ctx)
    finish = estimate_finish(ctx)
    total = finish.minutes
    km = ctx.distance_km
    course = ctx.course
    if course and course.profile:
        segments = _segments_from_course(course)
        basis = "your GPX course"
    else:
        segments = _segments_by_distance(km)
        basis = "distance only (upload the GPX for terrain-based pacing)"
    weights = []
    for seg in segments:
        dist = max(seg["end_km"] - seg["start_km"], 0.1)
        weight = effort_km(dist, seg["gain_m"]) - 0.02 * seg["loss_m"] / 10
        weights.append(max(weight, dist * 0.6))
    scale = total / sum(weights) if sum(weights) else 0
    rows = []
    elapsed = 0.0
    for index, (seg, weight) in enumerate(zip(segments, weights, strict=False), start=1):
        seg_min = weight * scale
        if index == 1 and len(segments) > 2:
            effort = "Start deliberately easy — the first 20% should feel too slow"
        elif index == len(segments):
            effort = "Whatever is left: hold form, then empty the tank in the final km"
        else:
            effort = EFFORT[seg["terrain"]]
        elapsed += seg_min
        rows.append(
            {
                "id": f"seg-{index}",
                "title": f"Km {seg['start_km']:g}–{seg['end_km']:g} · {seg['terrain']}",
                "detail": effort,
                "values": {
                    "distance_km": round(seg["end_km"] - seg["start_km"], 1),
                    "gain_m": round(seg["gain_m"]),
                    "loss_m": round(seg["loss_m"]),
                    "split": hm(seg_min),
                    "arrive": hm(elapsed),
                },
            }
        )
    checkpoint_section, checkpoint_warnings, stops = _checkpoint_plan(ctx, total, fam)
    cutoff = ctx.event.get("cutoff_minutes")
    metrics = [
        {
            "label": "Target finish",
            "value": hm(total),
            "note": "Your goal" if finish.basis == "goal" else "Calculated estimate",
        },
    ]
    if km and fam in ("run", "trail", "hike"):
        metrics.append(
            {
                "label": "Average pace",
                "value": f"{total / km:.1f}",
                "unit": "min/km",
                "note": "Expect it to vary with terrain",
            }
        )
    elif km and fam == "bike":
        metrics.append(
            {"label": "Average speed", "value": f"{km / (total / 60):.1f}", "unit": "km/h"}
        )
    warnings: list[str] = list(checkpoint_warnings)
    if stops:
        metrics.append(
            {
                "label": "Time at aid stations",
                "value": hm(stops),
                "note": "Planned stops, included in the finish",
            }
        )
    if cutoff:
        buffer = cutoff - total
        metrics.append(
            {"label": "Cutoff buffer", "value": hm(max(buffer, 0)), "note": f"Cutoff {hm(cutoff)}"}
        )
        if buffer < cutoff * 0.1:
            warnings.append(
                "Your estimate leaves less than 10% margin to the cutoff. Know the intermediate "
                "cutoffs and keep moving through aid stations."
            )
    motivation = ctx.goal.get("motivation")
    mental = [
        {
            "id": "chunking",
            "title": "Race segment to segment, never the whole distance",
            "detail": "Only the next segment exists.",
        },
        {
            "id": "low-points",
            "title": "Expect a low point — it passes",
            "detail": "Eat, drink, slow for 10 minutes. Most lows are fuel or fatigue, not the end.",
        },
    ]
    if motivation:
        mental.insert(
            0,
            {
                "id": "your-why",
                "title": "Your why",
                "detail": f"“{motivation}”",
                "priority": "high",
            },
        )
    sections = [
        {
            "id": "pacing",
            "title": "Segment plan",
            "kind": "table",
            "description": f"Even effort, not even pace. Based on {basis}.",
            "columns": ["distance_km", "gain_m", "loss_m", "split", "arrive"],
            "items": rows,
        },
        {
            "id": "contingencies",
            "title": "If this happens, do this",
            "kind": "checklist",
            "items": [
                {
                    "id": "gi",
                    "title": "Stomach issues",
                    "detail": "Slow down, sip water, switch to plain carbs/drink, resume small amounts after 15 min.",
                },
                {
                    "id": "cramp",
                    "title": "Cramps",
                    "detail": "Ease pace, take sodium and fluid, stretch gently; usually fatigue, not only salt.",
                },
                {
                    "id": "bonk",
                    "title": "Energy crash",
                    "detail": "Eat 30-50 g carbs immediately, walk 5-10 min, then return to your hourly rhythm.",
                },
                {
                    "id": "blister",
                    "title": "Hot spot or blister",
                    "detail": "Stop early and tape it — 2 minutes now saves an hour later.",
                },
                {
                    "id": "behind",
                    "title": "Falling behind plan",
                    "detail": "Don't chase splits; cut aid-station time and protect the cutoff margin.",
                },
                {
                    "id": "weather",
                    "title": "Weather turns",
                    "detail": "Layer up before you are cold; in heat, slow down early and cool at every aid station.",
                },
                {
                    "id": "stop-rule",
                    "title": "When to stop",
                    "detail": "Sharp or worsening pain, altered gait, confusion, chest pain or fainting: stop and get help.",
                    "priority": "critical",
                },
            ],
        },
        {"id": "mental", "title": "Mental plan", "kind": "checklist", "items": mental},
    ]
    if checkpoint_section is not None:
        sections.insert(0, checkpoint_section)
    if fam == "tri":
        sections.insert(
            1,
            {
                "id": "legs",
                "title": "Discipline by discipline",
                "kind": "checklist",
                "items": [
                    {
                        "id": "swim-plan",
                        "title": "Swim",
                        "detail": "Start wide if nervous; sight every 6-8 strokes; settle breathing in the first 200 m.",
                    },
                    {
                        "id": "bike-plan",
                        "title": "Bike",
                        "detail": "Ride well within yourself (conversational for long distances); fuel from 15 min in.",
                    },
                    {
                        "id": "run-plan",
                        "title": "Run",
                        "detail": "First 2-3 km slower than goal pace; then settle. Walk aid stations to drink.",
                    },
                ],
            },
        )
    return {
        "headline": f"Even effort to a {hm(total)} finish",
        "summary": (
            f"The plan splits the race into {len(rows)} segments from {basis}. Climbs get more "
            "time, descents a little less, and the first fifth is deliberately conservative. "
            "Arrival times are guides, not orders — adjust to conditions and your body on the day."
        ),
        "metrics": metrics,
        "sections": sections,
        "warnings": warnings,
        "assumptions": [finish.note + f": {hm(total)}"],
        "sources": [f"STREM race engine: {basis}"]
        + (["Checkpoints and aid stations you entered"] if checkpoint_section else []),
    }


def _profile_between(course: CourseSummary | None, a: float, b: float) -> tuple[float, float]:
    """Climb and descent between two course distances, from the km profile."""
    gain = loss = 0.0
    for start, end, change, _grade in course.profile if course else []:
        overlap = max(0.0, min(b, end) - max(a, start))
        if overlap <= 0 or end <= start or change is None:
            continue
        share = change * overlap / (end - start)
        gain += max(share, 0)
        loss += max(-share, 0)
    return gain, loss


def _clock(start: str | None, minutes: float) -> str | None:
    if not start:
        return None
    hours, mins = (int(x) for x in start.split(":"))
    total = hours * 60 + mins + int(round(minutes))
    day, rest = divmod(total, 24 * 60)
    text = f"{rest // 60:02d}:{rest % 60:02d}"
    return text + (f" (+{day}d)" if day else "")


def _checkpoint_plan(
    ctx: RaceContext, total: int, fam: str
) -> tuple[dict[str, Any] | None, list[str], int]:
    """Leg-by-leg plan between checkpoints: arrival, cutoff margin, what to carry
    and what to do at each station (ai#46). None when no checkpoints are known."""
    checkpoints = [c for c in ctx.event.get("checkpoints") or [] if c.get("km") is not None]
    km = ctx.distance_km
    if not checkpoints or not km:
        return None, [], 0
    stations = [c for c in checkpoints if 0 < float(c["km"]) < km]
    stops = [
        max((STOP_MINUTES.get(s, 0) for s in c.get("services") or []), default=1)
        + (2 if "food" in (c.get("services") or []) and "crew" in (c.get("services") or []) else 0)
        for c in stations
    ]
    moving_total = max(total - sum(stops), total * 0.8)
    points = [{"name": "Start", "km": 0.0}, *stations, {"name": "Finish", "km": km}]
    legs = []
    for a, b in zip(points, points[1:], strict=False):
        dist = max(float(b["km"]) - float(a["km"]), 0.1)
        gain, loss = _profile_between(ctx.course, float(a["km"]), float(b["km"]))
        legs.append(
            (a, b, dist, gain, loss, max(effort_km(dist, gain) - 0.02 * loss / 10, dist * 0.6))
        )
    scale = moving_total / sum(leg[5] for leg in legs)
    lvl = level(ctx)
    carbs, _ = carb_target(total, lvl, fam)
    fluid, _ = fluid_target(expected_temperature(ctx), ctx.weight_kg)
    sodium = sodium_target(expected_temperature(ctx), total)
    start_time = ctx.event.get("start_time")
    rows: list[dict[str, Any]] = []
    warnings: list[str] = []
    elapsed = 0.0
    for i, (a, b, dist, gain, _loss, weight) in enumerate(legs):
        minutes = weight * scale
        elapsed += minutes
        hours = minutes / 60
        refill = "water" in (b.get("services") or []) or b["name"] == "Finish"
        carry_ml = int(round(fluid * hours / 50) * 50)
        carry = f"{int(carbs * hours)} g carbs · {carry_ml} ml"
        values: dict[str, Any] = {
            "distance_km": round(dist, 1),
            "gain_m": round(gain),
            "split": hm(minutes),
            "arrive": hm(elapsed),
            "clock": _clock(start_time, elapsed) or "–",
            "carry": carry,
        }
        todo: list[str] = []
        cutoff = b.get("cutoff_minutes")
        if cutoff:
            margin = cutoff - elapsed
            values["cutoff_margin"] = hm(margin) if margin >= 0 else f"−{hm(-margin)}"
            if margin < 0:
                warnings.append(
                    f"At your target pace you reach {b['name']} {hm(-margin)} after its cutoff — the target finish is not realistic for this race."
                )
            elif margin < max(30, elapsed * 0.1):
                warnings.append(
                    f"Only {hm(margin)} margin to the {b['name']} cutoff: keep stops short and don't bank on the second half."
                )
                todo.append("Tight cutoff — in and out")
        if b["name"] != "Finish":
            services = b.get("services") or []
            if refill:
                todo.append(f"Refill ~{min(carry_ml, SOFT_BOTTLE_ML * 3)} ml")
            if "food" in services:
                todo.append("Eat something real (salty + carbs)")
            if "crew" in services:
                todo.append("Crew: swap bottles and restock gels")
            if "drop_bag" in services:
                todo.append("Drop bag: restock, dry socks, layers for what's next")
            if sodium and hours >= 1:
                todo.append(f"~{int(sodium * hours)} mg sodium until the next station")
            if not refill and i + 1 < len(legs):
                nxt = legs[i + 1]
                todo.append(f"No water here — carry for {hm(nxt[5] * scale)} more")
            stop = stops[i] if i < len(stops) else 0
            if stop:
                elapsed += stop
                todo.append(f"Plan {stop} min here")
        rows.append(
            {
                "id": f"leg-{i + 1}",
                "title": f"{a['name']} → {b['name']} (km {float(b['km']):g})",
                "detail": " · ".join(todo) or "Hold even effort; eat and drink on schedule.",
                "values": values,
                "priority": "high"
                if cutoff and "cutoff_margin" in values and values["cutoff_margin"].startswith("−")
                else "normal",
            }
        )
    columns = ["distance_km", "gain_m", "split", "arrive", "clock", "carry"]
    if any("cutoff_margin" in r["values"] for r in rows):
        columns.insert(5, "cutoff_margin")
    section = {
        "id": "checkpoints",
        "title": "Checkpoint plan",
        "kind": "table",
        "description": (
            "Leg by leg between your checkpoints: arrival, margin to each cutoff, what to carry and "
            "what to do at each station. Stops are included in the finish time."
        ),
        "columns": columns,
        "items": rows,
    }
    return section, warnings, sum(stops)
