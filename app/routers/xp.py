"""XP and medal read endpoints implementing contracts/user/openapi.yml.

`GET /users/me/xp`, `GET /users/me/xp/history`, and `GET /users/me/medals`.
All are scoped to the authenticated user and read the append-only ledger.
"""

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import desc, func, select

from app.deps import CurrentUserDep, SessionDep
from app.models import XPLedgerEntry
from app.progression import active_medals, total_xp
from app.ranks import rank_progress
from app.schemas.xp_api import (
    MedalListResponse,
    Pagination,
    XPHistoryPage,
    XPLedgerEntryResponse,
    XPSummaryResponse,
)

router = APIRouter(prefix="/v1", tags=["xp"])


@router.get("/users/me/xp", response_model=XPSummaryResponse)
async def get_xp_summary(current: CurrentUserDep, session: SessionDep) -> XPSummaryResponse:
    total = await total_xp(session, current.user_id)
    progress = rank_progress(total)
    return XPSummaryResponse(
        user_id=current.user_id,
        total_xp=total,
        rank=progress.rank,
        next_rank=progress.next_rank,
        rank_xp_floor=progress.rank_xp_floor,
        rank_xp_ceiling=progress.rank_xp_ceiling,
        xp_into_rank=progress.xp_into_rank,
        xp_to_next_rank=progress.xp_to_next_rank,
    )


@router.get("/users/me/xp/history", response_model=XPHistoryPage)
async def get_xp_history(
    current: CurrentUserDep,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> XPHistoryPage:
    total_count = await session.scalar(
        select(func.count())
        .select_from(XPLedgerEntry)
        .where(XPLedgerEntry.user_id == current.user_id)
    )
    rows = (
        await session.scalars(
            select(XPLedgerEntry)
            .where(XPLedgerEntry.user_id == current.user_id)
            .order_by(desc(XPLedgerEntry.earned_at), desc(XPLedgerEntry.id))
            .limit(limit)
            .offset(offset)
        )
    ).all()
    items = [
        XPLedgerEntryResponse(
            id=row.id,
            user_id=row.user_id,
            xp_amount=row.xp_amount,
            source=row.source,  # type: ignore[arg-type]
            source_reference=row.source_reference,
            new_total=row.new_total,
            earned_at=row.earned_at,
        )
        for row in rows
    ]
    return XPHistoryPage(
        items=items,
        pagination=Pagination(limit=limit, offset=offset, total=int(total_count or 0)),
    )


@router.get("/users/me/medals", response_model=MedalListResponse)
async def get_medals(current: CurrentUserDep, session: SessionDep) -> MedalListResponse:
    return MedalListResponse(items=await active_medals(session, current.user_id))
