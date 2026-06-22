"""Request dependencies: access-token authentication and shared injectables."""

import uuid
from dataclasses import dataclass
from typing import Annotated

import jwt
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.baseline import load_pr_baseline
from app.config import Settings, get_settings
from app.db import get_session
from app.errors import AppError
from app.events import EventPublisher, get_publisher
from app.integrations.providers import Provider, get_provider_registry
from app.security import decode_access_token

SessionDep = Annotated[AsyncSession, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
PublisherDep = Annotated[EventPublisher, Depends(get_publisher)]
ProviderRegistryDep = Annotated[dict[str, Provider], Depends(get_provider_registry)]


@dataclass(frozen=True)
class CurrentUser:
    """The authenticated identity derived from the access token."""

    user_id: uuid.UUID
    email: str


def get_current_user(request: Request, settings: SettingsDep) -> CurrentUser:
    """Authenticate the request from its bearer access token."""
    header = request.headers.get("Authorization")
    if not header or not header.lower().startswith("bearer "):
        raise AppError(401, "unauthorized", "Authentication required.")

    token = header.split(" ", 1)[1].strip()
    try:
        claims = decode_access_token(
            token, secret=settings.jwt_secret, algorithm=settings.jwt_algorithm
        )
    except jwt.PyJWTError as exc:
        raise AppError(401, "unauthorized", "Access token is invalid or expired.") from exc

    return CurrentUser(user_id=uuid.UUID(str(claims["user_id"])), email=str(claims["email"]))


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]


def get_bearer_token(request: Request) -> str:
    """The raw access token, so a route can call another service as the user."""
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        return ""
    return header.split(" ", 1)[1].strip()


BearerTokenDep = Annotated[str, Depends(get_bearer_token)]


async def get_pr_baseline(token: BearerTokenDep, settings: SettingsDep) -> dict[str, float]:
    """The seeded PR e1RM floor for the current user (athlete-baseline PRs, #61)."""
    return await load_pr_baseline(settings.user_service_base_url, token)


PrBaselineDep = Annotated[dict[str, float], Depends(get_pr_baseline)]
