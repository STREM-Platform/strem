"""strem-auth-service — application entrypoint.

Skeleton only. Authentication logic (registration, login, JWT issuance,
refresh-token storage) is implemented against the contract defined in
strem-shared-contracts/contracts/auth/openapi.yml. This module currently
exposes a single health endpoint.
"""

from fastapi import FastAPI

app = FastAPI(
    title="strem-auth-service",
    version="0.1.0",
    description="Authentication and session management for STREM.",
)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    """Liveness probe used by CI, Docker, and orchestration."""
    return {"status": "ok", "service": "strem-auth-service"}
