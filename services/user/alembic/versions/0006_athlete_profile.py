"""athlete profile / baseline (issue #61)

Revision ID: 0006_athlete_profile
Revises: 0005_legal_acceptances
Create Date: 2026-06-21

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006_athlete_profile"
down_revision: str | None = "0005_legal_acceptances"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "athlete_profiles",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("height_cm", sa.Integer(), nullable=True),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column("age_band", sa.String(length=20), nullable=True),
        sa.Column("biological_sex", sa.String(length=20), nullable=True),
        sa.Column("years_training", sa.Integer(), nullable=True),
        sa.Column("equipment_access", sa.String(length=20), nullable=True),
        sa.Column("personal_records", sa.JSON(), nullable=False),
        sa.Column("injuries", sa.JSON(), nullable=False),
        sa.Column("dietary_constraints", sa.JSON(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("athlete_profiles")
