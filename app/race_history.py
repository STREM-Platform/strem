"""Persistence for the athlete's race history (previous races and results)."""

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import JSON, Date, DateTime, String, UniqueConstraint, delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.db import Base
from app.errors import AppError
from app.schemas.race_history import (
    ImportedRace,
    RaceImportResult,
    RaceResult,
    RaceResultInput,
)
from app.schemas.race_mission import RaceMission


class RaceResultRecord(Base):
    __tablename__ = "race_results"
    __table_args__ = (UniqueConstraint("user_id", "external_id", name="uq_race_result_external"),)
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    mission_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    source: Mapped[str] = mapped_column(String(16))
    external_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    race_date: Mapped[date] = mapped_column(Date)
    snapshot: Mapped[dict[str, object]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


def to_result(record: RaceResultRecord) -> RaceResult:
    return RaceResult.model_validate(
        {
            **record.snapshot,
            "id": record.id,
            "source": record.source,
            "mission_id": record.mission_id,
            "external_id": record.external_id,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
        }
    )


def _snapshot(body: RaceResultInput) -> dict[str, object]:
    return RaceResultInput.model_validate(
        body.model_dump(include=set(RaceResultInput.model_fields))
    ).model_dump(mode="json")


async def list_results(session: AsyncSession, user_id: uuid.UUID) -> list[RaceResult]:
    rows = await session.scalars(
        select(RaceResultRecord)
        .where(RaceResultRecord.user_id == user_id)
        .order_by(RaceResultRecord.race_date.desc(), RaceResultRecord.created_at.desc())
    )
    return [to_result(row) for row in rows]


async def _owned(
    session: AsyncSession, user_id: uuid.UUID, result_id: uuid.UUID
) -> RaceResultRecord:
    record = await session.scalar(
        select(RaceResultRecord).where(
            RaceResultRecord.id == result_id, RaceResultRecord.user_id == user_id
        )
    )
    if record is None:
        raise AppError(404, "race_not_found", "Race not found in your history.")
    return record


async def create_result(
    session: AsyncSession, user_id: uuid.UUID, body: RaceResultInput
) -> RaceResult:
    now = datetime.now(UTC)
    record = RaceResultRecord(
        user_id=user_id,
        source="athlete",
        race_date=body.race_date,
        snapshot=_snapshot(body),
        created_at=now,
        updated_at=now,
    )
    session.add(record)
    await session.commit()
    return to_result(record)


async def replace_result(
    session: AsyncSession, user_id: uuid.UUID, result_id: uuid.UUID, body: RaceResultInput
) -> RaceResult:
    record = await _owned(session, user_id, result_id)
    record.snapshot = _snapshot(body)
    record.race_date = body.race_date
    record.updated_at = datetime.now(UTC)
    await session.commit()
    return to_result(record)


async def delete_result(session: AsyncSession, user_id: uuid.UUID, result_id: uuid.UUID) -> None:
    record = await _owned(session, user_id, result_id)
    await session.delete(record)
    await session.commit()


async def import_results(
    session: AsyncSession, user_id: uuid.UUID, source: str, items: list[ImportedRace]
) -> RaceImportResult:
    """Idempotent bulk upsert keyed by the provider's activity id. An athlete's
    later edits to an imported race win over a re-import of the same activity."""
    now = datetime.now(UTC)
    created = updated = 0
    records: list[RaceResultRecord] = []
    for item in items:
        external_id = f"{source}:{item.external_id}"
        record = await session.scalar(
            select(RaceResultRecord).where(
                RaceResultRecord.user_id == user_id, RaceResultRecord.external_id == external_id
            )
        )
        if record is None:
            record = RaceResultRecord(
                user_id=user_id,
                source=source,
                external_id=external_id,
                race_date=item.race_date,
                snapshot=_snapshot(item),
                created_at=now,
                updated_at=now,
            )
            session.add(record)
            created += 1
        elif record.updated_at == record.created_at:
            record.snapshot = _snapshot(item)
            record.race_date = item.race_date
            updated += 1
        records.append(record)
    await session.commit()
    return RaceImportResult(
        created=created, updated=updated, items=[to_result(record) for record in records]
    )


async def record_mission_result(
    session: AsyncSession, user_id: uuid.UUID, mission: RaceMission
) -> None:
    """Add (or refresh) the history entry for a completed mission. Caller commits."""
    if mission.result is None:
        return
    event, result = mission.event, mission.result
    body = RaceResultInput(
        name=event.name,
        race_date=event.race_date,
        sport=event.sport,
        location_name=event.location_name,
        distance_km=event.distance_km,
        elevation_gain_m=event.elevation_gain_m,
        status=result.status,
        finish_minutes=result.finish_minutes,
        placement=result.placement,
        rating=result.rating,
        notes=result.notes,
        lessons=result.lessons,
    )
    now = datetime.now(UTC)
    record = await session.scalar(
        select(RaceResultRecord).where(
            RaceResultRecord.user_id == user_id, RaceResultRecord.mission_id == mission.id
        )
    )
    if record is None:
        session.add(
            RaceResultRecord(
                user_id=user_id,
                mission_id=mission.id,
                source="mission",
                race_date=event.race_date,
                snapshot=_snapshot(body),
                created_at=now,
                updated_at=now,
            )
        )
    else:
        record.snapshot = _snapshot(body)
        record.updated_at = now


async def delete_all_results(session: AsyncSession, user_id: uuid.UUID) -> None:
    await session.execute(delete(RaceResultRecord).where(RaceResultRecord.user_id == user_id))
    await session.commit()
