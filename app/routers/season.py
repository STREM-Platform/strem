"""Seasonal arc read endpoint (P2-03)."""

from datetime import UTC, datetime

from fastapi import APIRouter

from app import seasons
from app.deps import CurrentUserDep
from app.schemas import SeasonStatus

router = APIRouter(prefix="/v1", tags=["seasons"])


@router.get("/ai/season/current", response_model=SeasonStatus)
async def get_current_season(current: CurrentUserDep) -> SeasonStatus:
    """The season currently running (or an inactive off-season status)."""
    return seasons.resolve_active(datetime.now(UTC).date())
