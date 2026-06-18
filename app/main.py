"""strem-ai-orchestrator — application entrypoint.

The MVP AI transformation coach: structured weekly missions and weekly narrative
coaching recaps, against strem-shared-contracts/contracts/ai/openapi.yml. It owns
no domain records and copies no raw logs. `GET /health` stays unversioned.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from app.db import configure
from app.errors import register_error_handlers
from app.events import configure_publisher
from app.observability import configure_logging, install_request_logging
from app.routers import agent, coaching, missions, season, tribe


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure(settings.database_url)
    configure_publisher(settings.message_broker_url)
    yield


def create_app() -> FastAPI:
    """Build the FastAPI application with routes and error handlers."""
    application = FastAPI(
        title="strem-ai-orchestrator",
        version="1.0.0",
        description="MVP AI transformation coach: structured missions and weekly recaps.",
        lifespan=lifespan,
    )
    register_error_handlers(application)
    configure_logging(application.title)
    install_request_logging(application, application.title)
    application.include_router(missions.router)
    application.include_router(coaching.router)
    application.include_router(season.router)
    application.include_router(tribe.router)
    application.include_router(agent.router)

    @application.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        """Liveness probe used by CI, Docker, and orchestration."""
        return {"status": "ok", "service": "strem-ai-orchestrator"}

    return application


app = create_app()
