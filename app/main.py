"""strem-user-service — application entrypoint.

Owns user profiles, onboarding state, and (from strem-user-service#4) the
XP ledger, ranks, and medals. Profile and onboarding endpoints implement
strem-shared-contracts/contracts/user/openapi.yml. `GET /health` stays
unversioned for probes.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from app.db import configure
from app.errors import register_error_handlers
from app.events import configure_publisher
from app.observability import configure_logging, install_request_logging
from app.routers import onboarding, profile, xp


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure(settings.database_url)
    configure_publisher(settings.message_broker_url)
    yield


def create_app() -> FastAPI:
    """Build the FastAPI application with routes and error handlers."""
    application = FastAPI(
        title="strem-user-service",
        version="1.0.0",
        description="User profiles, onboarding, and the XP/rank/medal module for STREM.",
        lifespan=lifespan,
    )
    register_error_handlers(application)
    configure_logging(application.title)
    install_request_logging(application, application.title)
    application.include_router(profile.router)
    application.include_router(onboarding.router)
    application.include_router(xp.router)

    @application.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        """Liveness probe used by CI, Docker, and orchestration."""
        return {"status": "ok", "service": "strem-user-service"}

    return application


app = create_app()
