"""Biomarker / blood-result schemas (issue #63), mirroring the user contract.

Users enter lab values; Forge surfaces **trends + context**, never a diagnosis
(A8). Entry is gated behind explicit consent + Medical Disclaimer acceptance and
is a first-class A7 source the user can revoke. The `unit` is captured as the
user's lab reported it (labs differ), so it is free text rather than an enum.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class BiomarkerType(StrEnum):
    """The lab markers the MVP supports entering (next-steps-plan.md §3.3).

    A focused, high-signal panel. Adding a marker is a code change here + in the
    contract, never a free-text field, so trends stay comparable across readings.
    """

    FERRITIN = "ferritin"
    VITAMIN_D = "vitamin_d"
    B12 = "b12"
    LDL = "ldl"
    HDL = "hdl"
    TRIGLYCERIDES = "triglycerides"
    TOTAL_CHOLESTEROL = "total_cholesterol"
    GLUCOSE = "glucose"
    HBA1C = "hba1c"
    TESTOSTERONE = "testosterone"
    TSH = "tsh"
    CRP = "crp"
    MAGNESIUM = "magnesium"


class TrendDirection(StrEnum):
    """Direction of the latest reading vs the previous one — never a judgement."""

    RISING = "rising"
    FALLING = "falling"
    STABLE = "stable"
    SINGLE = "single"


class BiomarkerCreate(BaseModel):
    """A single lab reading the user is entering."""

    marker_type: BiomarkerType
    value: float = Field(gt=0, description="The measured value, in the given unit.")
    unit: str = Field(min_length=1, max_length=20, description="Unit as the lab reported it.")
    taken_at: datetime = Field(description="When the sample was taken / the lab was drawn.")
    note: str | None = Field(default=None, max_length=280)


class Biomarker(BaseModel):
    """A stored lab reading."""

    id: uuid.UUID
    marker_type: BiomarkerType
    value: float
    unit: str
    taken_at: datetime
    note: str | None = None
    created_at: datetime


class BiomarkerTrend(BaseModel):
    """Per-marker trend context (decision-support for a clinician, never a diagnosis)."""

    marker_type: BiomarkerType
    latest_value: float
    unit: str
    direction: TrendDirection
    reading_count: int
    latest_taken_at: datetime


class BiomarkerList(BaseModel):
    """A user's lab readings (newest first) plus the per-marker trend summary."""

    items: list[Biomarker]
    trends: list[BiomarkerTrend]
