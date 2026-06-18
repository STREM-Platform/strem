"""ORM models for training sessions, live-workout sets, and personal records.

`user_id` is the auth `user_id` from the access token. `session_type` matches
the contract / event enum. `distance_km` is only meaningful for running
sessions. This service owns these tables and no XP state.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, UniqueConstraint, func
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
    logged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class WorkoutSet(Base):
    """One performed set inside a live strength session (D1/D2).

    Sets are additive to the whole-session record: the finished session is still
    logged via `training_sessions`. `rest_s` is the rest assigned *after* this
    set by the autoregulation rule (RPE 9+ → +45s, RPE ≤6 → −30s).
    """

    __tablename__ = "workout_sets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    exercise: Mapped[str] = mapped_column(String(80), nullable=False)
    set_index: Mapped[int] = mapped_column(Integer, nullable=False)
    reps: Mapped[int] = mapped_column(Integer, nullable=False)
    kg: Mapped[float] = mapped_column(Float, nullable=False)
    rpe: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rest_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    done_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class PersonalRecord(Base):
    """The user's best recorded effort for an exercise (one row per exercise).

    A PR is detected on session finish only when an effort beats recorded history
    by estimated 1RM — never fabricated (A8 faked-progress rule). The first
    recorded effort for an exercise legitimately establishes its PR.
    """

    __tablename__ = "personal_records"
    __table_args__ = (
        UniqueConstraint("user_id", "exercise", name="uq_personal_records_user_exercise"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    exercise: Mapped[str] = mapped_column(String(80), nullable=False)
    reps: Mapped[int] = mapped_column(Integer, nullable=False)
    kg: Mapped[float] = mapped_column(Float, nullable=False)
    estimated_1rm: Mapped[float] = mapped_column(Float, nullable=False)
    session_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    achieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
