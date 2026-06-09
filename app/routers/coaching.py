"""Weekly coaching recap endpoints (contracts/ai/openapi.yml)."""

from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Query, status

from app import recap
from app.deps import (
    BearerTokenDep,
    ContextProviderDep,
    CurrentUserDep,
    PublisherDep,
    SessionDep,
)
from app.errors import AppError
from app.schemas import Pagination, WeeklyRecap, WeeklyRecapPage

router = APIRouter(prefix="/v1", tags=["coaching"])


@router.get("/ai/coach/recap", response_model=WeeklyRecap)
async def get_latest_recap(current: CurrentUserDep, session: SessionDep) -> WeeklyRecap:
    return await recap.get_latest(session, user_id=current.user_id)


@router.post(
    "/ai/coach/recap/generate",
    status_code=status.HTTP_201_CREATED,
    response_model=WeeklyRecap,
)
async def generate_recap(
    current: CurrentUserDep,
    session: SessionDep,
    publisher: PublisherDep,
    provider: ContextProviderDep,
    token: BearerTokenDep,
) -> WeeklyRecap:
    """Generate this week's recap on demand (the weekly worker does this on a
    schedule; this lets the demo and a returning user produce one immediately)."""
    bundle = await provider.for_user(str(current.user_id), token)
    if bundle is None:
        raise AppError(
            409,
            "insufficient_context",
            "Not enough context yet to generate a recap. Log an action first.",
        )
    today = date.today()
    week_start = today - timedelta(days=today.weekday())  # Monday of the current week
    week_end = week_start + timedelta(days=6)
    result = await recap.generate_weekly_recap(
        session,
        publisher,
        user_id=current.user_id,
        bundle=bundle,
        week_start=week_start,
        week_end=week_end,
    )
    await session.commit()
    return result


@router.get("/ai/coach/recaps", response_model=WeeklyRecapPage)
async def list_recaps(
    current: CurrentUserDep,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> WeeklyRecapPage:
    items, total = await recap.list_recaps(
        session, user_id=current.user_id, limit=limit, offset=offset
    )
    return WeeklyRecapPage(
        items=items, pagination=Pagination(limit=limit, offset=offset, total=total)
    )
