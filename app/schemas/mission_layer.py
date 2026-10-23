"""Mission layers: the operational documents of a Race Mission.

Fuel, gear, logistics and strategy share one document shape so the race engine,
the AI and the athlete all write the same thing: a headline, key metrics, and
sections of items the athlete works through (check off, mark tested, pack).
`origin` says who produced the current version — never present engine output as AI.
"""

import re
import uuid
from datetime import date, datetime
from typing import Literal, Self

from pydantic import Field, field_validator, model_validator

from app.schemas.race_mission import StrictModel, _calendar_date

LayerKind = Literal["fuel", "gear", "logistics", "strategy"]
LAYER_KINDS: tuple[str, ...] = ("fuel", "gear", "logistics", "strategy")
ItemStatus = Literal["todo", "done", "tested", "packed", "skipped", "na"]
Origin = Literal["engine", "ai", "athlete"]
Scalar = str | int | float | bool | None

_ITEM_ID = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")


def _slug(value: str) -> str:
    if not _ITEM_ID.match(value):
        raise ValueError("Ids are lowercase slugs: a-z, 0-9, '-', '_' (max 64)")
    return value


class LayerMetric(StrictModel):
    label: str = Field(min_length=1, max_length=60)
    value: str = Field(min_length=1, max_length=40)
    unit: str | None = Field(default=None, max_length=20)
    note: str | None = Field(default=None, max_length=240)


class LayerItem(StrictModel):
    id: str
    title: str = Field(min_length=1, max_length=160)
    detail: str | None = Field(default=None, max_length=1200)
    when: str | None = Field(default=None, max_length=80)
    due_date: date | None = None
    quantity: str | None = Field(default=None, max_length=60)
    tag: str | None = Field(default=None, max_length=40)
    priority: Literal["critical", "high", "normal", "low"] = "normal"
    status: ItemStatus = "todo"
    note: str | None = Field(default=None, max_length=500)
    values: dict[str, Scalar] | None = None

    @field_validator("id")
    @classmethod
    def slug_id(cls, value: str) -> str:
        return _slug(value)

    @field_validator("due_date", mode="before")
    @classmethod
    def calendar_date_only(cls, value: object) -> object:
        return _calendar_date(value)

    @field_validator("values")
    @classmethod
    def small_table_row(cls, value: dict[str, Scalar] | None) -> dict[str, Scalar] | None:
        if value is None:
            return value
        if len(value) > 16:
            raise ValueError("At most 16 values per item")
        for key, cell in value.items():
            if not 1 <= len(key) <= 40:
                raise ValueError("Value keys are 1-40 characters")
            if isinstance(cell, str) and len(cell) > 200:
                raise ValueError("Value text is limited to 200 characters")
        return value


class LayerSection(StrictModel):
    id: str
    title: str = Field(min_length=1, max_length=120)
    kind: Literal["checklist", "timeline", "table", "notes"] = "checklist"
    description: str | None = Field(default=None, max_length=800)
    columns: list[str] | None = Field(default=None, max_length=12)
    items: list[LayerItem] = Field(default_factory=list, max_length=120)

    @field_validator("id")
    @classmethod
    def slug_id(cls, value: str) -> str:
        return _slug(value)


class LayerContent(StrictModel):
    headline: str = Field(min_length=1, max_length=200)
    summary: str = Field(default="", max_length=2400)
    metrics: list[LayerMetric] = Field(default_factory=list, max_length=12)
    sections: list[LayerSection] = Field(default_factory=list, max_length=20)
    warnings: list[str] = Field(default_factory=list, max_length=12)
    assumptions: list[str] = Field(default_factory=list, max_length=16)
    sources: list[str] = Field(default_factory=list, max_length=16)

    @field_validator("warnings", "assumptions", "sources")
    @classmethod
    def short_lines(cls, value: list[str]) -> list[str]:
        if any(len(line) > 400 for line in value):
            raise ValueError("Keep each line under 400 characters")
        return value

    @model_validator(mode="after")
    def unique_ids(self) -> Self:
        sections = [section.id for section in self.sections]
        items = [item.id for section in self.sections for item in section.items]
        if len(set(sections)) != len(sections) or len(set(items)) != len(items):
            raise ValueError("Section and item ids must be unique within a layer")
        return self


class MissionLayerWrite(StrictModel):
    content: LayerContent
    origin: Origin
    model: str | None = Field(default=None, max_length=80)
    inputs_digest: str | None = Field(default=None, max_length=64)


class ItemPatch(StrictModel):
    status: ItemStatus | None = None
    note: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def has_change(self) -> Self:
        if not self.model_fields_set & {"status", "note"}:
            raise ValueError("Provide status or note")
        if "status" in self.model_fields_set and self.status is None:
            raise ValueError("status cannot be null")
        return self


class MissionLayer(StrictModel):
    mission_id: uuid.UUID
    kind: LayerKind
    version: int = Field(ge=1)
    origin: Origin
    model: str | None = None
    inputs_digest: str | None = None
    content: LayerContent
    created_at: datetime
    updated_at: datetime


class MissionLayerList(StrictModel):
    items: list[MissionLayer]
