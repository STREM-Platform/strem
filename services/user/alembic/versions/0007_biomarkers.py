"""biomarkers (lab/blood-result intake, gated)

Revision ID: 0007_biomarkers
Revises: 0006_athlete_profile
Create Date: 2026-06-22

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0007_biomarkers"
down_revision: str | None = "0006_athlete_profile"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "biomarkers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("marker_type", sa.String(length=40), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=20), nullable=False),
        sa.Column("taken_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("note", sa.String(length=280), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_biomarkers_user_id", "biomarkers", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_biomarkers_user_id", table_name="biomarkers")
    op.drop_table("biomarkers")
