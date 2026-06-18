"""agent action log (B3)

Revision ID: 0003_agent_actions
Revises: 0002_agent_memory
Create Date: 2026-06-18

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003_agent_actions"
down_revision: str | None = "0002_agent_memory"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "agent_actions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("capability", sa.String(length=32), nullable=False),
        sa.Column("type", sa.String(length=48), nullable=False),
        sa.Column("summary", sa.String(length=200), nullable=False),
        sa.Column("reasoning", sa.String(length=600), nullable=False),
        sa.Column("cited_data", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=12), nullable=False),
        sa.Column("autonomy", sa.String(length=8), nullable=False),
        sa.Column("undo_payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agent_actions_user_id", "agent_actions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_agent_actions_user_id", table_name="agent_actions")
    op.drop_table("agent_actions")
