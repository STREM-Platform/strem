"""strem-training-service — application entrypoint.

Implements strem-shared-contracts/contracts/training/openapi.yml: strength,
running, and mobility session logging, publishing `training.session_logged` on
each log. `GET /health` stays unversioned for probes.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from app.db import configure
from app.errors import register_error_handlers
from app.events import configure_publisher
from app.observability import configure_logging, install_request_logging
from app.routers import training


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure(settings.database_url)
    configure_publisher(settings.message_broker_url)
    yield


def create_app() -> FastAPI:
    """Build the FastAPI application with routes and error handlers."""
    application = FastAPI(
        title="strem-training-service",
        version="1.0.0",
        description="Strength, running, and mobility session logging for STREM.",
        lifespan=lifespan,
    )
    register_error_handlers(application)
    configure_logging(application.title)
    install_request_logging(application, application.title)
    application.include_router(training.router)

    @application.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        """Liveness probe used by CI, Docker, and orchestration."""
        return {"status": "ok", "service": "strem-training-service"}

    return application


app = create_app()
