"""Runtime configuration loaded from the environment (mirrors `.env.example`)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed settings for strem-training-service."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://strem:strem@localhost:5432/strem_training"

    # JWT verification — must match strem-auth-service's signing settings.
    jwt_secret: str = "change-me-in-local-only"
    jwt_algorithm: str = "HS256"

    # Redis Streams broker for publishing training.session_logged.
    message_broker_url: str = "redis://localhost:6379/0"


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
