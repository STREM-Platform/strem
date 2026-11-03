"""ORM models for user profiles and onboarding state.

`UserProfile.id` equals the auth `user_id` (the JWT subject); it is not
generated here. Enum-valued columns are stored as strings and validated by the
Pydantic schemas at the API boundary, so the same models work on PostgreSQL and
the SQLite test database.

The XP ledger, medals, agent consent/autonomy, biomarker and processed-event
tables belong to features retired in strem-docs#28. No code reads or writes them
any more; their models stay so Alembic metadata keeps matching the existing
schema (no drop migration without a separate retention decision).
"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, UniqueConstraint, func
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


class AgentSourceConsent(Base):
    """A user's decision to let Forge see one data source (A7 consent).

    Only deviations from the catalog defaults are stored; an absent row means the
    source keeps its default (see `app.agent_prefs.SOURCE_CATALOG`). One row per
    user per source.
    """

    __tablename__ = "agent_source_consent"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    source_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AgentAutonomy(Base):
    """A user's per-capability autonomy setting for Forge (A7).

    Only deviations from `app.agent_prefs.DEFAULT_AUTONOMY` are stored; an absent
    row means the capability keeps its default. One row per user per capability.
    """

    __tablename__ = "agent_autonomy"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    capability: Mapped[str] = mapped_column(String(40), primary_key=True)
    level: Mapped[str] = mapped_column(String(10), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class LegalAcceptance(Base):
    """A user's acceptance of one version of one legal document (append-only).

    One row per acceptance event: re-accepting a new version of the same document
    inserts a new row rather than mutating the old one, so the full history of what
    a user agreed to (and when) is preserved for audit. `document_type` is one of
    the keys in `app.legal.DocumentType`; `version` matches the `Version:` header
    of the corresponding policy in strem-docs/legal and the value in
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


class Biomarker(Base):
    """A single lab / blood-result reading entered by the user (issue #63).

    Append-only readings keyed by the auth `user_id`; trends are derived on read.
    Highly sensitive, so access is gated behind explicit consent + Medical
    Disclaimer acceptance, and the user can revoke the A7 "biomarkers" source at
    any time. Forge surfaces trends + context only — never a diagnosis (A8).
    """

    __tablename__ = "biomarkers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    marker_type: Mapped[str] = mapped_column(String(40), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    taken_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    note: Mapped[str | None] = mapped_column(String(280), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


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
