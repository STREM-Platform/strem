"""ORM models for user profiles and onboarding state.

`UserProfile.id` equals the auth `user_id` (the JWT subject); it is not
generated here. Enum-valued columns are stored as strings and validated by the
Pydantic schemas at the API boundary, so the same models work on PostgreSQL and
the SQLite test database. The XP ledger and medals tables are added in
strem-user-service#4.
"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.db import Base
from app.schemas.enums import OnboardingStatusValue


class UserProfile(Base):
    """A user's profile and onboarding answers (source of truth in this service)."""

    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    display_name: Mapped[str | None] = mapped_column(String(40), nullable=True)
    identity_statement: Mapped[str | None] = mapped_column(String(280), nullable=True)
    transformation_goal: Mapped[str | None] = mapped_column(String(40), nullable=True)
    training_level: Mapped[str | None] = mapped_column(String(20), nullable=True)
    preferred_modalities: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    weekly_target_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    nutrition_preference: Mapped[str | None] = mapped_column(String(30), nullable=True)
    tribe_preference: Mapped[str | None] = mapped_column(String(20), nullable=True)
    timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    onboarding_status: Mapped[str] = mapped_column(
        String(20), default=OnboardingStatusValue.NOT_STARTED.value, nullable=False
    )
    last_completed_screen: Mapped[str | None] = mapped_column(String(30), nullable=True)
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class XPLedgerEntry(Base):
    """An append-only XP award. The ledger is the source of truth for total XP."""

    __tablename__ = "xp_ledger"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    xp_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(String(40), nullable=False)
    source_reference: Mapped[str | None] = mapped_column(String(128), nullable=True)
    new_total: Mapped[int] = mapped_column(Integer, nullable=False)
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class MedalRecord(Base):
    """A medal earned by a user (one row per user per medal type)."""

    __tablename__ = "medals"
    __table_args__ = (UniqueConstraint("user_id", "medal_type", name="uq_medals_user_type"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    medal_type: Mapped[str] = mapped_column(String(40), nullable=False)
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ProcessedEvent(Base):
    """A consumed domain event, recorded so redelivery never double-awards XP.

    Keyed by the source stream and the broker message id (the event identity).
    """

    __tablename__ = "processed_events"
    __table_args__ = (
        UniqueConstraint("stream", "message_id", name="uq_processed_events_stream_message"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    stream: Mapped[str] = mapped_column(String(64), nullable=False)
    message_id: Mapped[str] = mapped_column(String(64), nullable=False)
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
