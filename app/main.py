"""strem-user-service — application entrypoint.

Skeleton only. This service owns user profiles, the XP ledger, ranks, medals,
and onboarding state for MVP (see `strem-docs/architecture/service-map.md`).
Data models are defined in `app.schemas`; no persistence or XP calculation
logic exists yet. This module exposes a single health endpoint.
"""

from fastapi import FastAPI

app = FastAPI(
    title="strem-user-service",
    version="0.1.0",
    description="User profiles, onboarding, and the XP/rank/medal progression module for STREM.",
)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    """Liveness probe used by CI, Docker, and orchestration."""
    return {"status": "ok", "service": "strem-user-service"}
