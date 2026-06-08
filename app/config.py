"""Runtime configuration: the upstream base URLs the gateway routes to.

The gateway owns no data — it forwards `/v1` requests to the owning service and
hands off the caller's bearer token. Each upstream URL already includes the
`/v1` base path. See strem-docs/architecture/adr/0006-authorize-strem-api-gateway.md.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed upstream routing configuration."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    auth_base_url: str = "http://localhost:8001/v1"
    user_base_url: str = "http://localhost:8002/v1"
    training_base_url: str = "http://localhost:8003/v1"
    nutrition_base_url: str = "http://localhost:8004/v1"
    community_base_url: str = "http://localhost:8005/v1"
    ai_base_url: str = "http://localhost:8006/v1"

    # Per-request upstream timeout (seconds).
    upstream_timeout_seconds: float = 10.0


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()


def upstream_for(settings: Settings, first_segment: str) -> str | None:
    """Map the first path segment under /v1 to its upstream base URL."""
    routes: dict[str, str] = {
        "auth": settings.auth_base_url,
        "users": settings.user_base_url,
        "training": settings.training_base_url,
        "nutrition": settings.nutrition_base_url,
        "tribes": settings.community_base_url,
        "ai": settings.ai_base_url,
    }
    return routes.get(first_segment)
