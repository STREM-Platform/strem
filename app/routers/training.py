"""Training endpoints implementing contracts/training/openapi.yml (`/v1`)."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.deps import CurrentUserDep, SessionDep
from app.schemas import (
    LogTrainingSessionRequest,
    Pagination,
    SessionType,
    TrainingSessionPage,
    TrainingSessionResponse,
)
from app.sessions import create_session, list_sessions

router = APIRouter(prefix="/v1", tags=["training"])


@router.post(
    "/training/sessions",
    status_code=status.HTTP_201_CREATED,
    response_model=TrainingSessionResponse,
)
async def log_training_session(
    body: LogTrainingSessionRequest,
    current: CurrentUserDep,
    session: SessionDep,
) -> TrainingSessionResponse:
    record = await create_session(session, user_id=current.user_id, body=body)
    await session.commit()
    return TrainingSessionResponse.model_validate(record, from_attributes=True)


@router.get("/training/sessions", response_model=TrainingSessionPage)
async def list_training_sessions(
    current: CurrentUserDep,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=500)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    session_type: SessionType | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    races_only: bool = False,
) -> TrainingSessionPage:
    rows, total = await list_sessions(
        session,
        user_id=current.user_id,
        limit=limit,
        offset=offset,
        session_type=session_type,
        since=since,
        until=until,
        races_only=races_only,
    )
    return TrainingSessionPage(
        items=[TrainingSessionResponse.model_validate(r, from_attributes=True) for r in rows],
        pagination=Pagination(limit=limit, offset=offset, total=total),
    )
