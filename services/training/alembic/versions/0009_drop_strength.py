"""drop the retired strength-session tables (#22)

Live strength sets and 1RM personal records belong to the pre-pivot strength
coach (strem-docs#28); no code has read or written them since. Downgrade
recreates them empty: rows are not kept.

Revision ID: 0009_drop_strength
Revises: 0008_athlete_seasons
Create Date: 2026-11-03

"""

import importlib.util
from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "0009_drop_strength"
down_revision: str | None = "0008_athlete_seasons"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS workout_sets")
    op.execute("DROP TABLE IF EXISTS personal_records")


def downgrade() -> None:
    name = "0003_workout_sets_prs"
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(f"{name}.py"))
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.upgrade()
