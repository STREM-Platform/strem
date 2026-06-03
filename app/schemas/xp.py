"""XP ledger schema and the MVP XP economy reference.

The source enum and XP weights mirror `strem-docs/product/game-systems.md`
and the published contract `strem-shared-contracts/contracts/user/openapi.yml`.

No XP calculation logic lives here yet — these are schema definitions and
reference constants only (per strem-user-service#1 scope).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class XPSource(StrEnum):
    """The nine MVP XP sources (game-systems.md)."""

    STRENGTH_SESSION = "strength_session"
    RUNNING_SESSION = "running_session"
    MOBILITY_RECOVERY = "mobility_recovery"
    NUTRITION_DAY = "nutrition_day"
    TRIBE_CHECKIN = "tribe_checkin"
    MISSION_COMPLETE = "mission_complete"
    CHALLENGE_COMPLETE = "challenge_complete"
    STREAK_7_DAY = "streak_7_day"
    STREAK_30_DAY = "streak_30_day"


# Fixed XP weights (game-systems.md).
XP_FIXED: dict[XPSource, int] = {
    XPSource.STRENGTH_SESSION: 50,
    XPSource.RUNNING_SESSION: 40,
    XPSource.MOBILITY_RECOVERY: 30,
    XPSource.NUTRITION_DAY: 25,
    XPSource.TRIBE_CHECKIN: 20,
    XPSource.STREAK_7_DAY: 200,
    XPSource.STREAK_30_DAY: 1000,
}

# Variable-reward sources expressed as (min, max) XP ranges (game-systems.md).
XP_RANGE: dict[XPSource, tuple[int, int]] = {
    XPSource.MISSION_COMPLETE: (75, 150),
    XPSource.CHALLENGE_COMPLETE: (100, 500),
}


class XPLedgerEntry(BaseModel):
    """A single append-only entry in the progression ledger."""

    id: uuid.UUID
    user_id: uuid.UUID
    xp_amount: int = Field(ge=1, description="XP granted; append-only and always positive.")
    source: XPSource
    earned_at: datetime
