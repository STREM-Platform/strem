"""initial training schema: training_sessions

Revision ID: 0001_training_sessions
Revises:
Create Date: 2026-06-06

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_training_sessions"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "training_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("session_type", sa.String(length=20), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("distance_km", sa.Float(), nullable=True),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("logged_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_training_sessions_user_id", "training_sessions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_training_sessions_user_id", table_name="training_sessions")
    op.drop_table("training_sessions")
