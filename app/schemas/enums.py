"""Profile and onboarding enums, mirroring the user contract and onboarding-flow.md.

Enum string values are identical to
`strem-shared-contracts/contracts/user/openapi.yml`. Rank and medal enums live
in `app.schemas.game`.
"""

from __future__ import annotations

from enum import StrEnum


class TransformationGoal(StrEnum):
    """Identity goal selected during onboarding (onboarding-flow.md `identity`)."""

    BUILD_STRENGTH = "build_strength"
    BUILD_ENDURANCE = "build_endurance"
    HYBRID_ATHLETE = "hybrid_athlete"
    LEAN_AND_STRONG = "lean_and_strong"
    BUILD_DISCIPLINE = "build_discipline"
    GENERAL_HEALTH = "general_health"


class TrainingLevel(StrEnum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class Modality(StrEnum):
    STRENGTH = "strength"
    RUNNING = "running"
    MOBILITY = "mobility"
    NUTRITION = "nutrition"


class NutritionPreference(StrEnum):
    GENERAL_CONSISTENCY = "general_consistency"
    HIGH_PROTEIN = "high_protein"
    PLANT_BASED = "plant_based"
    NO_FOCUS = "no_focus"


class TribePreference(StrEnum):
    JOIN_NOW = "join_now"
    JOIN_LATER = "join_later"
    SOLO_FOR_NOW = "solo_for_now"


class OnboardingStatusValue(StrEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class AgentCapability(StrEnum):
    """A typed, logged, reversible action Forge can take (mirrors the FE registry).

    Values match `AgentCapability` in strem-mobile/lib/agent/types.ts and the
    orchestrator's `app.enums.AgentCapability`; they key the per-capability
    autonomy map returned by `/users/me/agent-autonomy`.
    """

    UPDATE_READINESS = "updateReadiness"
    SURFACE_INSIGHT = "surfaceInsight"
    ADJUST_TARGETS = "adjustTargets"
    SWAP_EXERCISE = "swapExercise"
    FLAG_NUTRITION = "flagNutrition"
    WRITE_MEMORY = "writeMemory"
    ADJUST_TODAY_PLAN = "adjustTodayPlan"
    RESCHEDULE_WEEK = "rescheduleWeek"
    GENERATE_MISSIONS = "generateMissions"
    IMPORT_PLAN = "importPlan"
    LOG_CAPTURE = "logCapture"
    SEND_NUDGE = "sendNudge"


class AutonomyLevel(StrEnum):
    """How much latitude Forge has for a capability (user-controlled).

    auto — Forge does it, tells you, you can undo
    ask  — Forge proposes, you approve
    off  — Forge won't
    """

    AUTO = "auto"
    ASK = "ask"
    OFF = "off"


class ScreenName(StrEnum):
    """The seven onboarding screens, in order (onboarding-flow.md)."""

    WELCOME = "welcome"
    IDENTITY = "identity"
    TRAINING_BACKGROUND = "training-background"
    COMMITMENT = "commitment"
    NUTRITION = "nutrition"
    TRIBE = "tribe"
    LAUNCH = "launch"


# Stable screen order used to compute the resume point.
SCREEN_ORDER: list[ScreenName] = [
    ScreenName.WELCOME,
    ScreenName.IDENTITY,
    ScreenName.TRAINING_BACKGROUND,
    ScreenName.COMMITMENT,
    ScreenName.NUTRITION,
    ScreenName.TRIBE,
    ScreenName.LAUNCH,
]
