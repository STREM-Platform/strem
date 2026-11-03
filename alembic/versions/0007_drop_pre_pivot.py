"""drop the pre-pivot coach tables (ADR 0010 phase 6, ai#58)

The weekly-mission coach and the Forge agent were retired with the trail pivot
(strem-docs#28); no code has read or written these tables since. ADR 0010 makes
the removal decision. Downgrade recreates them empty: the rows are not kept.

Revision ID: 0007_drop_pre_pivot
Revises: 0006_athlete_memory
Create Date: 2026-11-03

"""

import importlib.util
from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "0007_drop_pre_pivot"
down_revision: str | None = "0006_athlete_memory"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = (
    "agent_actions",
    "agent_memory",
    "ai_response_metadata",
    "behavioral_trigger_state",
    "weekly_recaps",
    "mission_state_history",
    "missions",
)


def upgrade() -> None:
    for table in TABLES:
        op.execute(f"DROP TABLE IF EXISTS {table}")


def downgrade() -> None:
    # Rebuild the empty schema exactly as the original revisions created it.
    for name in (
        "0001_ai_schema",
        "0002_agent_memory",
        "0003_agent_actions",
        "0004_widen_agent_action_text",
    ):
        spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(f"{name}.py"))
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        module.upgrade()
