"""Photo & voice capture endpoints (D3/D4/D6), under `/v1/ai/capture`.

Each upload is *parsed* into a structured, unconfirmed result the user reviews.
Nothing is written until they confirm — `POST /ai/capture/confirm` records a
`logCapture` agent action (the auditable, undoable record) and forwards the
confirmed payload to its owning service. Estimates stay estimates; capture never
fabricates exact macros or sets (A8).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, UploadFile, status

from app import agent_actions, capture
from app.deps import (
    BearerTokenDep,
    CaptureProviderDep,
    CaptureWriterDep,
    CurrentUserDep,
    PublisherDep,
    SessionDep,
)
from app.enums import AgentActionStatus, AgentCapability
from app.errors import AppError
from app.schemas import (
    CaptureConfirmRequest,
    CaptureConfirmResponse,
    CaptureFoodResult,
    CaptureVoiceResult,
    CaptureWorkoutItem,
    CaptureWorkoutResult,
)

router = APIRouter(prefix="/v1", tags=["agent"])


@router.post("/ai/capture/workout", response_model=CaptureWorkoutResult)
async def capture_workout(
    current: CurrentUserDep,
    provider: CaptureProviderDep,
    image: Annotated[UploadFile, File()],
) -> CaptureWorkoutResult:
    parsed = capture.sanitize_workout(
        await provider.parse_workout(await image.read(), image.content_type or "")
    )
    return CaptureWorkoutResult(
        title=parsed.title,
        items=[
            CaptureWorkoutItem(name=i.name, detail=i.detail, note=i.note) for i in parsed.items
        ],
        note=parsed.note,
    )


@router.post("/ai/capture/meal", response_model=CaptureFoodResult)
async def capture_meal(
    current: CurrentUserDep,
    provider: CaptureProviderDep,
    image: Annotated[UploadFile, File()],
) -> CaptureFoodResult:
    parsed = capture.sanitize_meal(
        await provider.parse_meal(await image.read(), image.content_type or "")
    )
    return CaptureFoodResult(
        title=parsed.title, cal=parsed.cal, p=parsed.p, c=parsed.c, f=parsed.f, note=parsed.note
    )


@router.post("/ai/capture/voice", response_model=CaptureVoiceResult)
async def capture_voice(
    current: CurrentUserDep,
    provider: CaptureProviderDep,
    audio: Annotated[UploadFile, File()],
) -> CaptureVoiceResult:
    parsed = capture.sanitize_voice(
        await provider.parse_voice(await audio.read(), audio.content_type or "")
    )
    return CaptureVoiceResult(title=parsed.title, detail=parsed.detail, note=parsed.note)


@router.post(
    "/ai/capture/confirm",
    status_code=status.HTTP_201_CREATED,
    response_model=CaptureConfirmResponse,
)
async def confirm_capture(
    body: CaptureConfirmRequest,
    current: CurrentUserDep,
    session: SessionDep,
    publisher: PublisherDep,
    writer: CaptureWriterDep,
    token: BearerTokenDep,
) -> CaptureConfirmResponse:
    if body.kind == "workout" and body.workout is None:
        raise AppError(400, "validation_error", "workout payload is required for kind=workout.")
    if body.kind == "meal" and body.meal is None:
        raise AppError(400, "validation_error", "meal payload is required for kind=meal.")
    if body.kind not in ("workout", "meal", "voice"):
        raise AppError(400, "validation_error", f"Unknown capture kind '{body.kind}'.")

    action = await agent_actions.record_action(
        session,
        publisher,
        user_id=current.user_id,
        capability=AgentCapability.LOG_CAPTURE,
        type=f"capture:{body.kind}",
        summary=body.summary,
        reasoning="Logged from a capture you reviewed and confirmed.",
        cited_data=[c.model_dump() for c in body.cited_data],
    )
    # logCapture OFF → the capability is disabled; don't write either.
    if action is None:
        raise AppError(403, "capability_disabled", "Capture logging is turned off.")
    # The user explicitly confirmed, so move a proposed (ASK) action to done.
    if action.status == AgentActionStatus.PROPOSED.value:
        approved = await agent_actions.approve(session, publisher, current.user_id, action.id)
        action = approved or action

    written_id: str | None = None
    if body.kind == "workout" and body.workout is not None:
        written_id = await writer.write_workout(
            token=token,
            session_type=body.workout.session_type,
            duration_minutes=body.workout.duration_minutes,
            distance_km=body.workout.distance_km,
            notes=body.workout.notes,
        )
    elif body.kind == "meal" and body.meal is not None:
        written_id = await writer.write_meal(
            token=token,
            day=body.meal.date,
            targets_met=body.meal.targets_met,
            notes=body.meal.notes,
        )

    await session.commit()
    return CaptureConfirmResponse(action=action, written_id=written_id)
