"""initial user schema

The whole migration history up to November 2026, squashed into one revision
(#33). It creates exactly the schema the old chain produced (verified with a
schema dump of both). Later changes go in new revisions on top of this one.

Revision ID: 0001_initial
Revises:
Create Date: 2026-11-04

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "athlete_profiles",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("height_cm", sa.Integer(), nullable=True),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column("age_band", sa.String(length=20), nullable=True),
        sa.Column("biological_sex", sa.String(length=20), nullable=True),
        sa.Column("years_training", sa.Integer(), nullable=True),
        sa.Column("equipment_access", sa.String(length=20), nullable=True),
        sa.Column("personal_records", sa.JSON(), nullable=False),
        sa.Column("injuries", sa.JSON(), nullable=False),
        sa.Column("dietary_constraints", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("user_id"),
    )
    op.create_table(
        "legal_acceptances",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("document_type", sa.String(length=20), nullable=False),
        sa.Column("version", sa.String(length=20), nullable=False),
        sa.Column(
            "accepted_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_legal_acceptances_user_id"), "legal_acceptances", ["user_id"], unique=False
    )
    op.create_table(
        "race_course_state",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("generation", sa.Integer(), nullable=False),
        sa.Column("deletion_pending", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("user_id"),
    )
    op.create_table(
        "race_mission_receipts",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("key", sa.String(length=128), nullable=False),
        sa.Column("fingerprint", sa.String(length=64), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("user_id", "key"),
    )
    op.create_table(
        "race_missions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("state", sa.String(length=16), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_race_missions_user_id"), "race_missions", ["user_id"], unique=False)
    op.create_table(
        "race_results",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("mission_id", sa.Uuid(), nullable=True),
        sa.Column("source", sa.String(length=16), nullable=False),
        sa.Column("external_id", sa.String(length=80), nullable=True),
        sa.Column("race_date", sa.Date(), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "external_id", name="uq_race_result_external"),
    )
    op.create_index(op.f("ix_race_results_user_id"), "race_results", ["user_id"], unique=False)
    op.create_table(
        "user_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("display_name", sa.String(length=40), nullable=True),
        sa.Column("identity_statement", sa.String(length=280), nullable=True),
        sa.Column("transformation_goal", sa.String(length=40), nullable=True),
        sa.Column("training_level", sa.String(length=20), nullable=True),
        sa.Column("weekly_target_days", sa.Integer(), nullable=True),
        sa.Column("timezone", sa.String(length=64), nullable=True),
        sa.Column("onboarding_status", sa.String(length=20), nullable=False),
        sa.Column("last_completed_screen", sa.String(length=30), nullable=True),
        sa.Column("onboarding_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "mission_layers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("mission_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("origin", sa.String(length=16), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=True),
        sa.Column("inputs_digest", sa.String(length=64), nullable=True),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["mission_id"],
            ["race_missions.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("mission_id", "kind", name="uq_mission_layer_kind"),
    )
    op.create_index(
        op.f("ix_mission_layers_mission_id"), "mission_layers", ["mission_id"], unique=False
    )
    op.create_index(op.f("ix_mission_layers_user_id"), "mission_layers", ["user_id"], unique=False)
    op.create_table(
        "race_mission_revisions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("mission_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("reason", sa.String(length=500), nullable=False),
        sa.ForeignKeyConstraint(
            ["mission_id"],
            ["race_missions.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("mission_id", "version", name="uq_mission_revision"),
    )
    op.create_index(
        op.f("ix_race_mission_revisions_user_id"),
        "race_mission_revisions",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_race_mission_revisions_user_id"), table_name="race_mission_revisions")
    op.drop_table("race_mission_revisions")
    op.drop_index(op.f("ix_mission_layers_user_id"), table_name="mission_layers")
    op.drop_index(op.f("ix_mission_layers_mission_id"), table_name="mission_layers")
    op.drop_table("mission_layers")
    op.drop_table("user_profiles")
    op.drop_index(op.f("ix_race_results_user_id"), table_name="race_results")
    op.drop_table("race_results")
    op.drop_index(op.f("ix_race_missions_user_id"), table_name="race_missions")
    op.drop_table("race_missions")
    op.drop_table("race_mission_receipts")
    op.drop_table("race_course_state")
    op.drop_index(op.f("ix_legal_acceptances_user_id"), table_name="legal_acceptances")
    op.drop_table("legal_acceptances")
    op.drop_table("athlete_profiles")
