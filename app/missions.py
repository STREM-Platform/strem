"""Mission domain logic: generation, lifecycle transitions, and reads.

Generation assembles context (identity + recent consistency), produces 1-3
structured missions, persists them, and publishes `ai.mission_generated`.
Completion publishes `ai.mission_completed` so strem-user-service awards
`mission_complete` XP. Every transition is recorded in mission state history.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.context import ContextBundle
from app.enums import MissionState
from app.errors import AppError
from app.events import EventPublisher
from app.generator import generate_missions
from app.models import AIResponseMetadata, BehavioralTriggerState, Mission, MissionStateChange
from app.schemas import Mission as MissionSchema
from app.schemas import MissionGenerationResult

GENERATOR_VERSION = "rule-based-1"


def _to_schema(mission: Mission) -> MissionSchema:
    return MissionSchema.model_validate(mission, from_attributes=True)


async def _active_count(session: AsyncSession, user_id: uuid.UUID) -> int:
    count = await session.scalar(
        select(func.count())
        .select_from(Mission)
        .where(Mission.user_id == user_id, Mission.state == MissionState.ACTIVE.value)
    )
    return int(count or 0)


async def _record_trigger(session: AsyncSession, user_id: uuid.UUID, when: datetime) -> None:
    trigger = await session.get(BehavioralTriggerState, user_id)
    if trigger is None:
        trigger = BehavioralTriggerState(user_id=user_id)
        session.add(trigger)
    trigger.last_generated_at = when


async def generate(
    session: AsyncSession,
    publisher: EventPublisher,
    *,
    user_id: uuid.UUID,
    bundle: ContextBundle | None,
) -> MissionGenerationResult:
    """Generate this week's missions for the user, or decline with a reason."""
    if bundle is None:
        return MissionGenerationResult(
            missions=[], generated_count=0, reason="insufficient_context"
        )
    if await _active_count(session, user_id) > 0:
        return MissionGenerationResult(
            missions=[], generated_count=0, reason="already_generated_this_period"
        )

    now = datetime.now(UTC)
    created: list[MissionSchema] = []
    for generated in generate_missions(bundle):
        mission = Mission(
            user_id=user_id,
            title=generated.title,
            description=generated.description,
            duration_days=generated.duration_days,
            xp_reward=generated.xp_reward,
            type=generated.type.value,
            completion_condition=generated.completion_condition,
            difficulty=generated.difficulty.value,
            state=MissionState.ACTIVE.value,
            generated_at=now,
            expires_at=now + timedelta(days=generated.duration_days),
        )
        session.add(mission)
        await session.flush()
        session.add(
            AIResponseMetadata(
                user_id=user_id,
                artifact="mission",
                reference_id=mission.id,
                generator_version=GENERATOR_VERSION,
            )
        )
        await publisher.publish(
            "ai.mission_generated",
            {
                "version": 1,
                "user_id": str(user_id),
                "mission_id": str(mission.id),
                "type": generated.type.value,
                "difficulty": generated.difficulty.value,
                "generated_at": now.isoformat(),
            },
        )
        created.append(_to_schema(mission))

    await _record_trigger(session, user_id, now)
    return MissionGenerationResult(missions=created, generated_count=len(created), reason=None)


async def _owned(session: AsyncSession, user_id: uuid.UUID, mission_id: uuid.UUID) -> Mission:
    mission = await session.get(Mission, mission_id)
    if mission is None or mission.user_id != user_id:
        raise AppError(404, "mission_not_found", "No mission with that id exists for this user.")
    return mission


async def _transition(
    session: AsyncSession,
    publisher: EventPublisher,
    *,
    user_id: uuid.UUID,
    mission_id: uuid.UUID,
    to_state: MissionState,
) -> MissionSchema:
    mission = await _owned(session, user_id, mission_id)
    if mission.state != MissionState.ACTIVE.value:
        raise AppError(409, "mission_not_active", "This mission is no longer active.")

    now = datetime.now(UTC)
    from_state = mission.state
    mission.state = to_state.value
    if to_state is MissionState.COMPLETED:
        mission.completed_at = now
    session.add(
        MissionStateChange(mission_id=mission.id, from_state=from_state, to_state=to_state.value)
    )
    await session.flush()

    if to_state is MissionState.COMPLETED:
        await publisher.publish(
            "ai.mission_completed",
            {
                "version": 1,
                "user_id": str(user_id),
                "mission_id": str(mission.id),
                "xp_reward": mission.xp_reward,
                "completed_at": now.isoformat(),
            },
        )
    return _to_schema(mission)


async def complete(
    session: AsyncSession, publisher: EventPublisher, *, user_id: uuid.UUID, mission_id: uuid.UUID
) -> MissionSchema:
    return await _transition(
        session, publisher, user_id=user_id, mission_id=mission_id, to_state=MissionState.COMPLETED
    )


async def skip(
    session: AsyncSession, publisher: EventPublisher, *, user_id: uuid.UUID, mission_id: uuid.UUID
) -> MissionSchema:
    return await _transition(
        session, publisher, user_id=user_id, mission_id=mission_id, to_state=MissionState.SKIPPED
    )


async def expire(
    session: AsyncSession, publisher: EventPublisher, *, user_id: uuid.UUID, mission_id: uuid.UUID
) -> MissionSchema:
    return await _transition(
        session, publisher, user_id=user_id, mission_id=mission_id, to_state=MissionState.EXPIRED
    )


async def list_active(session: AsyncSession, *, user_id: uuid.UUID) -> list[MissionSchema]:
    rows = (
        await session.scalars(
            select(Mission)
            .where(Mission.user_id == user_id, Mission.state == MissionState.ACTIVE.value)
            .order_by(asc(Mission.generated_at))
        )
    ).all()
    return [_to_schema(row) for row in rows]


async def list_history(
    session: AsyncSession, *, user_id: uuid.UUID, limit: int, offset: int
) -> tuple[list[MissionSchema], int]:
    total = await session.scalar(
        select(func.count()).select_from(Mission).where(Mission.user_id == user_id)
    )
    rows = (
        await session.scalars(
            select(Mission)
            .where(Mission.user_id == user_id)
            .order_by(desc(Mission.generated_at), desc(Mission.id))
            .limit(limit)
            .offset(offset)
        )
    ).all()
    return [_to_schema(row) for row in rows], int(total or 0)


async def get(session: AsyncSession, *, user_id: uuid.UUID, mission_id: uuid.UUID) -> MissionSchema:
    return _to_schema(await _owned(session, user_id, mission_id))
