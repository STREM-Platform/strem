"""Test harness: a training app on a fresh in-memory DB with stub providers."""

import uuid
from collections.abc import AsyncIterator, Mapping
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

import httpx
import jwt
from cryptography.fernet import Fernet
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.config import Settings, get_settings
from app.db import Base, get_session
from app.integrations.providers import Provider, SyncResult, TokenSet, get_provider_registry
from app.main import create_app

TEST_SETTINGS = Settings(
    database_url="sqlite+aiosqlite://",
    jwt_secret="test-secret-key-at-least-32-bytes-long!!",
    jwt_algorithm="HS256",
    integrations_encryption_key=Fernet.generate_key().decode(),
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
class StubProvider:
    """A configurable in-memory provider — no network (stands in for Whoop/Strava)."""

    id: str = "strava"
    tokens: TokenSet = field(
        default_factory=lambda: TokenSet(access_token="acc", refresh_token="ref", scope="read")
    )
    result: SyncResult = field(default_factory=SyncResult)
    refreshed: int = 0

    async def exchange_code(self, code: str, redirect_uri: str) -> TokenSet:
        return self.tokens

    async def refresh(self, refresh_token: str) -> TokenSet:
        self.refreshed += 1
        return self.tokens

    async def fetch(self, access_token: str, *, since: datetime | None) -> SyncResult:
        return self.result


@dataclass
class Harness:
    client: httpx.AsyncClient
    providers: dict[str, Provider]
    app: FastAPI
    sessionmaker: async_sessionmaker[AsyncSession]


@asynccontextmanager
async def training_app(
    providers: Mapping[str, Provider] | None = None,
) -> AsyncIterator[Harness]:
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    registry: dict[str, Provider] = dict(providers) if providers is not None else {}

    async def _session() -> AsyncIterator[AsyncSession]:
        async with sessionmaker() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = _session
    app.dependency_overrides[get_settings] = lambda: TEST_SETTINGS
    app.dependency_overrides[get_provider_registry] = lambda: registry

    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            yield Harness(
                client=client,
                providers=registry,
                app=app,
                sessionmaker=sessionmaker,
            )
    finally:
        await engine.dispose()
