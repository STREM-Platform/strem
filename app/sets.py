"""Live-workout domain logic: set persistence, autoregulation, and PR detection.

Sets are additive to the whole-session record. Logging a set returns the
autoregulated next-set target. Finishing a session scans its sets, and for any
exercise whose best effort beats recorded history (by estimated 1RM) records a
`PersonalRecord` and publishes `training.pr_detected`. PRs are never fabricated.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.autoregulation import NextTarget, autoregulate, estimated_1rm, is_pr
from app.errors import AppError
from app.events import EventPublisher
from app.models import PersonalRecord, TrainingSession, WorkoutSet


async def _owned_session(
    session: AsyncSession, *, user_id: uuid.UUID, session_id: uuid.UUID
) -> TrainingSession:
    record = await session.get(TrainingSession, session_id)
    if record is None or record.user_id != user_id:
        raise AppError(
            404, "session_not_found", "No training session with that id exists for this user."
        )
    return record


async def log_set(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    exercise: str,
    set_index: int,
    reps: int,
    kg: float,
    rpe: int | None,
    base_rest_s: int,
) -> tuple[WorkoutSet, NextTarget]:
    """Persist one set and return it with the autoregulated next-set target."""
    await _owned_session(session, user_id=user_id, session_id=session_id)
    target = autoregulate(rpe, base_rest_s=base_rest_s, base_load_kg=kg)
    record = WorkoutSet(
        session_id=session_id,
        user_id=user_id,
        exercise=exercise,
        set_index=set_index,
        reps=reps,
        kg=kg,
        rpe=rpe,
        rest_s=target.rest_s,
    )
    session.add(record)
    await session.flush()
    return record, target


async def _best_set_per_exercise(
    session: AsyncSession, session_id: uuid.UUID
) -> dict[str, WorkoutSet]:
    rows = (
        await session.scalars(
            select(WorkoutSet).where(WorkoutSet.session_id == session_id)
        )
    ).all()
    best: dict[str, WorkoutSet] = {}
    for s in rows:
        current = best.get(s.exercise)
        if current is None or estimated_1rm(s.reps, s.kg) > estimated_1rm(
            current.reps, current.kg
        ):
            best[s.exercise] = s
    return best


async def finish_session(
    session: AsyncSession,
    publisher: EventPublisher,
    *,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
) -> list[PersonalRecord]:
    """Detect PRs across the session's sets, persist them, and publish events."""
    await _owned_session(session, user_id=user_id, session_id=session_id)
    best = await _best_set_per_exercise(session, session_id)

    detected: list[PersonalRecord] = []
    for exercise, best_set in best.items():
        candidate = estimated_1rm(best_set.reps, best_set.kg)
        prior = await session.scalar(
            select(PersonalRecord).where(
                PersonalRecord.user_id == user_id, PersonalRecord.exercise == exercise
            )
        )
        prior_best = prior.estimated_1rm if prior is not None else None
        if not is_pr(candidate, prior_best):
            continue

        achieved_at = datetime.now(UTC)
        if prior is None:
            pr = PersonalRecord(
                user_id=user_id,
                exercise=exercise,
                reps=best_set.reps,
                kg=best_set.kg,
                estimated_1rm=candidate,
                session_id=session_id,
                achieved_at=achieved_at,
            )
            session.add(pr)
        else:
            prior.reps = best_set.reps
            prior.kg = best_set.kg
            prior.estimated_1rm = candidate
            prior.session_id = session_id
            prior.achieved_at = achieved_at
            pr = prior
        await session.flush()
        detected.append(pr)

        await publisher.publish(
            "training.pr_detected",
            {
                "version": 1,
                "user_id": str(user_id),
                "exercise": exercise,
                "reps": best_set.reps,
                "kg": best_set.kg,
                "estimated_1rm": candidate,
                "session_id": str(session_id),
                "achieved_at": achieved_at.isoformat(),
            },
        )
    return detected


async def list_prs(
    session: AsyncSession, *, user_id: uuid.UUID, limit: int, offset: int
) -> tuple[list[PersonalRecord], int]:
    """Return a page of the user's personal records, most recent first."""
    where = PersonalRecord.user_id == user_id
    total = await session.scalar(
        select(func.count()).select_from(PersonalRecord).where(where)
    )
    rows = (
        await session.scalars(
            select(PersonalRecord)
            .where(where)
            .order_by(desc(PersonalRecord.achieved_at), desc(PersonalRecord.id))
            .limit(limit)
            .offset(offset)
        )
    ).all()
    return list(rows), int(total or 0)
