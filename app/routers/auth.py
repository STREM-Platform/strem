"""Authentication endpoints implementing contracts/auth/openapi.yml.

Served under the `/v1` base path. Registration and login mint an access JWT
plus a rotating, server-side refresh token; refresh rotates the token; logout
revokes it; `/auth/me` returns the identity behind the access token.
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.deps import CurrentUserDep, SessionDep, SettingsDep
from app.errors import AppError
from app.models import RefreshToken, User
from app.schemas import (
    AuthIdentity,
    AuthSession,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
)
from app.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)

router = APIRouter(prefix="/v1", tags=["auth"])


def _identity(user: User) -> AuthIdentity:
    return AuthIdentity(
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
        created_at=user.created_at,
    )


async def _issue_tokens(user: User, session: AsyncSession, settings: Settings) -> TokenPair:
    """Mint an access JWT and persist a fresh refresh token for the user."""
    access_token = create_access_token(
        user_id=user.id,
        email=user.email,
        secret=settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
        expires_minutes=settings.access_token_expire_minutes,
    )
    refresh_token, token_hash = generate_refresh_token()
    session.add(
        RefreshToken(
            token_hash=token_hash,
            user_id=user.id,
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/auth/register", status_code=status.HTTP_201_CREATED, response_model=AuthSession)
async def register(
    body: RegisterRequest,
    session: SessionDep,
    settings: SettingsDep,
) -> AuthSession:
    existing = await session.scalar(select(User).where(User.email == body.email))
    if existing is not None:
        raise AppError(
            409, "email_already_registered", "An account with this email already exists."
        )

    user = User(
        email=str(body.email),
        password_hash=hash_password(body.password),
        display_name=body.display_name,
    )
    session.add(user)
    await session.flush()
    tokens = await _issue_tokens(user, session, settings)
    await session.commit()
    await session.refresh(user)
    return AuthSession(user=_identity(user), tokens=tokens)


@router.post("/auth/login", response_model=AuthSession)
async def login(
    body: LoginRequest,
    session: SessionDep,
    settings: SettingsDep,
) -> AuthSession:
    user = await session.scalar(select(User).where(User.email == body.email))
    if user is None or not verify_password(body.password, user.password_hash):
        raise AppError(401, "invalid_credentials", "Email or password is incorrect.")

    tokens = await _issue_tokens(user, session, settings)
    await session.commit()
    return AuthSession(user=_identity(user), tokens=tokens)


@router.post("/auth/refresh", response_model=TokenPair)
async def refresh(
    body: RefreshRequest,
    session: SessionDep,
    settings: SettingsDep,
) -> TokenPair:
    token_hash = hash_refresh_token(body.refresh_token)
    record = await session.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))

    expires_at = None if record is None else record.expires_at
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    invalid = (
        record is None
        or record.revoked
        or (expires_at is not None and expires_at < datetime.now(UTC))
    )
    if record is None or invalid:
        raise AppError(
            401,
            "invalid_refresh_token",
            "Refresh token is invalid or expired. Please log in again.",
        )

    user = await session.get(User, record.user_id)
    if user is None:
        raise AppError(401, "invalid_refresh_token", "Refresh token is invalid or expired.")

    record.revoked = True  # rotate: invalidate the presented token
    tokens = await _issue_tokens(user, session, settings)
    await session.commit()
    return tokens


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    body: LogoutRequest,
    current: CurrentUserDep,
    session: SessionDep,
) -> Response:
    token_hash = hash_refresh_token(body.refresh_token)
    record = await session.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == current.user_id,
        )
    )
    if record is not None:
        record.revoked = True
        await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/auth/me", response_model=AuthIdentity)
async def me(
    current: CurrentUserDep,
    session: SessionDep,
) -> AuthIdentity:
    user = await session.get(User, current.user_id)
    if user is None:
        raise AppError(401, "unauthorized", "Authentication required.")
    return _identity(user)
