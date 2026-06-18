"""Schemas for Forge consent and autonomy (A7), mirroring contracts/user/openapi.yml.

`PrivacyData` matches `PrivacyData` in strem-mobile/lib/agent/types.ts, with one
addition: each item carries a stable `id` (the source id) so the client can
toggle a specific source via `PUT /users/me/agent-consent`.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.enums import AgentCapability, AutonomyLevel


class ConsentItem(BaseModel):
    """One toggleable data source on the Privacy screen."""

    id: str = Field(description="Stable source id, used to toggle this source.")
    k: str = Field(description="Human label shown on the Privacy screen.")
    on: bool = Field(description="Whether Forge may currently use this source.")


class ConsentGroup(BaseModel):
    """A labelled group of related sources (Recovery, Training, Fuel, Memory)."""

    label: str
    items: list[ConsentItem]


class PrivacyData(BaseModel):
    """The full consent surface: intro copy, grouped toggles, and footer."""

    intro: str
    groups: list[ConsentGroup]
    footer: str


class ConsentUpdate(BaseModel):
    """Toggle a single data source on or off."""

    source_id: str
    enabled: bool


class AutonomyUpdate(BaseModel):
    """Set the autonomy level for a single capability."""

    capability: AgentCapability
    level: AutonomyLevel
