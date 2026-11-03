"""initial user schema: user_profiles

Revision ID: 0001_user_profiles
Revises:
Create Date: 2026-06-06

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_user_profiles"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("display_name", sa.String(length=40), nullable=True),
        sa.Column("identity_statement", sa.String(length=280), nullable=True),
        sa.Column("transformation_goal", sa.String(length=40), nullable=True),
        sa.Column("training_level", sa.String(length=20), nullable=True),
        sa.Column("preferred_modalities", sa.JSON(), nullable=False),
        sa.Column("weekly_target_days", sa.Integer(), nullable=True),
        sa.Column("nutrition_preference", sa.String(length=30), nullable=True),
        sa.Column("tribe_preference", sa.String(length=20), nullable=True),
        sa.Column("timezone", sa.String(length=64), nullable=True),
        sa.Column("onboarding_status", sa.String(length=20), nullable=False),
        sa.Column("last_completed_screen", sa.String(length=30), nullable=True),
        sa.Column("onboarding_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("user_profiles")
