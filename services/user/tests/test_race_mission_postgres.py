"""Opt-in PostgreSQL release check against an EMPTY, disposable loopback database.

Never reads DATABASE_URL or .env for the target. Refuses non-local or non-test
databases and any pre-existing tables. Recreate the disposable DB between runs.
"""

import asyncio
import os
import subprocess
import sys
import uuid
from collections.abc import AsyncIterator
from typing import Any
from unittest.mock import patch

import httpx
import pytest
from sqlalchemy import func, inspect, select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.sql.dml import Delete

from app import race_missions as store
from app.config import get_settings
from app.db import get_session
from app.main import create_app
from app.race_missions import MissionReceipt, MissionRecord, MissionRevisionRecord
from app.schemas.race_mission import RaceMission
from tests.support import TEST_SETTINGS
from tests.test_race_missions import PAYLOAD, headers


def test_postgres_migration_concurrency_history_and_deletion() -> None:
    target = os.environ.get("STREM_TEST_POSTGRES_URL")
    if not target:
        pytest.skip("Set STREM_TEST_POSTGRES_URL to an empty disposable local PostgreSQL DB")
    url = make_url(target)
    assert url.drivername == "postgresql+asyncpg"
    assert url.host in {"127.0.0.1", "localhost", "::1"}
    assert url.database == "strem_mission_test"

    async def ensure_empty() -> None:
        engine = create_async_engine(target)
        try:
            async with engine.connect() as conn:
                assert not await conn.run_sync(lambda c: inspect(c).get_table_names()), (
                    "Refusing migrations: test database is not empty"
                )
        finally:
            await engine.dispose()

    asyncio.run(ensure_empty())
    env = {**os.environ, "DATABASE_URL": target}
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], env=env, check=True)
    owner, other = uuid.uuid4(), uuid.uuid4()

    async def scenario() -> str:
        engine = create_async_engine(target)
        sessions = async_sessionmaker(engine, expire_on_commit=False)

        async def session_dep() -> AsyncIterator[AsyncSession]:
            async with sessions() as session:
                yield session

        app = create_app()
        app.dependency_overrides[get_session] = session_dep
        app.dependency_overrides[get_settings] = lambda: TEST_SETTINGS
        try:
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ) as client:

                async def create(user: uuid.UUID, key: str) -> httpx.Response:
                    return await client.post(
                        "/v1/race-missions", headers=headers(user, key), json=PAYLOAD
                    )

                first, replay = await asyncio.gather(
                    create(owner, "same_request"), create(owner, "same_request")
                )
                assert first.status_code == replay.status_code == 201
                assert first.json() == replay.json()
                path = f"/v1/race-missions/{first.json()['id']}"
                assert (await client.get(path, headers=headers(other))).status_code == 404
                assert (await client.get(path)).status_code == 401

                edits = await asyncio.gather(
                    *[
                        client.patch(
                            path,
                            headers=headers(owner),
                            json={
                                "goal": {"outcome": "finish"},
                                "correction_reason": "PG conflict test",
                            },
                        )
                        for _ in range(2)
                    ]
                )
                assert sorted(res.status_code for res in edits) == [200, 412]
                archives = await asyncio.gather(
                    *[
                        client.post(
                            f"{path}/archive",
                            headers=headers(owner, "archive_request", 2),
                            json={"reason": "PG archive test"},
                        )
                        for _ in range(2)
                    ]
                )
                assert all(res.status_code == 200 for res in archives)
                assert archives[0].json() == archives[1].json()
                assert archives[0].headers["etag"] == '"3"'
                assert archives[0].headers["cache-control"] == "no-store"
                competing = await asyncio.gather(
                    create(owner, "next_request_one"), create(owner, "next_request_two")
                )
                assert sorted(res.status_code for res in competing) == [201, 409]
                saved_other = await create(other, "other_account_key")
                assert saved_other.status_code == 201
                exported = await client.get("/v1/race-missions/data", headers=headers(owner))
                assert len(exported.json()["missions"]) == 2
                assert len(exported.json()["revisions"]) == 4
                deleted = await client.request(
                    "DELETE",
                    "/v1/race-missions/data",
                    headers=headers(owner),
                    json={"confirmation": "DELETE MY RACE MISSIONS"},
                )
                assert deleted.status_code == 204
                async with sessions() as session:
                    for model in (MissionRecord, MissionRevisionRecord, MissionReceipt):
                        assert (
                            await session.scalar(
                                select(func.count())
                                .select_from(model)
                                .where(model.user_id == owner)
                            )
                            == 0
                        )
                        assert (
                            await session.scalar(
                                select(func.count())
                                .select_from(model)
                                .where(model.user_id == other)
                            )
                            == 1
                        )
                await check_delete_racing_with_create(sessions)
                return str(saved_other.json()["id"])
        finally:
            await engine.dispose()

    persisted_id = asyncio.run(scenario())

    async def reconnect() -> None:
        engine = create_async_engine(target)
        try:
            async with async_sessionmaker(engine)() as session:
                row = await session.get(MissionRecord, uuid.UUID(persisted_id))
                assert row is not None and row.snapshot["event"] == PAYLOAD["event"]
        finally:
            await engine.dispose()

    asyncio.run(reconnect())


async def check_delete_racing_with_create(sessions: async_sessionmaker[AsyncSession]) -> None:
    """Pause after receipt deletion to expose orphaned snapshots deterministically."""
    owner = uuid.uuid4()
    async with sessions() as session:
        mission = await store.create(session, owner, PAYLOAD, "before_delete")
        await store.change(session, owner, mission.id, 1, {"state": "archived"}, "Old event")
    receipts_deleted, finish_delete = asyncio.Event(), asyncio.Event()
    async with sessions() as deletion, sessions() as creation:
        execute = deletion.execute

        async def paused(statement: Any, *args: Any, **kwargs: Any) -> Any:
            result = await execute(statement, *args, **kwargs)
            if (
                isinstance(statement, Delete)
                and getattr(statement.table, "name", None) == "race_mission_receipts"
            ):
                receipts_deleted.set()
                await finish_delete.wait()
            return result

        with patch.object(deletion, "execute", paused):
            deleting = asyncio.create_task(store.delete_owned_data(deletion, owner))
            creating: asyncio.Task[RaceMission] | None = None
            try:
                await asyncio.wait_for(receipts_deleted.wait(), timeout=5)
                creating = asyncio.create_task(
                    store.create(creation, owner, PAYLOAD, "during_delete")
                )
                # An unlocked writer can commit here. A serialized writer must
                # wait, then retain ALL its newly-created rows after deletion.
                await asyncio.wait({creating}, timeout=0.25)
            finally:
                finish_delete.set()
                await deleting
                if creating is not None:
                    await creating
    async with sessions() as session:
        counts = [
            await session.scalar(
                select(func.count()).select_from(model).where(model.user_id == owner)
            )
            for model in (MissionRecord, MissionRevisionRecord, MissionReceipt)
        ]
        assert counts == [1, 1, 1], f"Delete/create left incomplete or orphaned data: {counts}"
