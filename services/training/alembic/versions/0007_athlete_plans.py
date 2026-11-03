"""The athlete's plan outside any race (issue #23). Additive."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import context, op

revision: str = "0007_athlete_plans"
down_revision: str | None = "0006_race_os"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "athlete_plans",
        sa.Column("user_id", sa.Uuid(), primary_key=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("origin", sa.String(16), nullable=False),
        sa.Column("model", sa.String(80), nullable=True),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    if context.get_x_argument(as_dictionary=True).get("allow_athlete_plan_data_loss") != "true":
        raise RuntimeError("Downgrade drops athletes' own plans; back up first.")
    op.drop_table("athlete_plans")
