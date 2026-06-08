"""ORM model for training sessions.

`user_id` is the auth `user_id` from the access token. `session_type` matches
the contract / event enum. `distance_km` is only meaningful for running
sessions. This service owns this table and no XP state.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, func
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
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    logged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
