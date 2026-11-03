"""Durable athlete-owned missions, concurrency and transaction receipts (#24).

An athlete may prepare for several races at once (an A race plus tune-ups, or a
season of challenges); `focus()` picks the one the home screen leads with.
"""

import hashlib
import json
import re
import uuid
from datetime import UTC, date, datetime

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    delete,
    func,
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

MAX_ACTIVE_MISSIONS = 12


class MissionRecord(Base):
    __tablename__ = "race_missions"
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


class MissionLayerRecord(Base):
    """One operational layer (fuel, gear, logistics, strategy) of a mission."""

    __tablename__ = "mission_layers"
    __table_args__ = (UniqueConstraint("mission_id", "kind", name="uq_mission_layer_kind"),)
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    mission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("race_missions.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    kind: Mapped[str] = mapped_column(String(16))
    version: Mapped[int] = mapped_column(Integer)
    origin: Mapped[str] = mapped_column(String(16))
    model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    inputs_digest: Mapped[str | None] = mapped_column(String(64), nullable=True)
    content: Mapped[dict[str, object]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


# Deletion order respects foreign keys (layers and revisions reference missions).
MISSION_SCOPED_MODELS: tuple[type[Base], ...] = (
    MissionReceipt,
    MissionLayerRecord,
    MissionRevisionRecord,
    MissionRecord,
)


async def lock_account(session: AsyncSession, user_id: uuid.UUID) -> None:
    """Serialize mission writes/exports for one owner until transaction end.

    Row locks cannot cover an account with no mission yet. A namespaced PostgreSQL
    transaction advisory lock covers that case and prevents deletion racing with
    creation/revision/receipt writes. SQLite already serializes write transactions.
    PostgreSQL releases the lock on transaction end or connection loss; no
    session-level or process-local lock is used.
    """
    if session.get_bind().dialect.name == "postgresql":
        digest = hashlib.sha256(f"strem:race-missions:{user_id}".encode()).digest()
        key = int.from_bytes(digest[:8], byteorder="big", signed=True)
        await session.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": key})


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


def _race_day(mission: RaceMission) -> date:
    return mission.event.race_date


def focus(missions: list[RaceMission], today: date | None = None) -> RaceMission | None:
    """The active mission the athlete is working toward next: the nearest upcoming
    race, else the most recent one whose date has passed (debrief pending)."""
    today = today or datetime.now(UTC).date()
    active = [m for m in missions if m.state == "active"]
    upcoming = sorted((m for m in active if _race_day(m) >= today), key=_race_day)
    if upcoming:
        return upcoming[0]
    past = sorted(active, key=_race_day, reverse=True)
    return past[0] if past else None


async def list_owned(
    session: AsyncSession, user_id: uuid.UUID, state: str | None = None
) -> list[RaceMission]:
    query = select(MissionRecord).where(MissionRecord.user_id == user_id)
    if state is not None:
        query = query.where(MissionRecord.state == state)
    rows = await session.scalars(query)
    missions = [RaceMission.model_validate(row.snapshot) for row in rows]
    upcoming_first = state in (None, "active")
    return sorted(missions, key=_race_day, reverse=not upcoming_first)


async def create(
    session: AsyncSession, user_id: uuid.UUID, payload: dict[str, object], key: str
) -> RaceMission:
    await lock_account(session, user_id)
    from app.course_coordination import ensure_available

    await ensure_available(session, user_id)
    digest = fingerprint("create", payload)
    previous = await replay(session, user_id, key, digest)
    if previous:
        return previous
    active_count = await session.scalar(
        select(func.count())
        .select_from(MissionRecord)
        .where(MissionRecord.user_id == user_id, MissionRecord.state == "active")
    )
    if (active_count or 0) >= MAX_ACTIVE_MISSIONS:
        raise AppError(
            409,
            "too_many_active_missions",
            f"You can prepare for up to {MAX_ACTIVE_MISSIONS} races at once. "
            "Complete or archive one first.",
        )
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
        raise AppError(409, "write_conflict", "Concurrent change. Reload and retry.") from None
    return mission


async def change(
    session: AsyncSession,
    user_id: uuid.UUID,
    mission_id: uuid.UUID,
    expected: int,
    changes: dict[str, object],
    reason: str,
    key: str | None = None,
    operation: str = "archive",
) -> RaceMission:
    await lock_account(session, user_id)
    from app.course_coordination import ensure_available

    await ensure_available(session, user_id)
    digest = fingerprint(f"{operation}/{mission_id}", {"version": expected, "reason": reason})
    if key:
        previous = await replay(session, user_id, key, digest)
        if previous:
            return previous
    record = await owned(session, user_id, mission_id)
    if record.version != expected:
        raise AppError(412, "version_conflict", "This mission changed. Reload before editing.")
    if record.state != "active":
        raise AppError(
            409, "mission_archived", "Only active missions can be edited, completed or archived."
        )
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


async def delete_mission_rows(session: AsyncSession, user_id: uuid.UUID) -> None:
    # Explicit ordering also works with foreign-key enforcement on SQLite.
    for model in MISSION_SCOPED_MODELS:
        await session.execute(delete(model).where(model.user_id == user_id))  # type: ignore[attr-defined]


async def delete_owned_data(session: AsyncSession, user_id: uuid.UUID) -> None:
    await lock_account(session, user_id)
    await delete_mission_rows(session, user_id)
    await session.commit()
