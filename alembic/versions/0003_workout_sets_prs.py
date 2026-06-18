"""live-workout sets and personal records (D1/D2)

Revision ID: 0003_workout_sets_prs
Revises: 0002_session_elevation
Create Date: 2026-06-18

Chained after 0002_session_elevation (#56) so the migration history stays linear.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003_workout_sets_prs"
down_revision: str | None = "0002_session_elevation"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workout_sets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("exercise", sa.String(length=80), nullable=False),
        sa.Column("set_index", sa.Integer(), nullable=False),
        sa.Column("reps", sa.Integer(), nullable=False),
        sa.Column("kg", sa.Float(), nullable=False),
        sa.Column("rpe", sa.Integer(), nullable=True),
        sa.Column("rest_s", sa.Integer(), nullable=True),
        sa.Column(
            "done_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workout_sets_session_id", "workout_sets", ["session_id"], unique=False)
    op.create_index("ix_workout_sets_user_id", "workout_sets", ["user_id"], unique=False)

    op.create_table(
        "personal_records",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("exercise", sa.String(length=80), nullable=False),
        sa.Column("reps", sa.Integer(), nullable=False),
        sa.Column("kg", sa.Float(), nullable=False),
        sa.Column("estimated_1rm", sa.Float(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("achieved_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "exercise", name="uq_personal_records_user_exercise"),
    )
    op.create_index(
        "ix_personal_records_user_id", "personal_records", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_personal_records_user_id", table_name="personal_records")
    op.drop_table("personal_records")
    op.drop_index("ix_workout_sets_user_id", table_name="workout_sets")
    op.drop_index("ix_workout_sets_session_id", table_name="workout_sets")
    op.drop_table("workout_sets")
