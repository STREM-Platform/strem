"""athlete memory: what the athlete tells the race team (ADR 0010, ai#59)

Revision ID: 0006_athlete_memory
Revises: 0005_race_os
Create Date: 2026-11-01

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006_athlete_memory"
down_revision: str | None = "0005_race_os"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "athlete_memory",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("text", sa.String(400), nullable=False),
        sa.Column("source", sa.String(16), nullable=False),
        sa.Column("source_ref", sa.String(80), nullable=True),
        sa.Column("source_date", sa.Date(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("superseded_by", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_athlete_memory_user_id", "athlete_memory", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_athlete_memory_user_id", table_name="athlete_memory")
    op.drop_table("athlete_memory")
