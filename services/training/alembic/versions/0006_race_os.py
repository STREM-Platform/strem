"""Race OS: plans, check-ins and richer session evidence (docs#26). Additive."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import context, op

revision: str = "0006_race_os"
down_revision: str | None = "0005_mission_courses"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("training_sessions") as batch:
        batch.add_column(sa.Column("title", sa.String(160), nullable=True))
        batch.add_column(sa.Column("sport_detail", sa.String(40), nullable=True))
        batch.add_column(sa.Column("elapsed_minutes", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("avg_hr", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("max_hr", sa.Integer(), nullable=True))
        batch.add_column(
            sa.Column("is_race", sa.Boolean(), nullable=False, server_default=sa.false())
        )
    op.create_table(
        "mission_plans",
        sa.Column("mission_id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("origin", sa.String(16), nullable=False),
        sa.Column("model", sa.String(80), nullable=True),
        sa.Column("inputs_digest", sa.String(64), nullable=True),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_mission_plans_user_id", "mission_plans", ["user_id"])
    op.create_table(
        "wellness_checkins",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("sleep_quality", sa.Integer(), nullable=True),
        sa.Column("sleep_hours", sa.Float(), nullable=True),
        sa.Column("energy", sa.Integer(), nullable=True),
        sa.Column("soreness", sa.Integer(), nullable=True),
        sa.Column("stress", sa.Integer(), nullable=True),
        sa.Column("motivation", sa.Integer(), nullable=True),
        sa.Column("illness", sa.Boolean(), nullable=False),
        sa.Column("pain_note", sa.String(300), nullable=True),
        sa.Column("note", sa.String(500), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "day", name="uq_checkin_user_day"),
    )
    op.create_index("ix_wellness_checkins_user_id", "wellness_checkins", ["user_id"])


def downgrade() -> None:
    if context.get_x_argument(as_dictionary=True).get("allow_race_os_data_loss") != "true":
        raise RuntimeError("Downgrade drops plans and check-ins; back up first.")
    op.drop_index("ix_wellness_checkins_user_id", table_name="wellness_checkins")
    op.drop_table("wellness_checkins")
    op.drop_index("ix_mission_plans_user_id", table_name="mission_plans")
    op.drop_table("mission_plans")
    with op.batch_alter_table("training_sessions") as batch:
        for column in ("is_race", "max_hr", "avg_hr", "elapsed_minutes", "sport_detail", "title"):
            batch.drop_column(column)
