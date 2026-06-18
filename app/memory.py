"""Long-term agent memory store (A5).

Persistence for stated preferences / injuries the coach should never re-ask. The
only new domain state the orchestrator owns beyond missions/recaps; it still
copies no raw training/nutrition logs.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AgentMemory
from app.schemas import MemoryItem


async def list_items(session: AsyncSession, user_id: uuid.UUID) -> list[MemoryItem]:
    """Non-archived memories, newest first."""
    result = await session.execute(
        select(AgentMemory)
        .where(AgentMemory.user_id == user_id, AgentMemory.archived_at.is_(None))
        .order_by(AgentMemory.created_at.desc())
    )
    return [MemoryItem(icon=row.icon, text=row.text) for row in result.scalars()]


async def create_item(
    session: AsyncSession, user_id: uuid.UUID, *, icon: str, text: str, source: str = "user"
) -> MemoryItem:
    row = AgentMemory(user_id=user_id, icon=icon, text=text, source=source)
    session.add(row)
    await session.flush()
    return MemoryItem(icon=row.icon, text=row.text)


async def archive_item(session: AsyncSession, user_id: uuid.UUID, memory_id: uuid.UUID) -> bool:
    """Soft-delete a memory the user revokes. Returns False if not found."""
    result = await session.execute(
        select(AgentMemory).where(
            AgentMemory.id == memory_id,
            AgentMemory.user_id == user_id,
            AgentMemory.archived_at.is_(None),
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        return False
    row.archived_at = datetime.now(UTC)
    await session.flush()
    return True
