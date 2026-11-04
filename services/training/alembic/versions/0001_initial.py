"""initial training schema

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
        "athlete_plans",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("origin", sa.String(length=16), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=True),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("user_id"),
    )
    op.create_table(
        "athlete_seasons",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("focus", sa.String(length=16), nullable=False),
        sa.Column("notes", sa.String(length=600), nullable=True),
        sa.Column("plan_version", sa.Integer(), nullable=True),
        sa.Column("plan_origin", sa.String(length=16), nullable=True),
        sa.Column("plan_model", sa.String(length=80), nullable=True),
        sa.Column("plan_content", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_athlete_seasons_user_id"), "athlete_seasons", ["user_id"], unique=False
    )
    op.create_table(
        "connected_sources",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("access_token_enc", sa.String(length=512), nullable=True),
        sa.Column("refresh_token_enc", sa.String(length=512), nullable=True),
        sa.Column("scope", sa.String(length=255), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "connected_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("user_id", "provider"),
    )
    op.create_table(
        "course_owners",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("generation", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("user_id"),
    )
    op.create_table(
        "mission_courses",
        sa.Column("mission_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("gpx", sa.LargeBinary(), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("mission_id"),
    )
    op.create_index(
        op.f("ix_mission_courses_user_id"), "mission_courses", ["user_id"], unique=False
    )
    op.create_table(
        "mission_plans",
        sa.Column("mission_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("origin", sa.String(length=16), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=True),
        sa.Column("inputs_digest", sa.String(length=64), nullable=True),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("mission_id"),
    )
    op.create_index(op.f("ix_mission_plans_user_id"), "mission_plans", ["user_id"], unique=False)
    op.create_table(
        "recovery_samples",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("hrv_ms", sa.Float(), nullable=True),
        sa.Column("resting_hr", sa.Integer(), nullable=True),
        sa.Column("sleep_hours", sa.Float(), nullable=True),
        sa.Column("recovery_score", sa.Integer(), nullable=True),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "source", "date", name="uq_recovery_user_source_date"),
    )
    op.create_index(
        op.f("ix_recovery_samples_user_id"), "recovery_samples", ["user_id"], unique=False
    )
    op.create_table(
        "training_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("session_type", sa.String(length=20), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("distance_km", sa.Float(), nullable=True),
        sa.Column("elevation_m", sa.Integer(), nullable=True),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("source", sa.String(length=20), server_default="manual", nullable=False),
        sa.Column("external_id", sa.String(length=64), nullable=True),
        sa.Column("title", sa.String(length=160), nullable=True),
        sa.Column("sport_detail", sa.String(length=40), nullable=True),
        sa.Column("elapsed_minutes", sa.Integer(), nullable=True),
        sa.Column("avg_hr", sa.Integer(), nullable=True),
        sa.Column("max_hr", sa.Integer(), nullable=True),
        sa.Column("is_race", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("logged_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_training_sessions_user_id"), "training_sessions", ["user_id"], unique=False
    )
    op.create_table(
        "wellness_checkins",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("sleep_quality", sa.Integer(), nullable=True),
        sa.Column("sleep_hours", sa.Float(), nullable=True),
        sa.Column("energy", sa.Integer(), nullable=True),
        sa.Column("soreness", sa.Integer(), nullable=True),
        sa.Column("stress", sa.Integer(), nullable=True),
        sa.Column("motivation", sa.Integer(), nullable=True),
        sa.Column("illness", sa.Boolean(), nullable=False),
        sa.Column("pain_note", sa.String(length=300), nullable=True),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "day", name="uq_checkin_user_day"),
    )
    op.create_index(
        op.f("ix_wellness_checkins_user_id"), "wellness_checkins", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_wellness_checkins_user_id"), table_name="wellness_checkins")
    op.drop_table("wellness_checkins")
    op.drop_index(op.f("ix_training_sessions_user_id"), table_name="training_sessions")
    op.drop_table("training_sessions")
    op.drop_index(op.f("ix_recovery_samples_user_id"), table_name="recovery_samples")
    op.drop_table("recovery_samples")
    op.drop_index(op.f("ix_mission_plans_user_id"), table_name="mission_plans")
    op.drop_table("mission_plans")
    op.drop_index(op.f("ix_mission_courses_user_id"), table_name="mission_courses")
    op.drop_table("mission_courses")
    op.drop_table("course_owners")
    op.drop_table("connected_sources")
    op.drop_index(op.f("ix_athlete_seasons_user_id"), table_name="athlete_seasons")
    op.drop_table("athlete_seasons")
    op.drop_table("athlete_plans")
