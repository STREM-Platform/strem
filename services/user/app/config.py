"""Runtime configuration loaded from the environment (mirrors `.env.example`)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed settings for strem-user-service."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # PostgreSQL (async driver) connection string for the user database.
    database_url: str = "postgresql+asyncpg://strem:strem@localhost:5432/strem_user"

    # JWT verification — must match strem-auth-service's signing settings.
    jwt_secret: str = "change-me-in-local-only"
    jwt_algorithm: str = "HS256"

    # Empty disables first course attachment; existing course state still requires cleanup.
    course_storage_base_url: str = ""


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
