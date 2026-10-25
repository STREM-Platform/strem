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
    ai_base_url: str = "http://localhost:8006/v1"

    # Per-request upstream timeout (seconds). Generous because AI work is slow:
    # building a Race Mission's layers makes several Claude calls in parallel and
    # personalizing a full training plan can take well over a minute.
    upstream_timeout_seconds: float = 180.0

    # Rate limiting. Redis is shared across gateway instances; empty falls back to
    # a per-process in-memory limiter. Limits apply per window, per scope (client
    # IP and bearer token).
    redis_url: str = ""
    rate_limit_max: int = 240
    rate_limit_window_seconds: int = 60

    # Reject request bodies larger than this many bytes (defends the edge).
    max_request_bytes: int = 1_048_576
    max_course_request_bytes: int = 6 * 1024 * 1024

    # Browser origins allowed to call the gateway (comma-separated). Needed so the
    # Expo web build can reach the API; native clients are unaffected by CORS.
    # Empty by default because the regex below already covers any local-dev port;
    # set this for non-local origins (e.g. a LAN IP or a deployed web host).
    cors_allow_origins: str = ""

    # Regex form of the allow-list. The default matches any localhost port so the
    # local demo works no matter which port the Expo web/Metro dev server lands on
    # (8081 is the default but Expo bumps to 8082+ when it is taken). Set to an
    # empty string and use `cors_allow_origins` to lock origins down for deploys.
    cors_allow_origin_regex: str = r"http://localhost:\d+"

    @property
    def cors_allow_origin_list(self) -> list[str]:
        """`cors_allow_origins` split into a list, ignoring blanks."""
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()


def upstream_for(settings: Settings, first_segment: str) -> str | None:
    """Map the first path segment under /v1 to its upstream base URL."""
    routes: dict[str, str] = {
        "auth": settings.auth_base_url,
        "users": settings.user_base_url,
        "race-missions": settings.user_base_url,  # Athlete-owned mission foundation (#24).
        "training": settings.training_base_url,
        "integrations": settings.training_base_url,  # A3 — lives in training-service
        "ai": settings.ai_base_url,
    }
    return routes.get(first_segment)
