"""Readiness-aware adaptive plan (B4).

Turns the A4 signals + the athlete's goal into 3 mission suggestions for the Coach
"Plan" view, biased by readiness: low readiness leans recovery, high readiness
leans progression. Deterministic and grounded — the LLM-written variant can layer
on later, but the bias here is rule-based so it's predictable and testable.
"""

from __future__ import annotations

from app.schemas import AdaptiveMission, AdaptivePlan, ContextSignals, MemoryItem

_GOAL_LABEL = {
    "hybrid_athlete": "Hybrid",
    "build_strength": "strength",
    "build_endurance": "endurance",
    "lean_and_strong": "lean & strong",
    "build_discipline": "discipline",
    "general_health": "health",
}

_RECOVERY = AdaptiveMission(
    icon="moon",
    title="Bank Three 7h Nights",
    tone="amber",
    xp=120,
    days=4,
    why="Sleep is the cheapest performance you can buy — your readiness says it's the lever now.",
)
_ZONE2 = AdaptiveMission(
    icon="route",
    title="Two Zone-2 Runs",
    tone="green",
    xp=200,
    days=5,
    why="Easy aerobic work recovers you and widens your base without taxing a tired system.",
)
_MOBILITY = AdaptiveMission(
    icon="refresh",
    title="Daily 10-min Mobility",
    tone="green",
    xp=90,
    days=5,
    why="Movement quality keeps you training through a low-readiness stretch.",
)
_PROGRESSION = AdaptiveMission(
    icon="dumbbell",
    title="Heavy Top-Set Progression",
    tone="green",
    xp=220,
    days=5,
    why="You're fresh — one heavier top set on a high-readiness day keeps strength moving.",
)
_TEMPO = AdaptiveMission(
    icon="timer",
    title="One Tempo Effort",
    tone="green",
    xp=210,
    days=4,
    why="High readiness is the day to spend — a controlled tempo run converts that into fitness.",
)
_RUN_GAP = AdaptiveMission(
    icon="route",
    title="Add a Third Run",
    tone="green",
    xp=180,
    days=7,
    why="Running is the gap to your goal — a third easy run a week is the floor.",
)


def build_adaptive_plan(
    signals: ContextSignals,
    *,
    goal: str | None,
    weekly_target: int | None,
    memory: list[MemoryItem],
) -> AdaptivePlan:
    goal_label = _GOAL_LABEL.get(goal or "", "your")
    readiness = signals.readiness

    if readiness < 50:
        missions = [_RECOVERY, _ZONE2, _MOBILITY]
        stance = "recovery-first"
    elif readiness < 75:
        missions = [_RUN_GAP, _PROGRESSION, _RECOVERY]
        stance = "balanced"
    else:
        missions = [_PROGRESSION, _TEMPO, _RUN_GAP]
        stance = "progression"

    reason = (
        f"Built {stance} from your readiness ({readiness}, {signals.readiness_label}), "
        f"your {goal_label} goal, and a 7-day load of {signals.load7} "
        f"({signals.load_label})."
    )
    return AdaptivePlan(reason=reason, missions=missions)
