"""Connected-source domain logic (A3): connect, disconnect, registry, sync.

Sync is idempotent: runs dedupe by the provider's activity id, recovery by
(user, source, day). Each sync refreshes the access token when expired and
updates ``last_synced_at``; the race team reads the result through the API.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crypto import TokenCipher
from app.errors import AppError
from app.integrations.providers import (
    PROVIDER_CATALOG,
    NormalizedRecovery,
    NormalizedSession,
    Provider,
    TokenSet,
)
from app.models import ConnectedSource, RecoverySample, TrainingSession


def _require_provider(registry: dict[str, Provider], provider: str) -> Provider:
    client = registry.get(provider)
    if client is None:
        raise AppError(404, "unknown_provider", f"No provider '{provider}' is configured.")
    return client


def _store_tokens(row: ConnectedSource, tokens: TokenSet, cipher: TokenCipher) -> None:
    row.access_token_enc = cipher.encrypt(tokens.access_token)
    row.refresh_token_enc = cipher.encrypt(tokens.refresh_token) if tokens.refresh_token else None
    row.scope = tokens.scope
    row.expires_at = tokens.expires_at


async def connect(
    session: AsyncSession,
    registry: dict[str, Provider],
    cipher: TokenCipher,
    *,
    user_id: uuid.UUID,
    provider: str,
    code: str,
    redirect_uri: str,
) -> ConnectedSource:
    """Exchange an OAuth code for tokens and store the connection (encrypted)."""
    client = _require_provider(registry, provider)
    tokens = await client.exchange_code(code, redirect_uri)

    row = await session.get(ConnectedSource, (user_id, provider))
    if row is None:
        row = ConnectedSource(user_id=user_id, provider=provider, status="connected")
        session.add(row)
    row.status = "connected"
    _store_tokens(row, tokens, cipher)
    await session.flush()
    return row


async def disconnect(session: AsyncSession, *, user_id: uuid.UUID, provider: str) -> bool:
    """Remove a connection and its tokens. Honours A7: the source then vanishes
    from every recommendation. Returns whether a connection existed."""
    row = await session.get(ConnectedSource, (user_id, provider))
    if row is None:
        return False
    await session.delete(row)
    await session.flush()
    return True


def _humanize_last(ts: datetime | None) -> str:
    if ts is None:
        return "Never"
    delta = datetime.now(UTC) - ts
    mins = int(delta.total_seconds() // 60)
    if mins < 1:
        return "Just now"
    if mins < 60:
        return f"{mins}m ago"
    hours = mins // 60
    if hours < 24:
        return f"{hours}h ago"
    return f"{hours // 24}d ago"


async def list_sources(session: AsyncSession, *, user_id: uuid.UUID) -> list[dict[str, object]]:
    """The connection registry: every provider with its real connection state."""
    rows = await session.scalars(select(ConnectedSource).where(ConnectedSource.user_id == user_id))
    connected = {row.provider: row for row in rows}
    sources: list[dict[str, object]] = []
    for provider_id, meta in PROVIDER_CATALOG.items():
        row = connected.get(provider_id)
        sources.append(
            {
                "id": provider_id,
                "label": meta["label"],
                "icon": meta["icon"],
                "on": row is not None and row.status == "connected",
                "last": _humanize_last(row.last_synced_at if row else None),
                "metric": meta["metric"],
            }
        )
    return sources


async def _access_token(
    session: AsyncSession,
    client: Provider,
    cipher: TokenCipher,
    row: ConnectedSource,
) -> str:
    """Decrypt the access token, refreshing first if it has expired."""
    if row.access_token_enc is None:
        raise AppError(409, "not_connected", "This source has no stored access token.")
    # SQLite returns tz-naive datetimes; treat a naive expiry as UTC.
    expires_at = row.expires_at
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    expired = expires_at is not None and expires_at <= datetime.now(UTC)
    if expired and row.refresh_token_enc is not None:
        tokens = await client.refresh(cipher.decrypt(row.refresh_token_enc))
        _store_tokens(row, tokens, cipher)
        await session.flush()
        return tokens.access_token
    return cipher.decrypt(row.access_token_enc)


async def _upsert_session(
    session: AsyncSession, user_id: uuid.UUID, provider: str, norm: NormalizedSession
) -> bool:
    existing = await session.scalar(
        select(TrainingSession).where(
            TrainingSession.user_id == user_id,
            TrainingSession.source == provider,
            TrainingSession.external_id == norm.external_id,
        )
    )
    if existing is not None:
        # Re-sync refreshes what the source recorded (renames, race flag, HR);
        # it never creates a duplicate.
        existing.title = norm.title
        existing.sport_detail = norm.sport_detail
        existing.elapsed_minutes = norm.elapsed_minutes
        existing.avg_hr = norm.avg_hr
        existing.max_hr = norm.max_hr
        existing.is_race = norm.is_race
        return False
    session.add(
        TrainingSession(
            user_id=user_id,
            session_type=norm.session_type,
            duration_minutes=norm.duration_minutes,
            distance_km=norm.distance_km,
            elevation_m=norm.elevation_m,
            notes=norm.notes,
            source=provider,
            external_id=norm.external_id,
            logged_at=norm.logged_at,
            title=norm.title,
            sport_detail=norm.sport_detail,
            elapsed_minutes=norm.elapsed_minutes,
            avg_hr=norm.avg_hr,
            max_hr=norm.max_hr,
            is_race=norm.is_race,
        )
    )
    return True


async def _upsert_recovery(
    session: AsyncSession, user_id: uuid.UUID, provider: str, norm: NormalizedRecovery
) -> bool:
    day = norm.date
    existing = await session.scalar(
        select(RecoverySample).where(
            RecoverySample.user_id == user_id,
            RecoverySample.source == provider,
            RecoverySample.date == day,
        )
    )
    if existing is not None:
        existing.hrv_ms = norm.hrv_ms
        existing.resting_hr = norm.resting_hr
        existing.sleep_hours = norm.sleep_hours
        existing.recovery_score = norm.recovery_score
        return False
    session.add(
        RecoverySample(
            user_id=user_id,
            source=provider,
            date=day,
            hrv_ms=norm.hrv_ms,
            resting_hr=norm.resting_hr,
            sleep_hours=norm.sleep_hours,
            recovery_score=norm.recovery_score,
        )
    )
    return True


async def sync(
    session: AsyncSession,
    registry: dict[str, Provider],
    cipher: TokenCipher,
    *,
    user_id: uuid.UUID,
    provider: str,
) -> dict[str, int]:
    """Pull new activity/recovery from a connected source and normalize it in."""
    client = _require_provider(registry, provider)
    row = await session.get(ConnectedSource, (user_id, provider))
    if row is None:
        raise AppError(404, "not_connected", f"'{provider}' is not connected.")

    access_token = await _access_token(session, client, cipher, row)
    result = await client.fetch(access_token, since=row.last_synced_at)

    new_sessions = sum(
        [await _upsert_session(session, user_id, provider, s) for s in result.sessions]
    )
    new_recovery = sum(
        [await _upsert_recovery(session, user_id, provider, r) for r in result.recovery]
    )
    row.last_synced_at = datetime.now(UTC)
    await session.flush()

    return {"synced_sessions": new_sessions, "synced_recovery": new_recovery}


async def list_recovery(
    session: AsyncSession, *, user_id: uuid.UUID, limit: int
) -> list[RecoverySample]:
    """Recent recovery samples (newest first) — read by A4 to build readiness."""
    rows = await session.scalars(
        select(RecoverySample)
        .where(RecoverySample.user_id == user_id)
        .order_by(RecoverySample.date.desc())
        .limit(limit)
    )
    return list(rows)
