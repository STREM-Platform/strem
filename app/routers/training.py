"""Training endpoints implementing contracts/training/openapi.yml (`/v1`)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.deps import CurrentUserDep, PublisherDep, SessionDep
from app.schemas import (
    LogTrainingSessionRequest,
    Pagination,
    SessionType,
    TrainingSessionPage,
    TrainingSessionResponse,
)
from app.sessions import create_session, get_session_by_id, list_sessions

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
    publisher: PublisherDep,
) -> TrainingSessionResponse:
    record = await create_session(session, publisher, user_id=current.user_id, body=body)
    await session.commit()
    return TrainingSessionResponse.model_validate(record, from_attributes=True)


@router.get("/training/sessions", response_model=TrainingSessionPage)
async def list_training_sessions(
    current: CurrentUserDep,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    session_type: SessionType | None = None,
) -> TrainingSessionPage:
    rows, total = await list_sessions(
        session,
        user_id=current.user_id,
        limit=limit,
        offset=offset,
        session_type=session_type,
    )
    return TrainingSessionPage(
        items=[TrainingSessionResponse.model_validate(r, from_attributes=True) for r in rows],
        pagination=Pagination(limit=limit, offset=offset, total=total),
    )


@router.get("/training/sessions/{session_id}", response_model=TrainingSessionResponse)
async def get_training_session(
    session_id: uuid.UUID,
    current: CurrentUserDep,
    session: SessionDep,
) -> TrainingSessionResponse:
    record = await get_session_by_id(session, user_id=current.user_id, session_id=session_id)
    return TrainingSessionResponse.model_validate(record, from_attributes=True)
