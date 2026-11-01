"""Seasons: named blocks of the athlete's year, each with its own plan (issue #18). Additive."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import context, op

revision: str = "0008_athlete_seasons"
down_revision: str | None = "0007_athlete_plans"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "athlete_seasons",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("focus", sa.String(16), nullable=False),
        sa.Column("notes", sa.String(600), nullable=True),
        sa.Column("plan_version", sa.Integer(), nullable=True),
        sa.Column("plan_origin", sa.String(16), nullable=True),
        sa.Column("plan_model", sa.String(80), nullable=True),
        sa.Column("plan_content", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_athlete_seasons_user_id", "athlete_seasons", ["user_id"])


def downgrade() -> None:
    if context.get_x_argument(as_dictionary=True).get("allow_season_data_loss") != "true":
        raise RuntimeError("Downgrade drops athletes' seasons and season plans; back up first.")
    op.drop_index("ix_athlete_seasons_user_id", table_name="athlete_seasons")
    op.drop_table("athlete_seasons")
