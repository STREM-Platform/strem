"""Race OS: several active missions, mission layers and race history (docs#26).

Additive except for dropping the one-active-mission partial index; no existing
rows are changed. Downgrade drops only the new tables and restores the index,
which fails if an athlete now has more than one active mission.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import context, op

revision: str = "0010_race_os"
down_revision: str | None = "0009_course_cleanup"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index("uq_race_missions_active_user", table_name="race_missions")
    op.create_table(
        "mission_layers",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("mission_id", sa.Uuid(), sa.ForeignKey("race_missions.id"), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("origin", sa.String(16), nullable=False),
        sa.Column("model", sa.String(80), nullable=True),
        sa.Column("inputs_digest", sa.String(64), nullable=True),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("mission_id", "kind", name="uq_mission_layer_kind"),
    )
    op.create_index("ix_mission_layers_mission_id", "mission_layers", ["mission_id"])
    op.create_index("ix_mission_layers_user_id", "mission_layers", ["user_id"])
    op.create_table(
        "race_results",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("mission_id", sa.Uuid(), nullable=True),
        sa.Column("source", sa.String(16), nullable=False),
        sa.Column("external_id", sa.String(80), nullable=True),
        sa.Column("race_date", sa.Date(), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "external_id", name="uq_race_result_external"),
    )
    op.create_index("ix_race_results_user_id", "race_results", ["user_id"])


def downgrade() -> None:
    if context.get_x_argument(as_dictionary=True).get("allow_race_os_data_loss") != "true":
        raise RuntimeError("Downgrade drops mission layers and race history; back up first.")
    op.drop_index("ix_race_results_user_id", table_name="race_results")
    op.drop_table("race_results")
    op.drop_index("ix_mission_layers_user_id", table_name="mission_layers")
    op.drop_index("ix_mission_layers_mission_id", table_name="mission_layers")
    op.drop_table("mission_layers")
    op.create_index(
        "uq_race_missions_active_user",
        "race_missions",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("state = 'active'"),
        sqlite_where=sa.text("state = 'active'"),
    )
