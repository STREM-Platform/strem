"""Shared test harness: a user-service app bound to a fresh in-memory database.

`user_client()` yields an httpx client over the ASGI app with `get_session` and
`get_settings` overridden, so tests never touch Postgres. `user_app()` also
exposes the session factory so tests can seed the XP ledger directly. `make_token`
mints an access JWT signed with the test secret, standing in for
strem-auth-service.
"""

import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx
import jwt
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from app.config import Settings, get_settings
from app.db import Base, get_session
from app.main import create_app

TEST_SETTINGS = Settings(
    database_url="sqlite+aiosqlite://",
    jwt_secret="test-secret-key-at-least-32-bytes-long!!",
    jwt_algorithm="HS256",
    message_broker_url="redis://localhost:6379/0",
)


def make_token(user_id: uuid.UUID, email: str = "alex@strem.app") -> str:
    """Mint an access JWT signed with the test secret (as strem-auth-service would)."""
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "user_id": str(user_id),
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=15)).timestamp()),
    }
    return jwt.encode(payload, TEST_SETTINGS.jwt_secret, algorithm=TEST_SETTINGS.jwt_algorithm)


def auth_header(user_id: uuid.UUID, email: str = "alex@strem.app") -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(user_id, email)}"}


@dataclass
class Harness:
    """A test client plus the session factory backing the same database."""

    client: httpx.AsyncClient
    sessionmaker: async_sessionmaker[AsyncSession]


async def _make_engine() -> AsyncEngine:
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return engine


@asynccontextmanager
async def user_app() -> AsyncIterator[Harness]:
    engine = await _make_engine()
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
            yield Harness(client=client, sessionmaker=sessionmaker)
    finally:
        await engine.dispose()


@asynccontextmanager
async def user_client() -> AsyncIterator[httpx.AsyncClient]:
    async with user_app() as harness:
        yield harness.client
