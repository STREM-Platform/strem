"""Private mission courses. Additive; keep tables on application rollback."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005_mission_courses"
down_revision: str | None = "0004_connected_sources"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "course_owners",
        sa.Column("user_id", sa.Uuid(), primary_key=True),
        sa.Column("generation", sa.Integer(), nullable=False),
    )
    op.create_table(
        "mission_courses",
        sa.Column("mission_id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("gpx", sa.LargeBinary(), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_mission_courses_user_id", "mission_courses", ["user_id"])


def downgrade() -> None:
    raise RuntimeError(
        "Destructive course downgrade requires a separate retention/backup decision."
    )
