"""ORM models for user profiles and onboarding state.

`UserProfile.id` equals the auth `user_id` (the JWT subject); it is not
generated here. Enum-valued columns are stored as strings and validated by the
Pydantic schemas at the API boundary, so the same models work on PostgreSQL and
the SQLite test database.
"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, Integer, String, func
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
    weekly_target_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
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


class LegalAcceptance(Base):
    """A user's acceptance of one version of one legal document (append-only).

    One row per acceptance event: re-accepting a new version of the same document
    inserts a new row rather than mutating the old one, so the full history of what
    a user agreed to (and when) is preserved for audit. `document_type` is one of
    the keys in `app.legal.DocumentType`; `version` matches the `Version:` header
    of the corresponding policy in docs/legal and the value in
    `app.legal.REQUIRED_VERSIONS`.
    """

    __tablename__ = "legal_acceptances"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    document_type: Mapped[str] = mapped_column(String(20), nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    accepted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AthleteProfile(Base):
    """A user's progressive "Athlete Baseline" (next-steps-plan.md §3.1).

    Optional, resumable coaching inputs kept SEPARATE from the deliberately-minimal
    identity onboarding: body metrics, training history, PRs, injuries, equipment,
    and dietary constraints. Everything is nullable/empty until the user fills it
    in (or Forge writes it via memory). Keyed by the auth `user_id`. JSON columns
    hold the structured lists; the Pydantic schemas validate them at the boundary.
    Framed as coaching inputs, never a "look" metric (A8: no vanity).
    """

    __tablename__ = "athlete_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    height_cm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    age_band: Mapped[str | None] = mapped_column(String(20), nullable=True)
    biological_sex: Mapped[str | None] = mapped_column(String(20), nullable=True)
    years_training: Mapped[int | None] = mapped_column(Integer, nullable=True)
    equipment_access: Mapped[str | None] = mapped_column(String(20), nullable=True)
    personal_records: Mapped[list[dict[str, object]]] = mapped_column(
        JSON, default=list, nullable=False
    )
    injuries: Mapped[list[dict[str, object]]] = mapped_column(JSON, default=list, nullable=False)
    dietary_constraints: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
