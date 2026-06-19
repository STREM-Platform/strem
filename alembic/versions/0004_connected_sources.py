"""connected-source ingestion (A3): connected_sources, recovery_samples, session provenance

Revision ID: 0004_connected_sources
Revises: 0003_workout_sets_prs
Create Date: 2026-06-19

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_connected_sources"
down_revision: str | None = "0003_workout_sets_prs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "training_sessions",
        sa.Column("source", sa.String(length=20), nullable=False, server_default="manual"),
    )
    op.add_column(
        "training_sessions", sa.Column("external_id", sa.String(length=64), nullable=True)
    )

    op.create_table(
        "connected_sources",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("access_token_enc", sa.String(length=512), nullable=True),
        sa.Column("refresh_token_enc", sa.String(length=512), nullable=True),
        sa.Column("scope", sa.String(length=255), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "connected_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("user_id", "provider"),
    )

    op.create_table(
        "recovery_samples",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("hrv_ms", sa.Float(), nullable=True),
        sa.Column("resting_hr", sa.Integer(), nullable=True),
        sa.Column("sleep_hours", sa.Float(), nullable=True),
        sa.Column("recovery_score", sa.Integer(), nullable=True),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "source", "date", name="uq_recovery_user_source_date"),
    )
    op.create_index(
        "ix_recovery_samples_user_id", "recovery_samples", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_recovery_samples_user_id", table_name="recovery_samples")
    op.drop_table("recovery_samples")
    op.drop_table("connected_sources")
    op.drop_column("training_sessions", "external_id")
    op.drop_column("training_sessions", "source")
