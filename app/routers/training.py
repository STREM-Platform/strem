"""Training endpoints implementing contracts/training/openapi.yml (`/v1`)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.deps import CurrentUserDep, PrBaselineDep, PublisherDep, SessionDep
from app.schemas import (
    FinishSessionResponse,
    LogSetRequest,
    LogSetResponse,
    LogTrainingSessionRequest,
    NextTargetResponse,
    Pagination,
    PersonalRecordPage,
    PersonalRecordResponse,
    SessionType,
    TrainingSessionPage,
    TrainingSessionResponse,
    WorkoutSetResponse,
)
from app.sessions import create_session, get_session_by_id, list_sessions
from app.sets import finish_session, list_prs, log_set

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


@router.post(
    "/training/sessions/{session_id}/sets",
    status_code=status.HTTP_201_CREATED,
    response_model=LogSetResponse,
)
async def log_workout_set(
    session_id: uuid.UUID,
    body: LogSetRequest,
    current: CurrentUserDep,
    session: SessionDep,
) -> LogSetResponse:
    record, target = await log_set(
        session,
        user_id=current.user_id,
        session_id=session_id,
        exercise=body.exercise,
        set_index=body.set_index,
        reps=body.reps,
        kg=body.kg,
        rpe=body.rpe,
        base_rest_s=body.base_rest_s,
    )
    await session.commit()
    return LogSetResponse(
        set=WorkoutSetResponse.model_validate(record, from_attributes=True),
        next_target=NextTargetResponse(
            rest_s=target.rest_s, load_kg=target.load_kg, message=target.message
        ),
    )


@router.post(
    "/training/sessions/{session_id}/finish",
    response_model=FinishSessionResponse,
)
async def finish_workout_session(
    session_id: uuid.UUID,
    current: CurrentUserDep,
    session: SessionDep,
    publisher: PublisherDep,
    baseline: PrBaselineDep,
) -> FinishSessionResponse:
    prs = await finish_session(
        session,
        publisher,
        user_id=current.user_id,
        session_id=session_id,
        seed_baseline=baseline,
    )
    await session.commit()
    return FinishSessionResponse(
        prs_detected=[
            PersonalRecordResponse.model_validate(pr, from_attributes=True) for pr in prs
        ]
    )


@router.get("/training/prs", response_model=PersonalRecordPage)
async def list_personal_records(
    current: CurrentUserDep,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PersonalRecordPage:
    rows, total = await list_prs(
        session, user_id=current.user_id, limit=limit, offset=offset
    )
    return PersonalRecordPage(
        items=[
            PersonalRecordResponse.model_validate(r, from_attributes=True) for r in rows
        ],
        pagination=Pagination(limit=limit, offset=offset, total=total),
    )
