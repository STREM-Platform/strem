"""Rank and medal schemas for the MVP game system.

Rank names, XP bands, and the medal set mirror
`strem-docs/product/game-systems.md` and the published contract
`strem-shared-contracts/contracts/user/openapi.yml`. Phase 2 (P2-01) adds the
full 7-rank ladder (Titan, Ascended) and an expanded medal catalogue.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel


class UserRank(StrEnum):
    """The seven STREM ranks (game-systems.md; Titan/Ascended added in P2-01)."""

    INITIATE = "Initiate"
    BUILDER = "Builder"
    FORGED = "Forged"
    HYBRID = "Hybrid"
    WARRIOR = "Warrior"
    TITAN = "Titan"
    ASCENDED = "Ascended"


# Lower XP bound for each rank band (game-systems.md). Titan 100,000–249,999,
# Ascended 250,000+.
RANK_XP_FLOOR: dict[UserRank, int] = {
    UserRank.INITIATE: 0,
    UserRank.BUILDER: 1_000,
    UserRank.FORGED: 5_000,
    UserRank.HYBRID: 15_000,
    UserRank.WARRIOR: 40_000,
    UserRank.TITAN: 100_000,
    UserRank.ASCENDED: 250_000,
}


class MedalType(StrEnum):
    """The MVP medals plus the P2-01 expanded catalogue (game-systems.md)."""

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
    # --- Phase 2 expanded catalogue ---
    UNBROKEN = "unbroken"  # discipline
    RELENTLESS = "relentless"  # discipline
    LONG_HAULER = "long_hauler"  # endurance
    IRON_DEVOTEE = "iron_devotee"  # strength
    WELL_FUELED = "well_fueled"  # recovery / nutrition
    TRIBE_PILLAR = "tribe_pillar"  # tribe


# Human-readable medal names (game-systems.md "Medal Set").
MEDAL_TITLES: dict[MedalType, str] = {
    MedalType.FIRST_STEPS: "First Steps",
    MedalType.COMMITTED: "Committed",
    MedalType.TRIBE_MEMBER: "Tribe Member",
    MedalType.IRON_WEEK: "Iron Week",
    MedalType.THIRTY_DAY_MARK: "30-Day Mark",
    MedalType.ACCOUNTABILITY_ANCHOR: "Accountability Anchor",
    MedalType.NUTRITION_CONSISTENT: "Nutrition Consistent",
    MedalType.FIRST_MILE: "First Mile",
    MedalType.FIRST_IRON: "First Iron",
    MedalType.IDENTITY_FORGED: "Identity Forged",
    MedalType.UNBROKEN: "Unbroken",
    MedalType.RELENTLESS: "Relentless",
    MedalType.LONG_HAULER: "Long Hauler",
    MedalType.IRON_DEVOTEE: "Iron Devotee",
    MedalType.WELL_FUELED: "Well Fueled",
    MedalType.TRIBE_PILLAR: "Tribe Pillar",
}


class Medal(BaseModel):
    """A medal earned by a user."""

    id: uuid.UUID
    user_id: uuid.UUID
    medal_type: MedalType
    earned_at: datetime
