"""Runtime configuration loaded from the environment (mirrors `.env.example`)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed settings for strem-ai-orchestrator."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://strem:strem@localhost:5432/strem_ai"

    # JWT verification — must match strem-auth-service's signing settings.
    jwt_secret: str = "change-me-in-local-only"
    jwt_algorithm: str = "HS256"

    # Redis Streams broker for publishing AI mission/coaching events.
    message_broker_url: str = "redis://localhost:6379/0"

    # Approved service APIs the orchestrator reads context from. Domain services
    # remain the sources of truth; the orchestrator copies no raw logs into its
    # own database.
    user_service_base_url: str = "http://localhost:8002/v1"
    community_service_base_url: str = "http://localhost:8005/v1"


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
