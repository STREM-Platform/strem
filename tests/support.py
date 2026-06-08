"""Test harness: a training app on a fresh in-memory DB with a fake publisher."""

import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx
import jwt
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.config import Settings, get_settings
from app.db import Base, get_session
from app.events import InMemoryPublisher, get_publisher
from app.main import create_app

TEST_SETTINGS = Settings(
    database_url="sqlite+aiosqlite://",
    jwt_secret="test-secret-key-at-least-32-bytes-long!!",
    jwt_algorithm="HS256",
    message_broker_url="redis://localhost:6379/0",
)


def auth_header(user_id: uuid.UUID, email: str = "alex@strem.app") -> dict[str, str]:
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "sub": str(user_id),
            "user_id": str(user_id),
            "email": email,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=15)).timestamp()),
        },
        TEST_SETTINGS.jwt_secret,
        algorithm=TEST_SETTINGS.jwt_algorithm,
    )
    return {"Authorization": f"Bearer {token}"}


@dataclass
class Harness:
    client: httpx.AsyncClient
    publisher: InMemoryPublisher


@asynccontextmanager
async def training_app() -> AsyncIterator[Harness]:
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    publisher = InMemoryPublisher()

    async def _session() -> AsyncIterator[AsyncSession]:
        async with sessionmaker() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = _session
    app.dependency_overrides[get_settings] = lambda: TEST_SETTINGS
    app.dependency_overrides[get_publisher] = lambda: publisher

    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            yield Harness(client=client, publisher=publisher)
    finally:
        await engine.dispose()
