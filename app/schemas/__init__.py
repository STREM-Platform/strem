"""Pydantic schemas for strem-user-service (profiles, onboarding, game state)."""

from app.schemas.enums import (
    Modality,
    NutritionPreference,
    OnboardingStatusValue,
    ScreenName,
    TrainingLevel,
    TransformationGoal,
    TribePreference,
)
from app.schemas.game import RANK_XP_FLOOR, Medal, MedalType, UserRank
from app.schemas.onboarding import OnboardingRequest, OnboardingStatusResponse
from app.schemas.profile import EarnedMedal, UpdateProfileRequest, UserProfileResponse
from app.schemas.xp import XP_FIXED, XP_RANGE, XPLedgerEntry, XPSource

__all__ = [
    "RANK_XP_FLOOR",
    "XP_FIXED",
    "XP_RANGE",
    "EarnedMedal",
    "Medal",
    "MedalType",
    "Modality",
    "NutritionPreference",
    "OnboardingRequest",
    "OnboardingStatusResponse",
    "OnboardingStatusValue",
    "ScreenName",
    "TrainingLevel",
    "TransformationGoal",
    "TribePreference",
    "UpdateProfileRequest",
    "UserProfileResponse",
    "UserRank",
    "XPLedgerEntry",
    "XPSource",
]
