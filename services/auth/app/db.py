"""Async SQLAlchemy engine, session factory, and declarative base.

The engine is configured once at application startup (`configure`) and the
`get_session` FastAPI dependency yields a request-scoped `AsyncSession`. Tests
override `get_session` with an in-memory SQLite session factory, so importing
this module never opens a database connection.
"""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def configure(database_url: str) -> None:
    """Create the engine and bind the module-level session factory."""
    global _sessionmaker
    engine = create_async_engine(database_url, future=True, pool_pre_ping=True)
    _sessionmaker = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Yield a request-scoped database session."""
    if _sessionmaker is None:
        raise RuntimeError("Database is not configured. Call configure() at startup.")
    async with _sessionmaker() as session:
        yield session
