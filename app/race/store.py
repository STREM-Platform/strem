"""The race team's own records: conversation, daily briefs, plan proposals.

These are AI outputs and the athlete's messages to the race team — not copies
of domain data. Each row is owned by one athlete and one mission.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import JSON, Date, DateTime, String, Text, UniqueConstraint, delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.db import Base


class RaceChatMessage(Base):
    __tablename__ = "race_chat_messages"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    mission_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)
    model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RaceBrief(Base):
    __tablename__ = "race_briefs"
    __table_args__ = (UniqueConstraint("mission_id", "day", name="uq_race_brief_day"),)
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    mission_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    day: Mapped[date] = mapped_column(Date)
    origin: Mapped[str] = mapped_column(String(16))
    model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    inputs_digest: Mapped[str] = mapped_column(String(64))
    content: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RaceProposal(Base):
    __tablename__ = "race_proposals"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    mission_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    status: Mapped[str] = mapped_column(String(16))
    origin: Mapped[str] = mapped_column(String(16))
    model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    plan_version: Mapped[int | None] = mapped_column(nullable=True)
    content: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


async def history(
    session: AsyncSession, user_id: uuid.UUID, mission_id: uuid.UUID, limit: int = 40
) -> list[RaceChatMessage]:
    rows = await session.scalars(
        select(RaceChatMessage)
        .where(RaceChatMessage.user_id == user_id, RaceChatMessage.mission_id == mission_id)
        .order_by(RaceChatMessage.created_at.desc())
        .limit(limit)
    )
    return list(reversed(list(rows)))


async def add_message(
    session: AsyncSession,
    user_id: uuid.UUID,
    mission_id: uuid.UUID,
    role: str,
    content: str,
    model: str | None = None,
    created_at: datetime | None = None,
) -> RaceChatMessage:
    row = RaceChatMessage(
        user_id=user_id,
        mission_id=mission_id,
        role=role,
        content=content,
        model=model,
        created_at=created_at or datetime.now(UTC),
    )
    session.add(row)
    await session.flush()
    return row


async def clear_history(session: AsyncSession, user_id: uuid.UUID, mission_id: uuid.UUID) -> None:
    await session.execute(
        delete(RaceChatMessage).where(
            RaceChatMessage.user_id == user_id, RaceChatMessage.mission_id == mission_id
        )
    )
    await session.commit()


async def cached_brief(
    session: AsyncSession, user_id: uuid.UUID, mission_id: uuid.UUID, day: date, digest: str
) -> RaceBrief | None:
    row: RaceBrief | None = await session.scalar(
        select(RaceBrief).where(
            RaceBrief.user_id == user_id, RaceBrief.mission_id == mission_id, RaceBrief.day == day
        )
    )
    if row is None or row.inputs_digest != digest:
        return None
    return row


async def save_brief(
    session: AsyncSession,
    user_id: uuid.UUID,
    mission_id: uuid.UUID,
    day: date,
    digest: str,
    origin: str,
    model: str | None,
    content: dict[str, Any],
) -> None:
    row = await session.scalar(
        select(RaceBrief).where(RaceBrief.mission_id == mission_id, RaceBrief.day == day)
    )
    if row is None:
        row = RaceBrief(user_id=user_id, mission_id=mission_id, day=day)
        session.add(row)
    elif row.user_id != user_id:
        return
    row.origin, row.model, row.inputs_digest, row.content = origin, model, digest, content
    row.created_at = datetime.now(UTC)
    await session.commit()


async def proposals(
    session: AsyncSession,
    user_id: uuid.UUID,
    mission_id: uuid.UUID,
    *,
    category: str | None = None,
    limit: int = 30,
) -> list[RaceProposal]:
    """Newest first. Category lives in the JSON content, so it is filtered here."""
    rows = await session.scalars(
        select(RaceProposal)
        .where(RaceProposal.user_id == user_id, RaceProposal.mission_id == mission_id)
        .order_by(RaceProposal.created_at.desc())
        .limit(limit)
    )
    return [r for r in rows if category is None or (r.content or {}).get("category") == category]
