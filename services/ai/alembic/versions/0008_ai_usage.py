"""daily AI usage per athlete: the per-user AI limit (#8)

Revision ID: 0008_ai_usage
Revises: 0007_drop_pre_pivot
Create Date: 2026-11-03

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0008_ai_usage"
down_revision: str | None = "0007_drop_pre_pivot"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_usage",
        sa.Column("user_id", sa.Uuid(), primary_key=True),
        sa.Column("day", sa.Date(), primary_key=True),
        sa.Column("calls", sa.Integer(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("ai_usage")
