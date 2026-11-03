"""Add course cleanup intent; no existing rows are changed."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import context, op

revision: str = "0009_course_cleanup"
down_revision: str | None = "0008_race_missions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "race_course_state",
        sa.Column("user_id", sa.Uuid(), primary_key=True),
        sa.Column("generation", sa.Integer(), nullable=False),
        sa.Column("deletion_pending", sa.Boolean(), nullable=False),
    )


def downgrade() -> None:
    if context.get_x_argument(as_dictionary=True).get("allow_course_data_loss") != "true":
        raise RuntimeError("Keep cleanup fences on rollback; downgrade needs a retention decision.")
    op.drop_table("race_course_state")
