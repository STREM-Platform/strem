"""strem-auth-service — application entrypoint.

Authentication: email + password accounts
with a JWT access token and a rotating, server-side refresh token. The database
engine is configured on startup; `GET /health` stays unversioned for probes.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from app.db import configure
from app.errors import register_error_handlers
from app.observability import configure_logging, install_request_logging
from app.routers import auth


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    configure(get_settings().database_url)
    yield


def create_app() -> FastAPI:
    """Build the FastAPI application with routes and error handlers."""
    application = FastAPI(
        title="strem-auth-service",
        version="1.0.0",
        description="Authentication and session management for STREM.",
        lifespan=lifespan,
    )
    register_error_handlers(application)
    configure_logging(application.title)
    install_request_logging(application, application.title)
    application.include_router(auth.router)

    @application.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        """Liveness probe used by CI, Docker, and orchestration."""
        return {"status": "ok", "service": "strem-auth-service"}

    return application


app = create_app()
