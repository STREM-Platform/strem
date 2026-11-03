"""Race memory: what the athlete's own past races say about this one (ai#45).

Built from the race history (debriefs, imported races, races added by hand).
Only what was recorded is used, always with the race it came from, so fuel and
strategy can cite it ("at Vitosha 50K, 85 g/h upset your stomach"). Engine
guardrails still bound every number.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class RaceMemory:
    gi_limit: tuple[int, str] | None = None  # lowest g/h that caused severe GI issues
    tolerated: tuple[int, str] | None = None  # highest g/h handled without trouble
    faded: list[tuple[str, float | None]] = field(default_factory=list)  # (race, low-point km)
    cramps: list[str] = field(default_factory=list)
    hot: list[str] = field(default_factory=list)
    lessons: list[tuple[str, str]] = field(default_factory=list)  # (race, lesson)

    def empty(self) -> bool:
        return not (self.gi_limit or self.tolerated or self.faded or self.cramps or self.lessons)


def race_memory(races: list[dict[str, Any]]) -> RaceMemory:
    memory = RaceMemory()
    for race in sorted(races, key=lambda r: str(r.get("race_date") or ""), reverse=True)[:12]:
        name = str(race.get("name") or "a past race")
        day = race.get("race_day") or {}
        carbs = day.get("carbs_g_per_hour")
        gi = day.get("gi_issues")
        if isinstance(carbs, int) and carbs > 0:
            if gi == "severe":
                if memory.gi_limit is None or carbs < memory.gi_limit[0]:
                    memory.gi_limit = (carbs, name)
            elif gi in ("none", "mild") and race.get("status", "finished") == "finished":
                if memory.tolerated is None or carbs > memory.tolerated[0]:
                    memory.tolerated = (carbs, name)
        if day.get("pacing") in ("faded", "blew_up"):
            low = day.get("low_point_km")
            memory.faded.append((name, float(low) if isinstance(low, (int, float)) else None))
        if day.get("cramps"):
            memory.cramps.append(name)
        if day.get("heat") == "hot":
            memory.hot.append(name)
        for lesson in race.get("lessons") or []:
            if len(memory.lessons) < 8:
                memory.lessons.append((name, str(lesson)))
    return memory


def memory_lines(memory: RaceMemory) -> list[str]:
    """Plain lines for the AI context and for 'From your races' checklists."""
    out: list[str] = []
    if memory.gi_limit:
        out.append(
            f"{memory.gi_limit[0]} g carbs/h caused severe stomach trouble at {memory.gi_limit[1]}"
        )
    if memory.tolerated:
        out.append(
            f"{memory.tolerated[0]} g carbs/h worked without trouble at {memory.tolerated[1]}"
        )
    for name, low in memory.faded[:3]:
        out.append(f"Faded at {name}" + (f" (low point around km {low:g})" if low else ""))
    if memory.cramps:
        out.append("Cramped at " + ", ".join(memory.cramps[:3]))
    if memory.hot:
        out.append("Raced in heat at " + ", ".join(memory.hot[:3]))
    out += [f"Lesson from {name}: {lesson}" for name, lesson in memory.lessons]
    return out


def memory_section(memory: RaceMemory, layer: str) -> dict[str, Any] | None:
    """A checklist of what the athlete's own races say, relevant to this layer."""
    items: list[dict[str, Any]] = []
    if layer == "fuel":
        if memory.gi_limit:
            g, name = memory.gi_limit
            items.append(
                {
                    "id": "memory-gi",
                    "title": f"{g} g/h was too much at {name}",
                    "detail": "Stay below it on race day; raise it only after it works in long sessions.",
                    "priority": "high",
                }
            )
        if memory.tolerated:
            g, name = memory.tolerated
            items.append(
                {
                    "id": "memory-tolerated",
                    "title": f"{g} g/h worked at {name}",
                    "detail": "Start from what you know works.",
                }
            )
        if memory.cramps:
            items.append(
                {
                    "id": "memory-cramps",
                    "title": f"You cramped at {memory.cramps[0]}",
                    "detail": "A little more sodium helps, but pacing matters more — cramps are mostly fatigue.",
                }
            )
        keywords = (
            "fuel",
            "eat",
            "gel",
            "drink",
            "salt",
            "sodium",
            "stomach",
            "carb",
            "water",
            "bottle",
        )
    else:
        for name, low in memory.faded[:2]:
            items.append(
                {
                    "id": f"memory-faded-{len(items)}",
                    "title": f"You faded at {name}" + (f" around km {low:g}" if low else ""),
                    "detail": "Hold back more in the first third than feels right.",
                    "priority": "high",
                }
            )
        keywords = (
            "pace",
            "start",
            "climb",
            "descent",
            "slow",
            "fast",
            "walk",
            "cutoff",
            "split",
            "effort",
        )
    for name, lesson in memory.lessons:
        if any(k in lesson.lower() for k in keywords):
            items.append(
                {
                    "id": f"memory-lesson-{len(items)}",
                    "title": lesson[:120],
                    "detail": f"Your lesson from {name}.",
                }
            )
    if not items:
        return None
    return {
        "id": "race-memory",
        "title": "From your races",
        "kind": "checklist",
        "description": "What your own past races say about this one.",
        "items": items[:8],
    }
