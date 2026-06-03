"""Rank and medal schemas for the MVP game system.

Rank names, XP bands, and the medal set mirror
`strem-docs/product/game-systems.md` and the published contract
`strem-shared-contracts/contracts/user/openapi.yml`. MVP only — Titan,
Ascended, and path ranks are V2 and intentionally excluded.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel


class UserRank(StrEnum):
    """The five MVP ranks (game-systems.md)."""

    INITIATE = "Initiate"
    BUILDER = "Builder"
    FORGED = "Forged"
    HYBRID = "Hybrid"
    WARRIOR = "Warrior"


# Lower XP bound for each MVP rank band (game-systems.md).
RANK_XP_FLOOR: dict[UserRank, int] = {
    UserRank.INITIATE: 0,
    UserRank.BUILDER: 1_000,
    UserRank.FORGED: 5_000,
    UserRank.HYBRID: 15_000,
    UserRank.WARRIOR: 40_000,
}


class MedalType(StrEnum):
    """The ten MVP medals (game-systems.md)."""

    FIRST_STEPS = "first_steps"
    COMMITTED = "committed"
    TRIBE_MEMBER = "tribe_member"
    IRON_WEEK = "iron_week"
    THIRTY_DAY_MARK = "thirty_day_mark"
    ACCOUNTABILITY_ANCHOR = "accountability_anchor"
    NUTRITION_CONSISTENT = "nutrition_consistent"
    FIRST_MILE = "first_mile"
    FIRST_IRON = "first_iron"
    IDENTITY_FORGED = "identity_forged"


class Medal(BaseModel):
    """A medal earned by a user."""

    id: uuid.UUID
    user_id: uuid.UUID
    medal_type: MedalType
    earned_at: datetime
