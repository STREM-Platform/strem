"""strem-api-gateway — application entrypoint.

The mobile-facing entrypoint: routes `/v1` requests to the owning backend service
and hands off the caller's bearer token. It owns no domain data, no database, and
no business logic. `GET /health` stays unversioned for probes.

The edge is hardened here: a request-size cap, per-IP and per-token rate limiting
(Redis-backed, shared across instances; in-memory fallback), and security
response headers on everything.
"""

import hashlib
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from starlette.middleware.base import RequestResponseEndpoint

from app.config import Settings, get_settings, upstream_for
from app.errors import AppError, register_error_handlers
from app.observability import configure_logging, install_request_logging, request_id_var
from app.proxy import forward
from app.ratelimit import InMemoryRateLimiter, RateDecision, RateLimiter, RedisRateLimiter

_PROXY_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"]

# Conservative, framework-agnostic security headers for every response. HSTS is
# added only over HTTPS (see `_with_security_headers`).
_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Opener-Policy": "same-origin",
}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    app.state.client = httpx.AsyncClient(timeout=settings.upstream_timeout_seconds)
    if settings.redis_url:
        redis: Redis = Redis.from_url(settings.redis_url, decode_responses=True)
        app.state.redis = redis
        app.state.rate_limiter = RedisRateLimiter(
            redis, settings.rate_limit_max, settings.rate_limit_window_seconds
        )
    try:
        yield
    finally:
        await app.state.client.aclose()
        redis_client = getattr(app.state, "redis", None)
        if redis_client is not None:
            await redis_client.aclose()


def _with_security_headers(response: Response, request: Request) -> Response:
    for name, value in _SECURITY_HEADERS.items():
        response.headers.setdefault(name, value)
    if request.url.scheme == "https":
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=63072000; includeSubDomains"
        )
    return response


def _error(status: int, code: str, message: str, request: Request) -> Response:
    return _with_security_headers(
        JSONResponse(status_code=status, content={"code": code, "message": message}), request
    )


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _check_rate_limit(limiter: RateLimiter, request: Request) -> RateDecision:
    by_ip = await limiter.hit(f"ip:{_client_ip(request)}")
    if not by_ip.allowed:
        return by_ip
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        digest = hashlib.sha256(auth.encode("utf-8")).hexdigest()[:32]
        return await limiter.hit(f"tok:{digest}")
    return by_ip


def create_app() -> FastAPI:
    """Build the FastAPI gateway application."""
    settings = get_settings()
    application = FastAPI(
        title="strem-api-gateway",
        version="1.0.0",
        description="Mobile-facing routing and auth handoff for STREM. Owns no domain data.",
        lifespan=lifespan,
    )

    # Defaults so the guard works even without a running lifespan (e.g. tests).
    # The lifespan upgrades the limiter to Redis when configured.
    application.state.rate_limiter = InMemoryRateLimiter(
        settings.rate_limit_max, settings.rate_limit_window_seconds
    )
    application.state.max_request_bytes = settings.max_request_bytes
    application.state.max_course_request_bytes = settings.max_course_request_bytes
    application.state.max_plan_import_request_bytes = settings.max_plan_import_request_bytes

    def request_limit(request: Request) -> int:
        if (
            request.method == "PUT"
            and request.url.path.startswith("/v1/training/missions/")
            and request.url.path.endswith("/course")
        ):
            return int(request.app.state.max_course_request_bytes)
        if (
            request.method == "POST"
            and request.url.path.startswith("/v1/ai/race/")
            and request.url.path.endswith("/plan/import")
        ):
            return int(request.app.state.max_plan_import_request_bytes)
        return int(request.app.state.max_request_bytes)

    @application.middleware("http")
    async def guard(request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Health probes and CORS preflight bypass the budget and size check.
        if request.url.path == "/health" or request.method == "OPTIONS":
            return _with_security_headers(await call_next(request), request)

        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > request_limit(request):
                    return _error(413, "payload_too_large", "Request body is too large.", request)
            except ValueError:
                pass

        decision = await _check_rate_limit(request.app.state.rate_limiter, request)
        if not decision.allowed:
            response = _error(429, "rate_limited", "Too many requests. Please slow down.", request)
            response.headers["Retry-After"] = str(decision.retry_after)
            return response

        return _with_security_headers(await call_next(request), request)

    # CORS is added last so it stays the outermost layer: it answers the preflight
    # OPTIONS before the guard, and native mobile clients are unaffected.
    _attach_cors(application, settings)

    # Observability: originate (or accept) X-Request-ID and log every request.
    # Added after CORS so it is outermost — the request id is set before the
    # guard, the proxy, and CORS all run.
    configure_logging(application.title)
    install_request_logging(application, application.title)

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
        # Propagate the gateway-originated request id so the call is traceable
        # across services.
        forwarded_headers = dict(request.headers)
        forwarded_headers["x-request-id"] = request_id_var.get()
        body = bytearray()
        async for chunk in request.stream():
            if len(body) + len(chunk) > request_limit(request):
                return _error(413, "payload_too_large", "Request body is too large.", request)
            body.extend(chunk)
        try:
            upstream_response = await forward(
                client,
                upstream_base=upstream,
                method=request.method,
                downstream_path=path,
                query_string=request.url.query,
                headers=forwarded_headers,
                body=bytes(body),
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
            headers={
                name: upstream_response.headers[name]
                for name in ("etag", "cache-control")
                if name in upstream_response.headers
            },
        )

    return application


def _attach_cors(application: FastAPI, settings: Settings) -> None:
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origin_list,
        allow_origin_regex=settings.cors_allow_origin_regex or None,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


app = create_app()
