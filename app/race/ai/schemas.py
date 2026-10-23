"""Shapes the model must return (structured outputs).

Structured outputs require closed objects, so table rows are key/value lists
here and converted back to the layer document's `values` mapping afterwards.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class AIValue(BaseModel):
    key: str
    value: str | float | None


class AIItem(BaseModel):
    id: str
    title: str
    detail: str | None
    when: str | None
    due_date: str | None
    quantity: str | None
    tag: str | None
    priority: Literal["critical", "high", "normal", "low"]
    values: list[AIValue] | None


class AISection(BaseModel):
    id: str
    title: str
    kind: Literal["checklist", "timeline", "table", "notes"]
    description: str | None
    columns: list[str] | None
    items: list[AIItem]


class AIMetric(BaseModel):
    label: str
    value: str
    unit: str | None
    note: str | None


class AILayer(BaseModel):
    headline: str
    summary: str
    metrics: list[AIMetric]
    sections: list[AISection]
    warnings: list[str]
    assumptions: list[str]
    personalization_notes: list[str]


class SessionEdit(BaseModel):
    id: str
    title: str | None
    purpose: str | None
    structure: list[str] | None
    fueling: str | None
    terrain: str | None
    duration_minutes: int | None
    distance_km: float | None
    elevation_m: int | None


class WeekNote(BaseModel):
    index: int
    focus: str | None
    notes: str | None


class AIPlan(BaseModel):
    headline: str
    summary: str
    principles: list[str]
    warnings: list[str]
    assumptions: list[str]
    week_notes: list[WeekNote]
    session_edits: list[SessionEdit]


class AIEvidence(BaseModel):
    label: str
    value: str
    source: Literal["recorded", "athlete", "calculated", "plan", "official", "assumption"]


class AIRisk(BaseModel):
    title: str
    detail: str
    severity: Literal["info", "attention", "critical"]


class AIAction(BaseModel):
    title: str
    target: Literal[
        "plan",
        "fuel",
        "gear",
        "logistics",
        "strategy",
        "course",
        "checkin",
        "sources",
        "debrief",
        "chat",
    ]


class AIBrief(BaseModel):
    headline: str
    message: str
    evidence: list[AIEvidence]
    risks: list[AIRisk]
    actions: list[AIAction]


class AdaptChange(BaseModel):
    session_id: str
    change: Literal["modify", "rest", "remove"]
    title: str | None
    purpose: str | None
    duration_minutes: int | None
    distance_km: float | None
    intensity: (
        Literal["rest", "very_easy", "easy", "moderate", "steady", "threshold", "hard"] | None
    )
    reason: str


class AIAdaptation(BaseModel):
    summary: str
    safety_note: str | None
    changes: list[AdaptChange]
