"""Pure live-workout logic (D1/D2): RPE → rest/load autoregulation and PR maths.

These functions hold no I/O so they are unit-testable in isolation. The
autoregulation rule mirrors the FE prototype
(`strem-mobile/components/workout/live-session.tsx`): after a set, RPE 9+ adds
rest and holds load (near failure), RPE ≤6 trims rest and allows more load
(comfortable), RPE 7–8 holds. Rest never drops below the 45s floor.
"""

from __future__ import annotations

from dataclasses import dataclass

REST_FLOOR_S = 45
HARD_RPE = 9  # at/above this: near failure → more rest, hold load
EASY_RPE = 6  # at/below this: comfortable → less rest, allow more load
HARD_REST_BONUS_S = 45
EASY_REST_CUT_S = 30
EASY_LOAD_STEP_KG = 2.5


@dataclass(frozen=True)
class NextTarget:
    """The autoregulated target for the next set."""

    rest_s: int
    load_kg: float
    message: str


def autoregulate(prev_rpe: int | None, base_rest_s: int, base_load_kg: float) -> NextTarget:
    """Adjust rest and next-set load from the RPE of the set just completed.

    With no RPE reported we hold the baseline — we never guess effort.
    """
    if prev_rpe is None:
        return NextTarget(
            rest_s=max(REST_FLOOR_S, base_rest_s),
            load_kg=base_load_kg,
            message="No RPE logged — holding rest and load.",
        )
    if prev_rpe >= HARD_RPE:
        return NextTarget(
            rest_s=max(REST_FLOOR_S, base_rest_s + HARD_REST_BONUS_S),
            load_kg=base_load_kg,
            message=f"RPE {prev_rpe}, near failure. Extra rest, hold the load to keep form.",
        )
    if prev_rpe <= EASY_RPE:
        return NextTarget(
            rest_s=max(REST_FLOOR_S, base_rest_s - EASY_REST_CUT_S),
            load_kg=base_load_kg + EASY_LOAD_STEP_KG,
            message=f"RPE {prev_rpe}, comfortable. Less rest, add a little load.",
        )
    return NextTarget(
        rest_s=max(REST_FLOOR_S, base_rest_s),
        load_kg=base_load_kg,
        message=f"RPE {prev_rpe}, right in the zone. Standard rest holds the line.",
    )


def estimated_1rm(reps: int, kg: float) -> float:
    """Epley estimated one-rep max, used to compare efforts across rep ranges."""
    return round(kg * (1 + reps / 30), 2)


def is_pr(candidate_e1rm: float, prior_best_e1rm: float | None) -> bool:
    """True if the candidate effort beats recorded history (or none exists yet)."""
    return prior_best_e1rm is None or candidate_e1rm > prior_best_e1rm
