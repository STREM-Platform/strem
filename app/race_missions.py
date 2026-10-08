"""Durable athlete-owned missions, concurrency and transaction receipts (#24)."""

import hashlib
import json
import re
import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    delete,
    select,
    text,
    update,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.db import Base
from app.errors import AppError
from app.schemas.race_mission import RaceMission


class MissionRecord(Base):
    __tablename__ = "race_missions"
    __table_args__ = (
        Index(
            "uq_race_missions_active_user",
            "user_id",
            unique=True,
            postgresql_where=text("state = 'active'"),
            sqlite_where=text("state = 'active'"),
        ),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    state: Mapped[str] = mapped_column(String(16))
    version: Mapped[int] = mapped_column(Integer)
    snapshot: Mapped[dict[str, object]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class MissionRevisionRecord(Base):
    __tablename__ = "race_mission_revisions"
    __table_args__ = (UniqueConstraint("mission_id", "version", name="uq_mission_revision"),)
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    mission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("race_missions.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    version: Mapped[int] = mapped_column(Integer)
    snapshot: Mapped[dict[str, object]] = mapped_column(JSON)
    reason: Mapped[str] = mapped_column(String(500))


class MissionReceipt(Base):
    __tablename__ = "race_mission_receipts"
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    fingerprint: Mapped[str] = mapped_column(String(64))
    snapshot: Mapped[dict[str, object]] = mapped_column(JSON)


def version_from_header(value: str) -> int:
    if not re.fullmatch(r'"[1-9][0-9]{0,9}"', value):
        raise AppError(400, "invalid_if_match", 'If-Match must be a quoted version, e.g. "1".')
    return int(value[1:-1])


def fingerprint(operation: str, payload: dict[str, object]) -> str:
    return hashlib.sha256(
        json.dumps([operation, payload], sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


async def replay(
    session: AsyncSession, user_id: uuid.UUID, key: str, digest: str
) -> RaceMission | None:
    receipt = await session.get(MissionReceipt, (user_id, key))
    if receipt is None:
        return None
    if receipt.fingerprint != digest:
        raise AppError(
            409, "idempotency_key_reused", "Use a new request key for a different operation."
        )
    return RaceMission.model_validate(receipt.snapshot)


async def owned(session: AsyncSession, user_id: uuid.UUID, mission_id: uuid.UUID) -> MissionRecord:
    record = await session.scalar(
        select(MissionRecord).where(
            MissionRecord.id == mission_id, MissionRecord.user_id == user_id
        )
    )
    if record is None:
        raise AppError(404, "mission_not_found", "Race Mission not found.")
    return record


def add_revision(
    session: AsyncSession, user_id: uuid.UUID, mission: RaceMission, reason: str
) -> None:
    session.add(
        MissionRevisionRecord(
            mission_id=mission.id,
            user_id=user_id,
            version=mission.version,
            snapshot=mission.model_dump(mode="json"),
            reason=reason,
        )
    )


async def create(
    session: AsyncSession, user_id: uuid.UUID, payload: dict[str, object], key: str
) -> RaceMission:
    digest = fingerprint("create", payload)
    previous = await replay(session, user_id, key, digest)
    if previous:
        return previous
    now = datetime.now(UTC)
    mission = RaceMission.model_validate(
        {
            **payload,
            "id": uuid.uuid4(),
            "state": "active",
            "version": 1,
            "created_at": now,
            "updated_at": now,
        }
    )
    snapshot = mission.model_dump(mode="json")
    session.add(
        MissionRecord(
            id=mission.id,
            user_id=user_id,
            state="active",
            version=1,
            snapshot=snapshot,
            created_at=now,
        )
    )
    try:
        await session.flush()
        add_revision(session, user_id, mission, "Mission created by athlete")
        session.add(MissionReceipt(user_id=user_id, key=key, fingerprint=digest, snapshot=snapshot))
        await session.commit()
    except IntegrityError:
        await session.rollback()
        previous = await replay(session, user_id, key, digest)
        if previous:
            return previous
        raise AppError(
            409, "active_mission_exists", "Archive the current mission before creating another."
        ) from None
    return mission


async def change(
    session: AsyncSession,
    user_id: uuid.UUID,
    mission_id: uuid.UUID,
    expected: int,
    changes: dict[str, object],
    reason: str,
    key: str | None = None,
) -> RaceMission:
    digest = fingerprint(f"archive/{mission_id}", {"version": expected, "reason": reason})
    if key:
        previous = await replay(session, user_id, key, digest)
        if previous:
            return previous
    record = await owned(session, user_id, mission_id)
    if record.version != expected:
        raise AppError(412, "version_conflict", "This mission changed. Reload before editing.")
    if record.state != "active":
        raise AppError(409, "mission_archived", "Archived missions cannot be edited.")
    mission = RaceMission.model_validate(
        {**record.snapshot, **changes, "version": expected + 1, "updated_at": datetime.now(UTC)}
    )
    snapshot = mission.model_dump(mode="json")
    result = await session.execute(
        update(MissionRecord)
        .where(
            MissionRecord.id == mission_id,
            MissionRecord.user_id == user_id,
            MissionRecord.version == expected,
            MissionRecord.state == "active",
        )
        .values(snapshot=snapshot, version=mission.version, state=mission.state)
        .returning(MissionRecord.id)
    )
    if result.scalar_one_or_none() is None:
        await session.rollback()
        if key:
            previous = await replay(session, user_id, key, digest)
            if previous:
                return previous
        raise AppError(412, "version_conflict", "This mission changed. Reload before editing.")
    add_revision(session, user_id, mission, reason)
    if key:
        session.add(MissionReceipt(user_id=user_id, key=key, fingerprint=digest, snapshot=snapshot))
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        if key:
            previous = await replay(session, user_id, key, digest)
            if previous:
                return previous
        raise AppError(409, "write_conflict", "Concurrent change. Reload and retry.") from None
    return mission


async def delete_owned_data(session: AsyncSession, user_id: uuid.UUID) -> None:
    # Explicit ordering also works with foreign-key enforcement on SQLite.
    for model in (MissionReceipt, MissionRevisionRecord, MissionRecord):
        await session.execute(delete(model).where(model.user_id == user_id))
    await session.commit()
