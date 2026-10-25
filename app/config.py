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

    # Approved service APIs the race team reads context from and writes plans and
    # layers back through. Domain services remain the sources of truth; the
    # orchestrator copies no raw logs into its own database.
    user_service_base_url: str = "http://localhost:8002/v1"
    training_service_base_url: str = "http://localhost:8003/v1"

    # Anthropic (Claude) for the race team (docs#26). Empty key, no credit or an
    # outage → the deterministic race engine builds everything and says why.
    anthropic_api_key: str = ""
    race_model: str = "claude-opus-5-5"


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
