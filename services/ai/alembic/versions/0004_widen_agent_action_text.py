"""widen agent_actions text columns (LLM-written summaries overflowed)

Revision ID: 0004_widen_agent_action_text
Revises: 0003_agent_actions
Create Date: 2026-06-20

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_widen_agent_action_text"
down_revision: str | None = "0003_agent_actions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("agent_actions", "type", type_=sa.String(length=80))
    op.alter_column("agent_actions", "summary", type_=sa.String(length=500))
    op.alter_column("agent_actions", "reasoning", type_=sa.String(length=1000))


def downgrade() -> None:
    op.alter_column("agent_actions", "reasoning", type_=sa.String(length=600))
    op.alter_column("agent_actions", "summary", type_=sa.String(length=200))
    op.alter_column("agent_actions", "type", type_=sa.String(length=48))
