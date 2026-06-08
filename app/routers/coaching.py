"""Weekly coaching recap read endpoints (contracts/ai/openapi.yml)."""

from typing import Annotated

from fastapi import APIRouter, Query

from app import recap
from app.deps import CurrentUserDep, SessionDep
from app.schemas import Pagination, WeeklyRecap, WeeklyRecapPage

router = APIRouter(prefix="/v1", tags=["coaching"])


@router.get("/ai/coach/recap", response_model=WeeklyRecap)
async def get_latest_recap(current: CurrentUserDep, session: SessionDep) -> WeeklyRecap:
    return await recap.get_latest(session, user_id=current.user_id)


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
