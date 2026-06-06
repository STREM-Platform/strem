"""strem-training-service — application entrypoint.

Skeleton: a FastAPI app exposing a health endpoint. Strength, running, and
mobility session logging is implemented against
strem-shared-contracts/contracts/training/openapi.yml.
"""

from fastapi import FastAPI


def create_app() -> FastAPI:
    """Build the FastAPI application."""
    application = FastAPI(
        title="strem-training-service",
        version="0.1.0",
        description="Strength, running, and mobility session logging for STREM.",
    )

    @application.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        """Liveness probe used by CI, Docker, and orchestration."""
        return {"status": "ok", "service": "strem-training-service"}

    return application


app = create_app()
