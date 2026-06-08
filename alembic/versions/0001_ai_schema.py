"""initial ai schema: missions, state history, recaps, trigger state, metadata

Revision ID: 0001_ai_schema
Revises:
Create Date: 2026-06-07

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_ai_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "missions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=600), nullable=False),
        sa.Column("duration_days", sa.Integer(), nullable=False),
        sa.Column("xp_reward", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("completion_condition", sa.String(length=300), nullable=False),
        sa.Column("difficulty", sa.String(length=20), nullable=False),
        sa.Column("state", sa.String(length=12), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_missions_user_id", "missions", ["user_id"])

    op.create_table(
        "mission_state_history",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("mission_id", sa.Uuid(), nullable=False),
        sa.Column("from_state", sa.String(length=12), nullable=False),
        sa.Column("to_state", sa.String(length=12), nullable=False),
        sa.Column(
            "changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mission_state_history_mission_id", "mission_state_history", ["mission_id"])

    op.create_table(
        "weekly_recaps",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.Column("week_end", sa.Date(), nullable=False),
        sa.Column("narrative", sa.String(length=2000), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_weekly_recaps_user_id", "weekly_recaps", ["user_id"])

    op.create_table(
        "behavioral_trigger_state",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("last_generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_recap_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("user_id"),
    )

    op.create_table(
        "ai_response_metadata",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("artifact", sa.String(length=20), nullable=False),
        sa.Column("reference_id", sa.Uuid(), nullable=False),
        sa.Column("generator_version", sa.String(length=40), nullable=False),
        sa.Column("safety_flags", sa.String(length=200), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_response_metadata_user_id", "ai_response_metadata", ["user_id"])


def downgrade() -> None:
    op.drop_table("ai_response_metadata")
    op.drop_table("behavioral_trigger_state")
    op.drop_table("weekly_recaps")
    op.drop_table("mission_state_history")
    op.drop_table("missions")
