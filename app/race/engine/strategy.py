"""Race strategy: even-effort pacing by segment, cutoffs and contingencies.

With a course (athlete GPX) segments follow the terrain; time is allocated by
effort-distance (climbing costs time, descending saves a little). Without one,
the race is split by distance with a conservative first fifth.
"""

from __future__ import annotations

from typing import Any

from app.race.context import CourseSummary, RaceContext
from app.race.engine.common import effort_km, estimate_finish, family, hm


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
    warnings: list[str] = []
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
        "sources": [f"STREM race engine: {basis}"],
    }
