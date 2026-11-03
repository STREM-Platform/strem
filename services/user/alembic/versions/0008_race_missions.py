"""Additive Race Mission foundation; no legacy data is moved or deleted.

Downgrade drops ONLY the three new tables and therefore requires backup and
explicit approval if they contain data. Preferred production rollback is to
roll back the app while leaving the additive tables in place.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0008_race_missions"
down_revision: str | None = "0007_biomarkers"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "race_missions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("state", sa.String(16), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_race_missions_user_id", "race_missions", ["user_id"])
    op.create_index(
        "uq_race_missions_active_user",
        "race_missions",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("state = 'active'"),
        sqlite_where=sa.text("state = 'active'"),
    )
    op.create_table(
        "race_mission_revisions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("mission_id", sa.Uuid(), sa.ForeignKey("race_missions.id"), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.UniqueConstraint("mission_id", "version", name="uq_mission_revision"),
    )
    op.create_index("ix_race_mission_revisions_user_id", "race_mission_revisions", ["user_id"])
    op.create_table(
        "race_mission_receipts",
        sa.Column("user_id", sa.Uuid(), primary_key=True),
        sa.Column("key", sa.String(128), primary_key=True),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("race_mission_receipts")
    op.drop_index("ix_race_mission_revisions_user_id", table_name="race_mission_revisions")
    op.drop_table("race_mission_revisions")
    op.drop_index("uq_race_missions_active_user", table_name="race_missions")
    op.drop_index("ix_race_missions_user_id", table_name="race_missions")
    op.drop_table("race_missions")
