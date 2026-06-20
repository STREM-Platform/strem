"""Agent action log + lifecycle (B3).

Every autonomous (or proposed) thing Forge does is recorded here with its
reasoning, the data it cited, and an undo. Autonomy gates whether an action runs
immediately (AUTO → ``done``), waits for the user (ASK → ``proposed``), or is
suppressed (OFF → not recorded). Each transition publishes ``ai.agent_action``.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import DEFAULT_AUTONOMY, AgentActionStatus, AgentCapability, AutonomyLevel
from app.events import EventPublisher
from app.models import AgentAction
from app.schemas import AgentActionOut, CitedDatum

STREAM = "ai.agent_action"


def _clip(value: str, limit: int) -> str:
    """Keep agent-written text within its column so an over-long LLM value can
    never crash the insert (and the whole chat turn)."""
    return value if len(value) <= limit else value[: limit - 1].rstrip() + "…"


def autonomy_for(capability: AgentCapability) -> AutonomyLevel:
    """The effective autonomy for a capability. TODO(A7 #54): read user overrides
    from strem-user-service; until then the roadmap defaults apply."""
    return DEFAULT_AUTONOMY.get(capability, AutonomyLevel.ASK)


def _to_out(row: AgentAction) -> AgentActionOut:
    return AgentActionOut(
        id=row.id,
        capability=row.capability,
        type=row.type,
        summary=row.summary,
        reasoning=row.reasoning,
        cited_data=[CitedDatum(**c) for c in (row.cited_data or [])],
        status=AgentActionStatus(row.status),
        autonomy=AutonomyLevel(row.autonomy),
        created_at=row.created_at,
    )


async def record_action(
    session: AsyncSession,
    publisher: EventPublisher,
    *,
    user_id: uuid.UUID,
    capability: AgentCapability,
    type: str,
    summary: str,
    reasoning: str,
    cited_data: list[dict[str, str]] | None = None,
    undo_payload: dict[str, Any] | None = None,
) -> AgentActionOut | None:
    """Record an action, gated by the capability's autonomy.

    AUTO → persisted as ``done`` (already taken). ASK → ``proposed`` (awaits
    approval). OFF → not recorded (returns ``None``).
    """
    level = autonomy_for(capability)
    if level is AutonomyLevel.OFF:
        return None
    status = AgentActionStatus.DONE if level is AutonomyLevel.AUTO else AgentActionStatus.PROPOSED
    row = AgentAction(
        user_id=user_id,
        capability=capability.value,
        type=_clip(type, 80),
        summary=_clip(summary, 500),
        reasoning=_clip(reasoning, 1000),
        cited_data=cited_data or [],
        status=status.value,
        autonomy=level.value,
        undo_payload=undo_payload,
    )
    session.add(row)
    await session.flush()
    await publisher.publish(
        STREAM, {"user_id": str(user_id), "action_id": str(row.id), "status": status.value}
    )
    return _to_out(row)


async def list_actions(
    session: AsyncSession, user_id: uuid.UUID, *, limit: int, offset: int
) -> tuple[list[AgentActionOut], int]:
    total = await session.scalar(
        select(func.count()).select_from(AgentAction).where(AgentAction.user_id == user_id)
    )
    result = await session.execute(
        select(AgentAction)
        .where(AgentAction.user_id == user_id)
        .order_by(AgentAction.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return [_to_out(r) for r in result.scalars()], int(total or 0)


async def _get(
    session: AsyncSession, user_id: uuid.UUID, action_id: uuid.UUID
) -> AgentAction | None:
    result = await session.execute(
        select(AgentAction).where(AgentAction.id == action_id, AgentAction.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def approve(
    session: AsyncSession, publisher: EventPublisher, user_id: uuid.UUID, action_id: uuid.UUID
) -> AgentActionOut | None:
    """Approve a proposed (ASK) action → ``done``."""
    row = await _get(session, user_id, action_id)
    if row is None or row.status != AgentActionStatus.PROPOSED.value:
        return None
    row.status = AgentActionStatus.DONE.value
    await session.flush()
    await publisher.publish(
        STREAM, {"user_id": str(user_id), "action_id": str(row.id), "status": "done"}
    )
    return _to_out(row)


async def undo(
    session: AsyncSession, publisher: EventPublisher, user_id: uuid.UUID, action_id: uuid.UUID
) -> AgentActionOut | None:
    """Reverse a done/proposed action → ``undone`` (the reversibility guarantee)."""
    row = await _get(session, user_id, action_id)
    if row is None or row.status == AgentActionStatus.UNDONE.value:
        return None
    row.status = AgentActionStatus.UNDONE.value
    await session.flush()
    await publisher.publish(
        STREAM, {"user_id": str(user_id), "action_id": str(row.id), "status": "undone"}
    )
    return _to_out(row)
