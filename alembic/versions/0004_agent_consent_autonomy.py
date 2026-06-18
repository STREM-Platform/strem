"""agent consent and autonomy (A7)

Revision ID: 0004_agent_consent_autonomy
Revises: 0003_processed_events
Create Date: 2026-06-18

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_agent_consent_autonomy"
down_revision: str | None = "0003_processed_events"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "agent_source_consent",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("source_id", sa.String(length=40), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("user_id", "source_id"),
    )
    op.create_table(
        "agent_autonomy",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("capability", sa.String(length=40), nullable=False),
        sa.Column("level", sa.String(length=10), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("user_id", "capability"),
    )


def downgrade() -> None:
    op.drop_table("agent_autonomy")
    op.drop_table("agent_source_consent")
