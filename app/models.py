"""ORM models for the AI orchestrator.

The orchestrator owns missions, their state history, weekly coaching recaps,
behavioral trigger state, and AI response metadata. It deliberately stores **no**
raw training, nutrition, or tribe logs — those are fetched per request from the
owning services (ai-architecture.md "Context Privacy").
"""

import uuid
from datetime import UTC, datetime
from datetime import date as date_type
from typing import Any

from sqlalchemy import JSON, Date, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.db import Base


class Mission(Base):
    """A structured weekly mission (ai-architecture.md "Mission Output Structure")."""

    __tablename__ = "missions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(String(600), nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)
    xp_reward: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    completion_condition: Mapped[str] = mapped_column(String(300), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)
    state: Mapped[str] = mapped_column(String(12), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MissionStateChange(Base):
    """An append-only record of a mission's state transitions."""

    __tablename__ = "mission_state_history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    mission_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    from_state: Mapped[str] = mapped_column(String(12), nullable=False)
    to_state: Mapped[str] = mapped_column(String(12), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class WeeklyRecap(Base):
    """A weekly, identity-grounded narrative coaching recap."""

    __tablename__ = "weekly_recaps"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    week_start: Mapped[date_type] = mapped_column(Date, nullable=False)
    week_end: Mapped[date_type] = mapped_column(Date, nullable=False)
    narrative: Mapped[str] = mapped_column(String(2000), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class BehavioralTriggerState(Base):
    """Per-user trigger state (last generation, last nudge) — no raw logs."""

    __tablename__ = "behavioral_trigger_state"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    last_generated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_recap_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AgentMemory(Base):
    """A long-term memory the agent keeps so it never re-asks (A1/A5) — stated
    preferences and injuries (e.g. "left knee flares on lunges"). Not a raw log."""

    __tablename__ = "agent_memory"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    icon: Mapped[str] = mapped_column(String(24), nullable=False)
    text: Mapped[str] = mapped_column(String(280), nullable=False)
    source: Mapped[str] = mapped_column(String(16), nullable=False)  # "user" | "agent"
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AgentAction(Base):
    """A typed, logged, reversible action Forge took or proposed (B3). The proof
    it's an agent: reasoning + the data it cited + an undo, in one feed."""

    __tablename__ = "agent_actions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    capability: Mapped[str] = mapped_column(String(32), nullable=False)
    type: Mapped[str] = mapped_column(String(80), nullable=False)
    # Generous: the agent writes these from the LLM, so they vary in length.
    # record_action also clips defensively so an over-long value can never crash.
    summary: Mapped[str] = mapped_column(String(500), nullable=False)
    reasoning: Mapped[str] = mapped_column(String(1000), nullable=False)
    cited_data: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(12), nullable=False)
    autonomy: Mapped[str] = mapped_column(String(8), nullable=False)
    undo_payload: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    # Python-side default gives microsecond precision so the feed orders
    # deterministically newest-first even for same-second inserts.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
        nullable=False,
    )


class AIResponseMetadata(Base):
    """Provenance for a generated artifact (model version, prompt hash, flags)."""

    __tablename__ = "ai_response_metadata"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    artifact: Mapped[str] = mapped_column(String(20), nullable=False)
    reference_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    generator_version: Mapped[str] = mapped_column(String(40), nullable=False)
    safety_flags: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
