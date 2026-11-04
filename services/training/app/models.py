"""ORM models for training sessions, connected sources, recovery and check-ins.

`user_id` is the auth `user_id` from the access token. `session_type` matches
the contract / event enum. `distance_km` is only meaningful for running
sessions.
"""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    Integer,
    String,
    UniqueConstraint,
    false,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.db import Base


class TrainingSession(Base):
    """A logged strength, running, or mobility session."""

    __tablename__ = "training_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    session_type: Mapped[str] = mapped_column(String(20), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    elevation_m: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Provenance (A3): "manual" for in-app logs, else the connected source.
    source: Mapped[str] = mapped_column(
        String(20), default="manual", server_default="manual", nullable=False
    )
    # The provider's activity id, so re-syncs are idempotent (null for manual).
    external_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Race OS evidence fields (docs#26): what the source recorded, never inferred.
    title: Mapped[str | None] = mapped_column(String(160), nullable=True)
    sport_detail: Mapped[str | None] = mapped_column(String(40), nullable=True)
    elapsed_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    avg_hr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_hr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_race: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=false(), nullable=False
    )
    logged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ConnectedSource(Base):
    """A user's connection to an external data source (A3): Whoop, Strava, Health.

    OAuth tokens are stored encrypted at rest (see `app.crypto`). One row per
    user per provider. Disconnecting deletes the row (and its tokens).
    """

    __tablename__ = "connected_sources"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    provider: Mapped[str] = mapped_column(String(20), primary_key=True)
    status: Mapped[str] = mapped_column(String(20), default="connected", nullable=False)
    access_token_enc: Mapped[str | None] = mapped_column(String(512), nullable=True)
    refresh_token_enc: Mapped[str | None] = mapped_column(String(512), nullable=True)
    scope: Mapped[str | None] = mapped_column(String(255), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    connected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class RecoverySample(Base):
    """A daily recovery reading from a connected source (A3), for A4 to read.

    Sleep / HRV / resting HR / recovery score — the raw inputs A4 turns into the
    readiness signal. One row per user per source per day.
    """

    __tablename__ = "recovery_samples"
    __table_args__ = (
        UniqueConstraint("user_id", "source", "date", name="uq_recovery_user_source_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    source: Mapped[str] = mapped_column(String(20), nullable=False)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    hrv_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    resting_hr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sleep_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    recovery_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class WellnessCheckin(Base):
    """A quick daily check-in: how the athlete slept and feels (1-5 scales).

    Subjective evidence the race team weighs next to recorded load and recovery.
    One row per user per calendar day; a later check-in that day replaces it.
    """

    __tablename__ = "wellness_checkins"
    __table_args__ = (UniqueConstraint("user_id", "day", name="uq_checkin_user_day"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    day: Mapped[date] = mapped_column(Date, nullable=False)
    sleep_quality: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sleep_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    energy: Mapped[int | None] = mapped_column(Integer, nullable=True)
    soreness: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stress: Mapped[int | None] = mapped_column(Integer, nullable=True)
    motivation: Mapped[int | None] = mapped_column(Integer, nullable=True)
    illness: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    pain_note: Mapped[str | None] = mapped_column(String(300), nullable=True)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
