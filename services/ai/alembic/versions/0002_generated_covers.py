"""AI-generated race covers (#35)

Revision ID: 0002_generated_covers
Revises: 0001_initial
Create Date: 2026-11-07

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_generated_covers"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "generated_covers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("media_type", sa.String(length=40), nullable=False),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_generated_covers_user_id"), "generated_covers", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_generated_covers_user_id"), table_name="generated_covers")
    op.drop_table("generated_covers")
