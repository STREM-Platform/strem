"""AI tribe-summary endpoint: narrative over the community weekly read (MVP-16)."""

from fastapi import APIRouter

from app.deps import BearerTokenDep, CurrentUserDep, TribeSummaryProviderDep
from app.errors import AppError
from app.schemas import TribeCoachSummary
from app.tribe_coach import compose_tribe_narrative

router = APIRouter(prefix="/v1", tags=["coaching"])


@router.get("/ai/coach/tribe-summary", response_model=TribeCoachSummary)
async def get_tribe_summary(
    current: CurrentUserDep,
    provider: TribeSummaryProviderDep,
    token: BearerTokenDep,
) -> TribeCoachSummary:
    """An identity-grounded narrative over the caller's tribe's week."""
    summary = await provider.for_user(token)
    if summary is None:
        raise AppError(404, "no_tribe", "You are not in a tribe yet.")
    return TribeCoachSummary(
        tribe_id=summary["tribe_id"],
        name=summary["name"],
        narrative=compose_tribe_narrative(summary),
        tribe_power=summary["tribe_power"],
        checkins_this_week=summary["checkins_this_week"],
        active_member_count=summary["active_member_count"],
        inactive_member_count=len(summary.get("inactive_members", [])),
    )
