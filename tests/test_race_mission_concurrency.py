"""Separate connections contend over a disposable database, not one mock session."""

import asyncio
import uuid
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db import Base
from app.errors import AppError
from app.race_missions import MissionRecord, MissionRevisionRecord, change, create
from app.schemas.race_mission import RaceMission
from tests.test_race_missions import PAYLOAD


def test_concurrent_creation_replay_and_edits(tmp_path: Path) -> None:
    async def scenario() -> None:
        engine = create_async_engine(
            f"sqlite+aiosqlite:///{(tmp_path / 'concurrency.db').as_posix()}"
        )
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        owner = uuid.uuid4()

        async def write(key: str) -> RaceMission | int:
            async with sessions() as session:
                try:
                    return await create(session, owner, PAYLOAD, key)
                except AppError as exc:
                    return exc.status_code

        try:
            first, replay = await asyncio.gather(write("same_request"), write("same_request"))
            assert isinstance(first, RaceMission) and isinstance(replay, RaceMission)
            assert first.id == replay.id

            async def edit() -> RaceMission | int:
                async with sessions() as session:
                    try:
                        return await change(session, owner, first.id, 1, {}, "Concurrent edit")
                    except AppError as exc:
                        return exc.status_code

            results = await asyncio.gather(edit(), edit())
            assert sum(isinstance(result, RaceMission) for result in results) == 1
            assert 412 in results
            async with sessions() as session:
                assert await session.scalar(select(func.count()).select_from(MissionRecord)) == 1
                assert (
                    await session.scalar(select(func.count()).select_from(MissionRevisionRecord))
                    == 2
                )

            owner = uuid.uuid4()
            # Several active missions are allowed: distinct keys create distinct missions.
            different = await asyncio.gather(write("different_one"), write("different_two"))
            assert all(isinstance(result, RaceMission) for result in different)
            assert len({result.id for result in different if isinstance(result, RaceMission)}) == 2
        finally:
            await engine.dispose()

    asyncio.run(scenario())
