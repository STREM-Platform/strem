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

    # Base URL of strem-user-service: mission ownership and the deletion-fence
    # generation for courses and plans (ADR 0007).
    user_service_base_url: str = "http://localhost:8002/v1"

    # Connected-source ingestion (A3). Provider OAuth tokens are stored encrypted
    # at rest with this Fernet key (urlsafe base64, 32 bytes). Empty disables
    # connecting sources — a provider token is never stored in plaintext.
    integrations_encryption_key: str = ""

    # Whoop / Strava server-OAuth app credentials. Empty → that provider can't be
    # connected (local dev / tests stub the provider clients).
    whoop_client_id: str = ""
    whoop_client_secret: str = ""
    whoop_redirect_uri: str = ""
    strava_client_id: str = ""
    strava_client_secret: str = ""
    strava_redirect_uri: str = ""


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
