"""Private current-course storage; owner generation fences late writes after purge."""

import base64
import hashlib
import json
import uuid
from dataclasses import asdict
from datetime import UTC, datetime
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import JSON, DateTime, Integer, LargeBinary, delete, func, select, text
from sqlalchemy.dialects import postgresql, sqlite
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.course_analysis import analyze_course
from app.course_processing import extract_gpx, process_course
from app.db import Base
from app.errors import AppError

BODY_LIMIT = 6 * 1024 * 1024
OWNER_BYTES_LIMIT = 20 * 1024 * 1024


class CourseOwner(Base):
    __tablename__ = "course_owners"
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    generation: Mapped[int] = mapped_column(Integer, default=0)


class CourseRecord(Base):
    __tablename__ = "mission_courses"
    mission_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    version: Mapped[int] = mapped_column(Integer)
    gpx: Mapped[bytes] = mapped_column(LargeBinary)
    snapshot: Mapped[dict[str, object]] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class CourseUpload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content_base64: str = Field(min_length=4, max_length=5_592_408)
    # Informational reference only: never fetched or treated as verified official.
    source_url: str | None = Field(default=None, max_length=2000, pattern=r"^https://[^\s]+$")

    @field_validator("source_url")
    @classmethod
    def public_reference(cls, value: str | None) -> str | None:
        if value is not None:
            parsed = urlsplit(value)
            if not parsed.hostname or parsed.username is not None or parsed.password is not None:
                raise ValueError("Use an HTTPS reference without embedded credentials")
        return value


def prepare(body: CourseUpload) -> tuple[bytes, dict[str, object]]:
    try:
        data = base64.b64decode(body.content_base64, validate=True)
    except ValueError:
        raise AppError(422, "invalid_base64", "Choose a valid GPX or ZIP file.") from None
    gpx = extract_gpx(data)
    course = process_course(gpx)
    analysis = analyze_course(course)
    snapshot: dict[str, object] = {
        "source": "athlete_supplied",
        "source_url": body.source_url,
        "course": asdict(course),
        "analysis": asdict(analysis),
    }
    # Canonical JSON shape keeps identical retries equal after a database reload.
    return gpx, json.loads(json.dumps(snapshot, allow_nan=False))


async def lock_owner(session: AsyncSession, user_id: uuid.UUID) -> CourseOwner:
    if session.get_bind().dialect.name == "postgresql":
        key = int.from_bytes(hashlib.sha256(f"course:{user_id}".encode()).digest()[:8], signed=True)
        await session.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": key})
    owner = await session.get(CourseOwner, user_id)
    if owner is None:
        # Parallel first requests (plan, progress and timeline load together) must
        # not collide on the primary key: insert-if-absent, then read the one row.
        insert = (
            postgresql.insert if session.get_bind().dialect.name == "postgresql" else sqlite.insert
        )
        await session.execute(
            insert(CourseOwner)
            .values(user_id=user_id, generation=0)
            .on_conflict_do_nothing(index_elements=["user_id"])
        )
        owner = await session.get(CourseOwner, user_id, populate_existing=True)
        if owner is None:
            raise AppError(503, "course_owner_unavailable", "Your training data is busy. Retry.")
    return owner


def document(record: CourseRecord) -> dict[str, object]:
    return {
        **record.snapshot,
        "mission_id": str(record.mission_id),
        "version": record.version,
        "updated_at": record.updated_at.replace(tzinfo=UTC).isoformat(),
        "status": "ready",
    }


async def save(
    session: AsyncSession,
    user_id: uuid.UUID,
    mission_id: uuid.UUID,
    generation: int,
    expected: int,
    gpx: bytes,
    snapshot: dict[str, object],
) -> dict[str, object]:
    owner = await lock_owner(session, user_id)
    if generation != owner.generation:
        raise AppError(409, "course_generation_conflict", "Mission data changed. Reload and retry.")
    record = await session.get(CourseRecord, mission_id)
    if record is not None and record.user_id != user_id:
        raise AppError(404, "course_not_found", "Course not found.")
    # An identical retry is safe even if its previous write already advanced the version.
    if record is not None and record.gpx and record.gpx == gpx and record.snapshot == snapshot:
        return document(record)
    if expected != (record.version if record and record.gpx else 0):
        raise AppError(412, "version_conflict", "Course changed. Reload before replacing it.")
    used = await session.scalar(
        select(func.coalesce(func.sum(func.length(CourseRecord.gpx)), 0)).where(
            CourseRecord.user_id == user_id
        )
    )
    if int(used or 0) - (len(record.gpx) if record else 0) + len(gpx) > OWNER_BYTES_LIMIT:
        raise AppError(413, "course_storage_limit", "Saved courses exceed the account limit.")
    if record is None:
        record = CourseRecord(mission_id=mission_id, user_id=user_id, version=0)
        session.add(record)
    record.version += 1
    record.gpx, record.snapshot, record.updated_at = gpx, snapshot, datetime.now(UTC)
    await session.commit()
    return document(record)


async def purge(session: AsyncSession, user_id: uuid.UUID, generation: int) -> None:
    owner = await lock_owner(session, user_id)
    if generation < owner.generation:
        raise AppError(409, "stale_cleanup", "A newer deletion has already started.")
    if generation == owner.generation:
        # A replay must never erase courses created AFTER this cleanup completed.
        await session.commit()
        return
    owner.generation = generation
    await session.execute(delete(CourseRecord).where(CourseRecord.user_id == user_id))
    # Plans live behind the same generation fence (docs#26).
    from app.plans import purge_plans

    await purge_plans(session, user_id)
    await session.commit()
