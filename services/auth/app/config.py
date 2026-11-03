"""Runtime configuration loaded from the environment.

Mirrors `.env.example`. See `strem-shared-contracts/contracts/auth/openapi.yml`
for the token lifecycle these values control.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed settings for strem-auth-service."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # PostgreSQL (async driver) connection string for the auth database.
    database_url: str = "postgresql+asyncpg://strem:strem@localhost:5432/strem_auth"

    # JWT signing.
    jwt_secret: str = "change-me-in-local-only"
    jwt_algorithm: str = "HS256"

    # Access token lifetime, in minutes (contract: 15-minute short-lived token).
    access_token_expire_minutes: int = 15

    # Refresh token lifetime, in days (contract: 30-day long-lived token).
    refresh_token_expire_days: int = 30


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
