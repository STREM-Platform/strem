"""Profile and onboarding enums, mirroring the user contract and onboarding-flow.md.

Enum string values are part of the user API.
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


class OnboardingStatusValue(StrEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


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
