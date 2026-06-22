"""A full structured weekly training plan (B4+) the athlete can run and swap.

Unlike the 3 mission *suggestions* in ``adaptive_plan``, this builds a real week:
N days, each with a focus and a handful of exercises with targets. Deterministic
and grounded — shaped by the athlete's goal, weekly-target days and readiness —
so it's predictable, testable, and instantly swappable from a movement library
(an LLM-written variant can layer on later without changing the contract).
"""

from __future__ import annotations

import logging
from collections import Counter
from typing import Any

from langchain_core.language_models import BaseChatModel

from app.agent.llm import FallbackChatModel
from app.schemas import ContextSignals, MemoryItem, PlanDay, PlanExercise, TrainingPlan

logger = logging.getLogger("strem-ai-orchestrator")

# Alternatives per movement group — the first is the default, the rest are swaps.
LIBRARY: dict[str, list[tuple[str, str]]] = {
    "horizontal_press": [
        ("Barbell Bench Press", "4 × 6"),
        ("Incline DB Press", "4 × 8"),
        ("Weighted Dip", "3 × 8"),
        ("Floor Press", "4 × 6"),
    ],
    "vertical_press": [
        ("Overhead Press", "4 × 6"),
        ("Push Press", "4 × 5"),
        ("Seated DB Press", "3 × 10"),
        ("Landmine Press", "3 × 10"),
    ],
    "horizontal_pull": [
        ("Barbell Row", "4 × 8"),
        ("Chest-Supported Row", "3 × 10"),
        ("Seal Row", "3 × 10"),
        ("Cable Row", "3 × 12"),
    ],
    "vertical_pull": [
        ("Pull-up", "4 × 6"),
        ("Lat Pulldown", "3 × 10"),
        ("Chin-up", "3 × 8"),
        ("Neutral-Grip Pulldown", "3 × 12"),
    ],
    "squat": [
        ("Back Squat", "4 × 5"),
        ("Front Squat", "4 × 6"),
        ("Goblet Squat", "3 × 12"),
        ("Hack Squat", "3 × 10"),
    ],
    "hinge": [
        ("Deadlift", "3 × 5"),
        ("Romanian Deadlift", "4 × 8"),
        ("Hip Thrust", "3 × 10"),
        ("Trap-Bar Deadlift", "4 × 6"),
    ],
    "lunge": [
        ("Walking Lunge", "3 × 12"),
        ("Bulgarian Split Squat", "3 × 10"),
        ("Step-up", "3 × 12"),
        ("Reverse Lunge", "3 × 10"),
    ],
    "core": [
        ("Hanging Leg Raise", "3 × 12"),
        ("Plank", "3 × 45s"),
        ("Cable Crunch", "3 × 15"),
        ("Ab Wheel", "3 × 10"),
    ],
    "arms": [
        ("EZ-Bar Curl", "3 × 12"),
        ("Triceps Rope", "3 × 15"),
        ("Hammer Curl", "3 × 12"),
        ("Skull Crusher", "3 × 12"),
    ],
    "easy_run": [
        ("Easy Run", "40 min Zone 2"),
        ("Recovery Jog", "30 min Zone 1–2"),
        ("Easy Trail", "45 min Zone 2"),
    ],
    "quality_run": [
        ("Tempo Run", "20 min @ threshold"),
        ("5 × 1km Intervals", "@ 5k pace, 2 min jog"),
        ("Hill Repeats", "8 × 60s hard"),
    ],
    "long_run": [
        ("Long Run", "75–90 min Zone 2"),
        ("Progression Long Run", "75 min, last 15 faster"),
    ],
    "mobility": [
        ("Full-Body Mobility", "15 min flow"),
        ("Hip & T-Spine", "12 min"),
        ("Yoga Reset", "20 min"),
    ],
}

# Each focus → (icon, the movement groups that compose it).
FOCUS: dict[str, tuple[str, list[str]]] = {
    "Upper · Push": (
        "dumbbell",
        ["horizontal_press", "vertical_press", "horizontal_pull", "arms", "core"],
    ),
    "Upper · Pull": (
        "dumbbell",
        ["vertical_pull", "horizontal_pull", "horizontal_press", "arms", "core"],
    ),
    "Lower": ("dumbbell", ["squat", "hinge", "lunge", "core"]),
    "Full Body": ("dumbbell", ["squat", "horizontal_press", "vertical_pull", "hinge", "core"]),
    "Easy Run": ("route", ["easy_run"]),
    "Quality Run": ("bolt", ["quality_run"]),
    "Long Run": ("route", ["long_run"]),
    "Recovery / Mobility": ("refresh", ["mobility"]),
}

# Goal → weekly focus rotation (we take the first `weekly_target_days`).
_R = "Recovery / Mobility"
GOAL_WEEK: dict[str, list[str]] = {
    "build_strength": ["Lower", "Upper · Push", "Upper · Pull", "Lower", "Full Body", _R],
    "build_endurance": ["Easy Run", "Quality Run", "Easy Run", "Long Run", _R, "Easy Run"],
    "hybrid_athlete": ["Upper · Push", "Easy Run", "Lower", "Quality Run", "Full Body", "Long Run"],
    "lean_and_strong": ["Full Body", "Easy Run", "Upper · Push", "Lower", "Quality Run", _R],
    "build_discipline": ["Full Body", "Easy Run", _R, "Upper · Pull", "Easy Run", "Lower"],
    "general_health": ["Full Body", "Easy Run", _R, "Easy Run", "Lower", _R],
}
DEFAULT_WEEK = GOAL_WEEK["hybrid_athlete"]

