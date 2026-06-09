"""strem-api-gateway — application entrypoint.

The mobile-facing entrypoint: routes `/v1` requests to the owning backend service
and hands off the caller's bearer token. It owns no domain data, no database, and
no business logic (ADR 0006). `GET /health` stays unversioned for probes.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings, upstream_for
from app.errors import AppError, register_error_handlers
from app.proxy import forward

_PROXY_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    app.state.client = httpx.AsyncClient(timeout=settings.upstream_timeout_seconds)
    try:
        yield
    finally:
        await app.state.client.aclose()


def create_app() -> FastAPI:
    """Build the FastAPI gateway application."""
    application = FastAPI(
        title="strem-api-gateway",
        version="1.0.0",
        description="Mobile-facing routing and auth handoff for STREM. Owns no domain data.",
        lifespan=lifespan,
    )

    # Allow the Expo web build (a browser origin) to call the gateway. This also
    # answers the CORS preflight `OPTIONS` that the proxy route does not handle.
    # Native mobile clients are unaffected by CORS.
    _settings = get_settings()
    application.add_middleware(
        CORSMiddleware,
        allow_origins=_settings.cors_allow_origin_list,
        allow_origin_regex=_settings.cors_allow_origin_regex or None,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_error_handlers(application)

    @application.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        """Liveness probe used by CI, Docker, and orchestration."""
        return {"status": "ok", "service": "strem-api-gateway"}

    @application.api_route("/v1/{path:path}", methods=_PROXY_METHODS, tags=["gateway"])
    async def proxy(path: str, request: Request) -> Response:
        first_segment = path.split("/", 1)[0]
        upstream = upstream_for(get_settings(), first_segment)
        if upstream is None:
            raise AppError(404, "unknown_route", f"No upstream is configured for /{first_segment}.")

        client: httpx.AsyncClient = request.app.state.client
        try:
            upstream_response = await forward(
                client,
                upstream_base=upstream,
                method=request.method,
                downstream_path=path,
                query_string=request.url.query,
                headers=request.headers,
                body=await request.body(),
            )
        except httpx.RequestError as exc:
            raise AppError(
                502, "upstream_unavailable", f"The {first_segment} service is unavailable."
            ) from exc

        media_type = upstream_response.headers.get("content-type")
        return Response(
            content=upstream_response.content,
            status_code=upstream_response.status_code,
            media_type=media_type,
        )

    return application


app = create_app()
