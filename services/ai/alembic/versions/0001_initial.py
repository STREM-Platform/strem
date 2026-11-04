"""initial AI race team schema

The whole migration history up to November 2026, squashed into one revision
(#33). It creates exactly the schema the old chain produced (verified with a
schema dump of both). Later changes go in new revisions on top of this one.

Revision ID: 0001_initial
Revises:
Create Date: 2026-11-04

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_usage",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("calls", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("user_id", "day"),
    )
    op.create_table(
        "athlete_memory",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("text", sa.String(length=400), nullable=False),
        sa.Column("source", sa.String(length=16), nullable=False),
        sa.Column("source_ref", sa.String(length=80), nullable=True),
        sa.Column("source_date", sa.Date(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("superseded_by", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_athlete_memory_user_id"), "athlete_memory", ["user_id"], unique=False)
    op.create_table(
        "race_briefs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("mission_id", sa.Uuid(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("origin", sa.String(length=16), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=True),
        sa.Column("inputs_digest", sa.String(length=64), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("mission_id", "day", name="uq_race_brief_day"),
    )
    op.create_index(op.f("ix_race_briefs_mission_id"), "race_briefs", ["mission_id"], unique=False)
    op.create_index(op.f("ix_race_briefs_user_id"), "race_briefs", ["user_id"], unique=False)
    op.create_table(
        "race_chat_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("mission_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_race_chat_messages_mission_id"), "race_chat_messages", ["mission_id"], unique=False
    )
    op.create_index(
        op.f("ix_race_chat_messages_user_id"), "race_chat_messages", ["user_id"], unique=False
    )
    op.create_table(
        "race_proposals",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("mission_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("origin", sa.String(length=16), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=True),
        sa.Column("plan_version", sa.Integer(), nullable=True),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_race_proposals_mission_id"), "race_proposals", ["mission_id"], unique=False
    )
    op.create_index(op.f("ix_race_proposals_user_id"), "race_proposals", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_race_proposals_user_id"), table_name="race_proposals")
    op.drop_index(op.f("ix_race_proposals_mission_id"), table_name="race_proposals")
    op.drop_table("race_proposals")
    op.drop_index(op.f("ix_race_chat_messages_user_id"), table_name="race_chat_messages")
    op.drop_index(op.f("ix_race_chat_messages_mission_id"), table_name="race_chat_messages")
    op.drop_table("race_chat_messages")
    op.drop_index(op.f("ix_race_briefs_user_id"), table_name="race_briefs")
    op.drop_index(op.f("ix_race_briefs_mission_id"), table_name="race_briefs")
    op.drop_table("race_briefs")
    op.drop_index(op.f("ix_athlete_memory_user_id"), table_name="athlete_memory")
    op.drop_table("athlete_memory")
    op.drop_table("ai_usage")
