"""strem-ai-orchestrator — application entrypoint.

The Race OS race team (strem-docs#26): the deterministic race engine,
guarded AI personalization, briefs, chat and adaptation, plus enrichment (places,
conditions, licensed photos).
It owns no race facts and copies no raw logs. `GET /health` stays unversioned.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from app.db import configure
from app.errors import register_error_handlers
from app.observability import configure_logging, install_request_logging
from app.race.graph import review
from app.race.router import router as race_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    configure(get_settings().database_url)
    # Prepare the review checkpointer before any request: its Postgres setup builds
    # indexes CONCURRENTLY, which waits on every open transaction.
    await review.checkpointer()
    yield


def create_app() -> FastAPI:
    """Build the FastAPI application with routes and error handlers."""
    application = FastAPI(
        title="strem-ai-orchestrator",
        version="2.0.0",
        description="The Race OS race team: race engine, guarded AI layers, briefs and chat.",
        lifespan=lifespan,
    )
    register_error_handlers(application)
    configure_logging(application.title)
    install_request_logging(application, application.title)
    application.include_router(race_router)

    @application.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        """Liveness probe used by CI, Docker, and orchestration."""
        return {"status": "ok", "service": "strem-ai-orchestrator"}

    return application


app = create_app()
