"""Seasons: named blocks of the athlete's year, each with its own plan (issue #18).

A season (e.g. "Winter base", Nov–Feb; "Summer race season", Mar–Sep) has a
focus and optionally a plan — imported or built by the race team. On the
athlete's timeline a week follows, in order: the governing race plan, the plan
of the season it falls in, then the athlete's base plan. Seasons never overlap.
"""

from __future__ import annotations

import datetime as dt
import uuid
from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator
from sqlalchemy import JSON, Date, DateTime, Integer, String, delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.athlete_plan import BasePlanContent
from app.courses import lock_owner
from app.db import Base
from app.errors import AppError
from app.plan_schemas import Origin, SessionPatch, StrictModel

Focus = Literal["base", "build", "race_season", "off_season", "recovery"]
MAX_DAYS = 400


class SeasonRecord(Base):
    __tablename__ = "athlete_seasons"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    name: Mapped[str] = mapped_column(String(80))
    start_date: Mapped[dt.date] = mapped_column(Date)
    end_date: Mapped[dt.date] = mapped_column(Date)
    focus: Mapped[str] = mapped_column(String(16))
    notes: Mapped[str | None] = mapped_column(String(600), nullable=True)
    plan_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    plan_origin: Mapped[str | None] = mapped_column(String(16), nullable=True)
    plan_model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    plan_content: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SeasonInput(StrictModel):
    name: str = Field(min_length=1, max_length=80)
    start_date: dt.date
    end_date: dt.date
    focus: Focus
    notes: str | None = Field(default=None, max_length=600)

    @model_validator(mode="after")
    def coherent(self) -> SeasonInput:
        if self.end_date < self.start_date:
            raise ValueError("A season ends after it starts")
        if (self.end_date - self.start_date).days > MAX_DAYS:
            raise ValueError("Keep a season under 400 days")
        return self


class SeasonPlanWrite(StrictModel):
    content: BasePlanContent
    origin: Origin
    model: str | None = Field(default=None, max_length=80)


class Season(BaseModel):
    id: uuid.UUID
    name: str
    start_date: dt.date
    end_date: dt.date
    focus: Focus
    notes: str | None = None
    plan_version: int | None = None
    plan_origin: Origin | None = None
    plan_model: str | None = None
    plan: BasePlanContent | None = None
    created_at: dt.datetime
    updated_at: dt.datetime


def to_season(record: SeasonRecord) -> Season:
    return Season.model_validate(
        {
            "id": record.id,
            "name": record.name,
            "start_date": record.start_date,
            "end_date": record.end_date,
            "focus": record.focus,
            "notes": record.notes,
            "plan_version": record.plan_version,
            "plan_origin": record.plan_origin,
            "plan_model": record.plan_model,
            "plan": record.plan_content,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
        }
    )


async def list_seasons(session: AsyncSession, user_id: uuid.UUID) -> list[Season]:
    rows = await session.scalars(
        select(SeasonRecord)
        .where(SeasonRecord.user_id == user_id)
        .order_by(SeasonRecord.start_date)
    )
    return [to_season(r) for r in rows]


async def _owned(session: AsyncSession, user_id: uuid.UUID, season_id: uuid.UUID) -> SeasonRecord:
    record = await session.get(SeasonRecord, season_id)
    if record is None or record.user_id != user_id:
        raise AppError(404, "season_not_found", "Season not found.")
    return record


async def _check_overlap(
    session: AsyncSession, user_id: uuid.UUID, body: SeasonInput, skip: uuid.UUID | None
) -> None:
    for other in await list_seasons(session, user_id):
        if (
            other.id != skip
            and body.start_date <= other.end_date
            and other.start_date <= body.end_date
        ):
            raise AppError(
                409, "season_overlap", f"This overlaps “{other.name}”. Seasons can't overlap."
            )


async def create(session: AsyncSession, user_id: uuid.UUID, body: SeasonInput) -> Season:
    await lock_owner(session, user_id)
    await _check_overlap(session, user_id, body, None)
    now = datetime.now(UTC)
    record = SeasonRecord(user_id=user_id, **body.model_dump(), created_at=now, updated_at=now)
    session.add(record)
    await session.commit()
    return to_season(record)


async def update(
    session: AsyncSession, user_id: uuid.UUID, season_id: uuid.UUID, body: SeasonInput
) -> Season:
    await lock_owner(session, user_id)
    record = await _owned(session, user_id, season_id)
    await _check_overlap(session, user_id, body, season_id)
    for key, value in body.model_dump().items():
        setattr(record, key, value)
    record.updated_at = datetime.now(UTC)
    await session.commit()
    return to_season(record)


async def remove(session: AsyncSession, user_id: uuid.UUID, season_id: uuid.UUID) -> None:
    await lock_owner(session, user_id)
    record = await _owned(session, user_id, season_id)
    await session.delete(record)
    await session.commit()


async def put_plan(
    session: AsyncSession, user_id: uuid.UUID, season_id: uuid.UUID, body: SeasonPlanWrite
) -> Season:
    from app.plans import preserve_athlete_state

    await lock_owner(session, user_id)
    record = await _owned(session, user_id, season_id)
    content = (
        preserve_athlete_state(record.plan_content, body.content)
        if record.plan_content
        else body.content.model_dump(mode="json")
    )
    record.plan_content = content
    record.plan_version = (record.plan_version or 0) + 1
    record.plan_origin, record.plan_model = body.origin, body.model
    record.updated_at = datetime.now(UTC)
    await session.commit()
    return to_season(record)


async def delete_plan(session: AsyncSession, user_id: uuid.UUID, season_id: uuid.UUID) -> Season:
    await lock_owner(session, user_id)
    record = await _owned(session, user_id, season_id)
    record.plan_content = record.plan_version = record.plan_origin = record.plan_model = None
    record.updated_at = datetime.now(UTC)
    await session.commit()
    return to_season(record)


async def patch_session(
    session: AsyncSession, user_id: uuid.UUID, short: str, session_id: str, body: SessionPatch
) -> None:
    from app.plans import apply_session_patch

    await lock_owner(session, user_id)
    owners = [s for s in await list_seasons(session, user_id) if s.id.hex.startswith(short)]
    if len(owners) != 1 or owners[0].plan is None:
        raise AppError(404, "plan_session_not_found", "That session is not part of your plan.")
    record = await _owned(session, user_id, owners[0].id)
    content = apply_session_patch(dict(record.plan_content or {}), session_id, body)
    record.plan_content = BasePlanContent.model_validate(content).model_dump(mode="json")
    record.plan_version = (record.plan_version or 0) + 1
    record.updated_at = datetime.now(UTC)
    await session.commit()


async def purge(session: AsyncSession, user_id: uuid.UUID) -> None:
    await session.execute(delete(SeasonRecord).where(SeasonRecord.user_id == user_id))
