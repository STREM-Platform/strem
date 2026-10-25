"""Isolated additive migration and restart persistence; never points at .env DB."""

import asyncio
import os
import subprocess
import sys
import uuid
from pathlib import Path

from sqlalchemy import inspect, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.race_missions import MissionRecord, create
from tests.test_race_missions import PAYLOAD


def test_additive_migration_restart_and_disposable_downgrade(tmp_path: Path) -> None:
    db_url = f"sqlite+aiosqlite:///{(tmp_path / 'mission-migrations.db').as_posix()}"
    env = {**os.environ, "DATABASE_URL": db_url}

    def migrate(*args: str) -> None:
        subprocess.run(
            [sys.executable, "-m", "alembic", *args], env=env, check=True, capture_output=True
        )

    migrate("upgrade", "head")
    owner = uuid.uuid4()

    async def write() -> uuid.UUID:
        engine = create_async_engine(db_url)
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            mission = await create(session, owner, PAYLOAD, "restart_test_key")
        await engine.dispose()
        return mission.id

    mission_id = asyncio.run(write())

    async def read_after_restart() -> None:
        engine = create_async_engine(db_url)
        async with async_sessionmaker(engine)() as session:
            record = await session.scalar(
                select(MissionRecord).where(MissionRecord.id == mission_id)
            )
            assert record is not None
            stored: dict[str, object] = dict(record.snapshot["event"])  # type: ignore[call-overload]
            # New optional Race OS fields are stored with their defaults.
            assert {key: stored[key] for key in PAYLOAD["event"]} == PAYLOAD["event"]
            assert stored["sport"] == "trail_running"
        await engine.dispose()

    asyncio.run(read_after_restart())
    # Disposable test database only. A populated real DB must NOT be downgraded.
    migrate(
        "-x",
        "allow_course_data_loss=true",
        "-x",
        "allow_race_os_data_loss=true",
        "downgrade",
        "0007_biomarkers",
    )

    async def check_tables() -> None:
        engine = create_async_engine(db_url)
        async with engine.connect() as conn:
            tables = await conn.run_sync(lambda sync: inspect(sync).get_table_names())
            assert (
                "race_missions" not in tables
                and "mission_layers" not in tables
                and "race_results" not in tables
                and "user_profiles" in tables
                and "biomarkers" in tables
            )
        await engine.dispose()

    asyncio.run(check_tables())
    migrate("upgrade", "head")
