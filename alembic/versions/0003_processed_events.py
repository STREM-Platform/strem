"""processed events (consumer idempotency)

Revision ID: 0003_processed_events
Revises: 0002_xp_ledger_medals
Create Date: 2026-06-07

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003_processed_events"
down_revision: str | None = "0002_xp_ledger_medals"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "processed_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("stream", sa.String(length=64), nullable=False),
        sa.Column("message_id", sa.String(length=64), nullable=False),
        sa.Column(
            "processed_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stream", "message_id", name="uq_processed_events_stream_message"),
    )


def downgrade() -> None:
    op.drop_table("processed_events")
