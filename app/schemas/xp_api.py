"""XP and medal read-response schemas mirroring contracts/user/openapi.yml."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.game import UserRank
from app.schemas.profile import EarnedMedal
from app.schemas.xp import XPSource


class XPSummaryResponse(BaseModel):
    """XP total, current rank, and progress to the next rank (contract `XPSummary`)."""

    user_id: uuid.UUID
    total_xp: int
    rank: UserRank
    next_rank: UserRank | None
    rank_xp_floor: int
    rank_xp_ceiling: int
    xp_into_rank: int
    xp_to_next_rank: int


class XPLedgerEntryResponse(BaseModel):
    """A single append-only ledger entry (contract `XPLedgerEntry`)."""

    id: uuid.UUID
    user_id: uuid.UUID
    xp_amount: int
    source: XPSource
    source_reference: str | None = None
    new_total: int
    earned_at: datetime


class Pagination(BaseModel):
    limit: int
    offset: int
    total: int


class XPHistoryPage(BaseModel):
    items: list[XPLedgerEntryResponse]
    pagination: Pagination


class MedalListResponse(BaseModel):
    items: list[EarnedMedal]
