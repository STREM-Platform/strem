"""strem-training-service — application entrypoint.

Implements the training API (OpenAPI at `/docs`): logged and
imported training sessions, connected sources (Strava, Whoop), private mission
courses, Race OS training plans, progress and daily check-ins (strem-docs#26).
`GET /health` stays unversioned for probes.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from app.db import configure
from app.errors import register_error_handlers
from app.observability import configure_logging, install_request_logging
from app.routers import account, athlete_plan, courses, integrations, plans, training


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    configure(get_settings().database_url)
    yield


def create_app() -> FastAPI:
    """Build the FastAPI application with routes and error handlers."""
    application = FastAPI(
        title="strem-training-service",
        version="1.0.0",
        description="Training evidence, connected sources, courses and Race OS plans for STREM.",
        lifespan=lifespan,
    )
    register_error_handlers(application)
    configure_logging(application.title)
    install_request_logging(application, application.title)
    application.include_router(training.router)
    application.include_router(integrations.router)
    application.include_router(courses.router)
    application.include_router(plans.router)
    application.include_router(athlete_plan.router)
    application.include_router(account.router)

    @application.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        """Liveness probe used by CI, Docker, and orchestration."""
        return {"status": "ok", "service": "strem-training-service"}

    return application


app = create_app()
