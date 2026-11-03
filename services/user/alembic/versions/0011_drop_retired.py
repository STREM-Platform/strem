"""drop retired pre-pivot tables and profile columns (#22)

XP ledger, medals, agent consent/autonomy, biomarkers and processed events
belong to features retired with the trail pivot (strem-docs#28); the nutrition,
tribe and modality onboarding answers went with them. No code has read or
written any of it since. Downgrade recreates the schema empty: rows are not kept.

Revision ID: 0011_drop_retired
Revises: 0010_race_os
Create Date: 2026-11-03

"""

import importlib.util
from collections.abc import Sequence
from pathlib import Path

import sqlalchemy as sa

from alembic import op

revision: str = "0011_drop_retired"
down_revision: str | None = "0010_race_os"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = (
    "xp_ledger",
    "medals",
    "processed_events",
    "agent_source_consent",
    "agent_autonomy",
    "biomarkers",
)
COLUMNS = ("preferred_modalities", "nutrition_preference", "tribe_preference")


def upgrade() -> None:
    for table in TABLES:
        op.execute(f"DROP TABLE IF EXISTS {table}")
    with op.batch_alter_table("user_profiles") as batch:
        for column in COLUMNS:
            batch.drop_column(column)


def downgrade() -> None:
    with op.batch_alter_table("user_profiles") as batch:
        batch.add_column(
            sa.Column("preferred_modalities", sa.JSON(), nullable=False, server_default="[]")
        )
        batch.add_column(sa.Column("nutrition_preference", sa.String(length=30), nullable=True))
        batch.add_column(sa.Column("tribe_preference", sa.String(length=20), nullable=True))
    # Rebuild the empty tables exactly as the original revisions created them.
    for name in (
        "0002_xp_ledger_medals",
        "0003_processed_events",
        "0004_agent_consent_autonomy",
        "0007_biomarkers",
    ):
        spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(f"{name}.py"))
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        module.upgrade()