_GOAL_TITLE = {
    "build_strength": "Strength",
    "build_endurance": "Endurance",
    "hybrid_athlete": "Hybrid",
    "lean_and_strong": "Lean & Strong",
    "build_discipline": "Discipline",
    "general_health": "Health",
}


def _note(low: bool, high: bool) -> str:
    if low:
        return "Readiness is low — keep 2 reps in reserve, no grinding."
    if high:
        return "You're fresh — earn a strong top set."
    return "Working sets at RPE 7–8."


def _exercise(group: str, *, low: bool, high: bool) -> PlanExercise:
    name, target = LIBRARY[group][0]
    return PlanExercise(name=name, target=target, note=_note(low, high), group=group)


def swap_exercise(group: str, exclude: str) -> PlanExercise:
    """Return an alternative in the same movement group (different from `exclude`)."""
    options = [opt for opt in LIBRARY.get(group, []) if opt[0] != exclude]
    if not options:
        name, target = (exclude, "")
    else:
        name, target = options[0]
    return PlanExercise(
        name=name, target=target, note="Swapped — same pattern, fresh stimulus.", group=group
    )


def _summary(signals: ContextSignals, days: int, goal_title: str) -> str:
    base = f"A {days}-day {goal_title.lower()} week, built around your readiness."
    r = signals.readiness
    if r < 50:
        return base + f" Readiness {r} is low — a recovery day swaps in and intensity is capped."
    if r >= 75:
        return base + f" Readiness {r} is high — this is the week to push the quality work."
    return base + f" Readiness {r} (load {signals.load_label}) — steady progression."


def build_training_plan(
    *, goal: str | None, weekly_target_days: int | None, signals: ContextSignals
) -> TrainingPlan:
    """Build a structured week shaped by goal, weekly volume and readiness."""
    week = GOAL_WEEK.get(goal or "", DEFAULT_WEEK)
    n = max(2, min(6, weekly_target_days or 4))
    focuses = list(week[:n])

    low = signals.readiness < 50
    high = signals.readiness >= 75
    # On a low-readiness week, make the last training day a recovery day.
    if low and "Recovery / Mobility" not in focuses:
        focuses[-1] = "Recovery / Mobility"

    days: list[PlanDay] = []
    for i, focus in enumerate(focuses):
        icon, groups = FOCUS[focus]
        recovery = focus == "Recovery / Mobility"
        exercises = [
            _exercise(g, low=low and not recovery, high=high and not recovery) for g in groups
        ]
        days.append(PlanDay(label=f"Day {i + 1}", focus=focus, icon=icon, exercises=exercises))

    goal_title = _GOAL_TITLE.get(goal or "", "Your")
    return TrainingPlan(
        title=f"{goal_title} Week",
        summary=_summary(signals, n, goal_title),
        days=days,
    )


# ── LLM-written variant (#70) — grounded in the athlete's real data ───────────


def _sessions_summary(sessions: list[dict[str, Any]]) -> str:
    if not sessions:
        return "no sessions logged yet"
    by_type = Counter(str(s.get("session_type", "other")) for s in sessions[:30])
    parts = [f"{count}x {kind}" for kind, count in by_type.items()]
    return f"{len(sessions)} recent ({', '.join(parts)})"


def _llm_prompt(
    goal: str | None,
    days: int,
    signals: ContextSignals,
    sessions: list[dict[str, Any]],
    memory: list[MemoryItem],
) -> str:
    facts = "; ".join(m.text for m in memory) or "no profile facts yet"
    return (
        f"You are Forge, an elite hybrid-athlete coach. Write a {days}-day training week "
        f"for the goal '{goal or 'general fitness'}', grounded in this athlete's real data.\n"
        f"Readiness: {signals.readiness} ({signals.readiness_label}); load {signals.load_label}; "
        f"7-day load {signals.load7}; momentum {signals.momentum}.\n"
        f"Athlete facts (PRs, injuries, equipment, supplements, preferences): {facts}.\n"
        f"Recent training: {_sessions_summary(sessions)}.\n"
        "Rules: respect injuries and available equipment from the facts; scale intensity to "
        "readiness (if readiness is low, include a recovery day and cap intensity); reference the "
        "athlete's real numbers where useful. Every exercise needs a movement 'group' (e.g. squat, "
        "hinge, horizontal_press, vertical_pull, lunge, run, core) so it stays swappable, plus a "
        "concrete target (sets x reps @ RPE, or a run prescription). Give each day a short focus "
        "and an icon name (one of: dumbbell, route, leaf, heart, bolt). Return only the plan."
    )


async def build_training_plan_llm(
    model: BaseChatModel,
    *,
    goal: str | None,
    weekly_target_days: int | None,
    signals: ContextSignals,
    sessions: list[dict[str, Any]],
    memory: list[MemoryItem],
) -> TrainingPlan | None:
    """An LLM-written week grounded in the athlete's real sessions/PRs/memory (#70).

    Returns None to fall back to the deterministic rule-based generator — a keyless
    model, a parse failure, or an outage. It never fabricates: on any doubt the
    caller uses the grounded rule-based week instead.
    """
    if isinstance(model, FallbackChatModel):
        return None
    days = max(2, min(6, weekly_target_days or 4))
    try:
        structured = model.with_structured_output(TrainingPlan)
        result = await structured.ainvoke(_llm_prompt(goal, days, signals, sessions, memory))
    except Exception:  # noqa: BLE001 - any LLM/parse failure must degrade, not 500
        logger.warning("LLM training-plan failed; using the rule-based week", exc_info=True)
        return None
    if isinstance(result, TrainingPlan) and result.days:
        return result
    return None
