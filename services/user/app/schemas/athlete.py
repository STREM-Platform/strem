"""Athlete Baseline schemas (issue #61), mirroring contracts/user/openapi.yml.

The progressive, optional Athlete Profile that feeds the A6 context graph. All
fields are coaching inputs and optional; PRs are structured so they can seed the
D1/D2 PR baseline. Framed as coaching inputs, never a "look" metric (A8).
"""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field


class AgeBand(StrEnum):
    UNDER_20 = "under_20"
    AGE_20_29 = "20_29"
    AGE_30_39 = "30_39"
    AGE_40_49 = "40_49"
    AGE_50_59 = "50_59"
    AGE_60_PLUS = "60_plus"


class BiologicalSex(StrEnum):
    """For HR/HRV norms and load math only — a coaching input, not a 'look' metric."""

    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class EquipmentAccess(StrEnum):
    FULL_GYM = "full_gym"
    HOME_GYM = "home_gym"
    MINIMAL = "minimal"
    BODYWEIGHT_ONLY = "bodyweight_only"


class PersonalRecord(BaseModel):
    """A current PR. A lift carries weight_kg(+reps); a race carries time."""

    exercise: str = Field(min_length=1, max_length=60)
    weight_kg: float | None = Field(default=None, ge=0, le=1000)
    reps: int | None = Field(default=None, ge=1, le=1000)
    time: str | None = Field(default=None, max_length=20, description="Race time, e.g. 22:30.")
    note: str | None = Field(default=None, max_length=140)


class Injury(BaseModel):
    area: str = Field(min_length=1, max_length=60)
    note: str | None = Field(default=None, max_length=200)


class AthleteProfileUpdate(BaseModel):
    """Upsert the athlete profile. Only the fields present are applied (partial
    update); lists replace wholesale."""

    height_cm: int | None = Field(default=None, ge=50, le=260)
    weight_kg: float | None = Field(default=None, ge=20, le=400)
    age_band: AgeBand | None = None
    biological_sex: BiologicalSex | None = None
    years_training: int | None = Field(default=None, ge=0, le=80)
    equipment_access: EquipmentAccess | None = None
    personal_records: list[PersonalRecord] | None = Field(default=None, max_length=50)
    injuries: list[Injury] | None = Field(default=None, max_length=50)
    dietary_constraints: list[str] | None = Field(default=None, max_length=50)


class AthleteProfileResponse(BaseModel):
    """The full athlete profile (all coaching inputs, any unset)."""

    height_cm: int | None = None
    weight_kg: float | None = None
    age_band: AgeBand | None = None
    biological_sex: BiologicalSex | None = None
    years_training: int | None = None
    equipment_access: EquipmentAccess | None = None
    personal_records: list[PersonalRecord] = Field(default_factory=list)
    injuries: list[Injury] = Field(default_factory=list)
    dietary_constraints: list[str] = Field(default_factory=list)
    is_started: bool = Field(
        description="True once the user has set at least one field (drives the prompt card)."
    )
