"""xp ledger and medals

Revision ID: 0002_xp_ledger_medals
Revises: 0001_user_profiles
Create Date: 2026-06-06

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_xp_ledger_medals"
down_revision: str | None = "0001_user_profiles"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "xp_ledger",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("xp_amount", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=40), nullable=False),
        sa.Column("source_reference", sa.String(length=128), nullable=True),
        sa.Column("new_total", sa.Integer(), nullable=False),
        sa.Column("earned_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_xp_ledger_user_id", "xp_ledger", ["user_id"], unique=False)

    op.create_table(
        "medals",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("medal_type", sa.String(length=40), nullable=False),
        sa.Column("earned_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "medal_type", name="uq_medals_user_type"),
    )
    op.create_index("ix_medals_user_id", "medals", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_medals_user_id", table_name="medals")
    op.drop_table("medals")
    op.drop_index("ix_xp_ledger_user_id", table_name="xp_ledger")
    op.drop_table("xp_ledger")
