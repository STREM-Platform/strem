"""Shared test harness: an auth app bound to a fresh in-memory database.

`auth_client()` yields an httpx client over the ASGI app with `get_session` and
`get_settings` overridden, so tests never touch Postgres. The schema is created
from model metadata (no live migrations needed for unit tests).
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.config import Settings, get_settings
from app.db import Base, get_session
from app.main import create_app

TEST_SETTINGS = Settings(
    database_url="sqlite+aiosqlite://",
    jwt_secret="test-secret-key-at-least-32-bytes-long!!",
    jwt_algorithm="HS256",
    access_token_expire_minutes=15,
    refresh_token_expire_days=30,
)


@asynccontextmanager
async def auth_client() -> AsyncIterator[httpx.AsyncClient]:
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    sessionmaker = async_sessionmaker(engine, expire_on_commit=False)

    async def _session() -> AsyncIterator[AsyncSession]:
        async with sessionmaker() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = _session
    app.dependency_overrides[get_settings] = lambda: TEST_SETTINGS

    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            yield client
    finally:
        await engine.dispose()
