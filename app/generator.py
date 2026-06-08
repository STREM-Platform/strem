"""Rule-based mission and recap generation (MVP — no external LLM).

Missions are structured, identity-grounded behavioral objectives. Difficulty
adapts to recent consistency exactly per ai-architecture.md "Mission Difficulty
Adaptation": a returning user (0 active days) only ever gets a re-entry mission.
Generation is deterministic and bounded, which keeps it testable and safe.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.context import ContextBundle
from app.enums import MissionDifficulty, MissionType

# XP reward per difficulty, within the MVP mission range (75-150).
_XP_BY_DIFFICULTY: dict[MissionDifficulty, int] = {
    MissionDifficulty.RE_ENTRY: 75,
    MissionDifficulty.MAINTENANCE: 100,
    MissionDifficulty.GROWTH: 125,
    MissionDifficulty.CHALLENGE: 150,
}

# transformation_goal -> the primary mission pillar.
_GOAL_TYPE: dict[str, MissionType] = {
    "build_strength": MissionType.PERFORMANCE,
    "build_endurance": MissionType.PERFORMANCE,
    "hybrid_athlete": MissionType.HYBRID,
    "lean_and_strong": MissionType.NUTRITION,
    "build_discipline": MissionType.DISCIPLINE,
    "general_health": MissionType.HYBRID,
}


@dataclass(frozen=True)
class GeneratedMission:
    title: str
    description: str
    duration_days: int
    xp_reward: int
    type: MissionType
    completion_condition: str
    difficulty: MissionDifficulty


def difficulty_for(active_days_last_week: int) -> MissionDifficulty:
    """Adapt difficulty to recent consistency (ai-architecture.md)."""
    if active_days_last_week <= 0:
        return MissionDifficulty.RE_ENTRY  # returning user — the door must be small
    if active_days_last_week <= 4:
        return MissionDifficulty.MAINTENANCE
    if active_days_last_week <= 6:
        return MissionDifficulty.GROWTH
    return MissionDifficulty.CHALLENGE


def _primary_mission(bundle: ContextBundle, difficulty: MissionDifficulty) -> GeneratedMission:
    pillar = _GOAL_TYPE.get(bundle.transformation_goal or "", MissionType.HYBRID)
    target_days = max(2, min(bundle.weekly_target_days or 3, 5))
    if difficulty is MissionDifficulty.RE_ENTRY:
        target_days = 2
    return GeneratedMission(
        title="Return to the work",
        description=(
            f"You said: “{bundle.identity_statement}” "
            f"This week, take {target_days} clear steps toward that."
        ),
        duration_days=7,
        xp_reward=_XP_BY_DIFFICULTY[difficulty],
        type=pillar,
        completion_condition=f"Log {target_days} training or running sessions this week.",
        difficulty=difficulty,
    )


def _discipline_mission(difficulty: MissionDifficulty) -> GeneratedMission:
    return GeneratedMission(
        title="Hold the line",
        description="Discipline is the quiet engine. Keep one promise to yourself every day.",
        duration_days=7,
        xp_reward=_XP_BY_DIFFICULTY[difficulty],
        type=MissionType.DISCIPLINE,
        completion_condition="Log any action on at least 4 days this week.",
        difficulty=difficulty,
    )


def _recovery_mission(difficulty: MissionDifficulty) -> GeneratedMission:
    return GeneratedMission(
        title="Earn your recovery",
        description="Strength is built in the rest. Protect one real recovery day.",
        duration_days=7,
        xp_reward=_XP_BY_DIFFICULTY[difficulty],
        type=MissionType.RECOVERY,
        completion_condition="Log a mobility or recovery session this week.",
        difficulty=difficulty,
    )


def generate_missions(bundle: ContextBundle) -> list[GeneratedMission]:
    """Generate 1-3 identity-grounded missions adapted to recent consistency."""
    difficulty = difficulty_for(bundle.active_days_last_week)
    missions = [_primary_mission(bundle, difficulty)]
    if difficulty is MissionDifficulty.RE_ENTRY:
        return missions  # one small, achievable step — nothing more
    missions.append(_discipline_mission(difficulty))
    if difficulty in (MissionDifficulty.GROWTH, MissionDifficulty.CHALLENGE):
        missions.append(_recovery_mission(MissionDifficulty.MAINTENANCE))
    return missions


def generate_recap_narrative(bundle: ContextBundle, completed_missions: int) -> str:
    """Compose an identity-grounded weekly recap (not a metrics dashboard)."""
    opener = f"You're becoming someone who {bundle.identity_statement.rstrip('.').lower()}."
    if completed_missions > 0:
        body = (
            f" This week you finished {completed_missions} "
            f"mission{'s' if completed_missions != 1 else ''} — that's the identity showing up, "
            "not just the intention."
        )
    else:
        body = (
            " This week was quiet. That happens — what matters is the return. "
            "One small action resets everything."
        )
    closer = " Next week, we keep both the work and the recovery moving."
    return opener + body + closer
