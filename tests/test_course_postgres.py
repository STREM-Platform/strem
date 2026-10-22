"""Opt-in check on an empty disposable loopback database; never reads DATABASE_URL."""

import asyncio
import os
import subprocess
import sys
import uuid

import pytest
from sqlalchemy import func, inspect, select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app import courses as store
from app.errors import AppError
from tests.test_courses import UPLOAD


def test_postgres_course_restart_and_late_upload_fence() -> None:
    target = os.environ.get("STREM_TEST_COURSE_POSTGRES_URL")
    if not target:
        pytest.skip("Set STREM_TEST_COURSE_POSTGRES_URL to the empty disposable course test DB")
    url = make_url(target)
    assert url.drivername == "postgresql+asyncpg"
    assert url.host in ("127.0.0.1", "localhost", "::1")
    assert url.database == "strem_course_check_20261022"

    async def empty() -> None:
        engine = create_async_engine(target)
        async with engine.connect() as connection:
            assert not await connection.run_sync(lambda conn: inspect(conn).get_table_names())
        await engine.dispose()

    asyncio.run(empty())
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        env={**os.environ, "DATABASE_URL": target},
        check=True,
        capture_output=True,
    )
    owner, mission = uuid.uuid4(), uuid.uuid4()
    gpx, snapshot = store.prepare(store.CourseUpload.model_validate(UPLOAD))

    async def create() -> None:
        engine = create_async_engine(target)
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            assert (await store.save(session, owner, mission, 0, 0, gpx, snapshot))["version"] == 1
        await engine.dispose()

    asyncio.run(create())

    async def after_restart() -> None:
        engine = create_async_engine(target)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        async with sessions() as session:
            row = await session.get(store.CourseRecord, mission)
            assert row is not None and row.gpx == gpx
        # Hold the purge lock while a previously authorized write arrives.
        async with sessions() as purge_session:
            await store.lock_owner(purge_session, owner)

            async def late_write() -> None:
                async with sessions() as session:
                    await store.save(session, owner, mission, 0, 1, gpx, snapshot)

            task = asyncio.create_task(late_write())
            with pytest.raises(TimeoutError):
                await asyncio.wait_for(asyncio.shield(task), 0.05)
            await store.purge(purge_session, owner, 1)
            with pytest.raises(AppError) as caught:
                await task
            assert caught.value.code == "course_generation_conflict"
        async with sessions() as session:
            assert await session.scalar(select(func.count()).select_from(store.CourseRecord)) == 0
            await store.save(session, owner, mission, 1, 0, gpx, snapshot)
        # Replaying an old cleanup after a new upload must be harmless.
        async with sessions() as session:
            await store.purge(session, owner, 1)
        async with sessions() as session:
            assert await session.get(store.CourseRecord, mission) is not None
            await store.purge(session, owner, 2)
        await engine.dispose()

    asyncio.run(after_restart())
