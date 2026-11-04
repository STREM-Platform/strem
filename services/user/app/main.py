"""strem-user-service — application entrypoint.

Owns user profiles, onboarding and legal acceptance, the athlete profile, and
the Race OS records: Race Missions, their Race Lab layers and race history
(strem-docs#26). OpenAPI at `/docs`.
`GET /health` stays unversioned for probes.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from app.db import configure
from app.errors import register_error_handlers
from app.observability import configure_logging, install_request_logging
from app.routers import (
    account,
    athlete,
    legal,
    mission_layers,
    onboarding,
    profile,
    race_history,
    race_missions,
)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    configure(get_settings().database_url)
    yield


def create_app() -> FastAPI:
    """Build the FastAPI application with routes and error handlers."""
    application = FastAPI(
        title="strem-user-service",
        version="1.0.0",
        description="Profiles, onboarding, legal, athlete profile and Race OS missions for STREM.",
        lifespan=lifespan,
    )
    register_error_handlers(application)
    configure_logging(application.title)
    install_request_logging(application, application.title)
    application.include_router(profile.router)
    application.include_router(onboarding.router)
    application.include_router(legal.router)
    application.include_router(athlete.router)
    application.include_router(race_missions.router)
    application.include_router(mission_layers.router)
    application.include_router(race_history.router)
    application.include_router(account.router)

    @application.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        """Liveness probe used by CI, Docker, and orchestration."""
        return {"status": "ok", "service": "strem-user-service"}

    return application


app = create_app()
