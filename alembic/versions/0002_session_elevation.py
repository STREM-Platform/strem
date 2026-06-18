"""add elevation_m to training_sessions (D5)

Revision ID: 0002_session_elevation
Revises: 0001_training_sessions
Create Date: 2026-06-18

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_session_elevation"
down_revision: str | None = "0001_training_sessions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("training_sessions", sa.Column("elevation_m", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("training_sessions", "elevation_m")
