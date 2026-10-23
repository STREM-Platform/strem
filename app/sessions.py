"""Training-session domain logic: persistence and event publishing."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import AppError
from app.events import EventPublisher
from app.models import TrainingSession
from app.schemas import DISTANCE_TYPES, LogTrainingSessionRequest, SessionType


async def create_session(
    session: AsyncSession,
    publisher: EventPublisher,
    *,
    user_id: uuid.UUID,
    body: LogTrainingSessionRequest,
) -> TrainingSession:
    """Persist a training session and publish `training.session_logged`."""
    if body.distance_km is not None and body.session_type not in DISTANCE_TYPES:
        raise AppError(
            422,
            "unprocessable_entity",
            "distance_km is only valid for distance sports (run, ride, swim, hike, row, ski).",
        )

    logged_at = body.logged_at or datetime.now(UTC)
    record = TrainingSession(
        user_id=user_id,
        session_type=body.session_type.value,
        duration_minutes=body.duration_minutes,
        distance_km=body.distance_km,
        elevation_m=body.elevation_m,
        notes=body.notes,
        title=body.title,
        avg_hr=body.avg_hr,
        is_race=body.is_race,
        logged_at=logged_at,
    )
    session.add(record)
    await session.flush()

    await publisher.publish(
        "training.session_logged",
        {
            "version": 1,
            "user_id": str(user_id),
            "session_type": body.session_type.value,
            "duration_minutes": body.duration_minutes,
            "logged_at": logged_at.isoformat(),
        },
    )
    return record


async def list_sessions(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    limit: int,
    offset: int,
    session_type: SessionType | None,
    since: datetime | None = None,
    until: datetime | None = None,
    races_only: bool = False,
) -> tuple[list[TrainingSession], int]:
    """Return a page of the user's sessions (newest first) and the total count."""
    filters = [TrainingSession.user_id == user_id]
    if session_type is not None:
        filters.append(TrainingSession.session_type == session_type.value)
    if since is not None:
        filters.append(TrainingSession.logged_at >= since)
    if until is not None:
        filters.append(TrainingSession.logged_at < until)
    if races_only:
        filters.append(TrainingSession.is_race.is_(True))

    total = await session.scalar(
        select(func.count()).select_from(TrainingSession).where(*filters)
    )
    rows = (
        await session.scalars(
            select(TrainingSession)
            .where(*filters)
            .order_by(desc(TrainingSession.logged_at), desc(TrainingSession.id))
            .limit(limit)
            .offset(offset)
        )
    ).all()
    return list(rows), int(total or 0)


async def get_session_by_id(
    session: AsyncSession, *, user_id: uuid.UUID, session_id: uuid.UUID
) -> TrainingSession:
    """Return one of the user's sessions or raise 404."""
    record = await session.get(TrainingSession, session_id)
    if record is None or record.user_id != user_id:
        raise AppError(
            404, "session_not_found", "No training session with that id exists for this user."
        )
    return record
