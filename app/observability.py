"""Structured logging + request-ID correlation (observability.md baseline).

Every service logs one JSON line per request carrying a request id, so a single
user action can be traced across services. The gateway originates `X-Request-ID`;
each service reads it (or generates one) and echoes it on the response. Sensitive
data (tokens, request bodies, full logs) is never logged.

This module is copied verbatim into each service's `app/`; the service name is
taken from the FastAPI app title, so the code is identical everywhere.
"""

from __future__ import annotations

import json
import logging
import sys
import time
import uuid
from collections.abc import Awaitable, Callable
from contextvars import ContextVar

from fastapi import FastAPI, Request, Response

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

_LOG_EXTRA_FIELDS = ("method", "path", "status", "latency_ms", "event", "error_class")


class JsonLogFormatter(logging.Formatter):
    """Render log records as single-line JSON with the active request id."""

    def __init__(self, service: str) -> None:
        super().__init__()
        self._service = service

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "service": self._service,
            "request_id": request_id_var.get(),
            "logger": record.name,
            "msg": record.getMessage(),
        }
        for field in _LOG_EXTRA_FIELDS:
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        if record.exc_info and record.exc_info[0] is not None:
            payload["error_class"] = record.exc_info[0].__name__
        return json.dumps(payload, default=str)


def configure_logging(service: str) -> None:
    """Install the JSON formatter on the root logger (idempotent)."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonLogFormatter(service))
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)


def install_request_logging(app: FastAPI, service: str) -> None:
    """Add a middleware that correlates and logs every request."""
    logger = logging.getLogger(service)

    @app.middleware("http")
    async def _request_logger(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
        token = request_id_var.set(request_id)
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as exc:  # noqa: BLE001 - log any failure with context, then re-raise
            logger.exception(
                "request_failed",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "error_class": type(exc).__name__,
                },
            )
            request_id_var.reset(token)
            raise
        latency_ms = round((time.perf_counter() - start) * 1000, 1)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "request",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "latency_ms": latency_ms,
            },
        )
        request_id_var.reset(token)
        return response
