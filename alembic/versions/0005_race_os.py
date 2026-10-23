"""race team conversation, daily briefs and plan proposals (docs#26)

Revision ID: 0005_race_os
Revises: 0004_widen_agent_action_text
Create Date: 2026-10-23

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005_race_os"
down_revision: str | None = "0004_widen_agent_action_text"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "race_chat_messages",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("mission_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("model", sa.String(80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_race_chat_messages_user_id", "race_chat_messages", ["user_id"])
    op.create_index("ix_race_chat_messages_mission_id", "race_chat_messages", ["mission_id"])
    op.create_table(
        "race_briefs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("mission_id", sa.Uuid(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("origin", sa.String(16), nullable=False),
        sa.Column("model", sa.String(80), nullable=True),
        sa.Column("inputs_digest", sa.String(64), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("mission_id", "day", name="uq_race_brief_day"),
    )
    op.create_index("ix_race_briefs_user_id", "race_briefs", ["user_id"])
    op.create_index("ix_race_briefs_mission_id", "race_briefs", ["mission_id"])
    op.create_table(
        "race_proposals",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("mission_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("origin", sa.String(16), nullable=False),
        sa.Column("model", sa.String(80), nullable=True),
        sa.Column("plan_version", sa.Integer(), nullable=True),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_race_proposals_user_id", "race_proposals", ["user_id"])
    op.create_index("ix_race_proposals_mission_id", "race_proposals", ["mission_id"])


def downgrade() -> None:
    for table in ("race_proposals", "race_briefs", "race_chat_messages"):
        op.drop_table(table)
