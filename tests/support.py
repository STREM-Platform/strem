"""Test harness: an AI orchestrator app with a fake context provider.

`ai_app(bundle=...)` yields a client over the ASGI app with the database,
settings, publisher, and context provider overridden. The fake provider returns
a preset `ContextBundle` (or `None` to simulate insufficient context), so mission
generation is tested without calling the user service.
"""

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
from app.context import ContextBundle, get_context_provider
from app.db import Base, get_session
from app.events import InMemoryPublisher, get_publisher
from app.main import create_app

TEST_SETTINGS = Settings(
    database_url="sqlite+aiosqlite://",
    jwt_secret="test-secret-key-at-least-32-bytes-long!!",
    jwt_algorithm="HS256",
    message_broker_url="redis://localhost:6379/0",
    user_service_base_url="http://user.test/v1",
)

DEFAULT_BUNDLE = ContextBundle(
    identity_statement="I am becoming a hybrid athlete who never skips recovery.",
    transformation_goal="hybrid_athlete",
    training_level="intermediate",
    weekly_target_days=4,
    active_days_last_week=0,
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


class FakeContextProvider:
    def __init__(self, bundle: ContextBundle | None) -> None:
        self.bundle = bundle

    async def for_user(self, user_id: str, bearer_token: str) -> ContextBundle | None:
        return self.bundle


@dataclass
class Harness:
    client: httpx.AsyncClient
    publisher: InMemoryPublisher
    sessionmaker: async_sessionmaker[AsyncSession]


@asynccontextmanager
async def ai_app(bundle: ContextBundle | None = DEFAULT_BUNDLE) -> AsyncIterator[Harness]:
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    publisher = InMemoryPublisher()
    provider = FakeContextProvider(bundle)

    async def _session() -> AsyncIterator[AsyncSession]:
        async with sessionmaker() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = _session
    app.dependency_overrides[get_settings] = lambda: TEST_SETTINGS
    app.dependency_overrides[get_publisher] = lambda: publisher
    app.dependency_overrides[get_context_provider] = lambda: provider

    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            yield Harness(client=client, publisher=publisher, sessionmaker=sessionmaker)
    finally:
        await engine.dispose()
