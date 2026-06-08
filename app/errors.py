"""Contract-aligned error handling.

Every failure response uses the shared `Error` shape from the AI contract:
`{ "code": str, "message": str, "details"?: [{field, issue}] }`.
"""

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(Exception):
    """An application error that renders as the contract `Error` object."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: list[dict[str, str]] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


def _error_body(code: str, message: str, details: list[dict[str, str]] | None) -> dict[str, Any]:
    body: dict[str, Any] = {"code": code, "message": message}
    if details:
        body["details"] = details
    return body


def register_error_handlers(app: FastAPI) -> None:
    """Attach the contract-aligned exception handlers to the app."""

    @app.exception_handler(AppError)
    async def _handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(exc.code, exc.message, exc.details),
        )

    @app.exception_handler(RequestValidationError)
    async def _handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        details = [
            {
                "field": ".".join(str(p) for p in err.get("loc", []) if p != "body"),
                "issue": str(err.get("msg", "invalid value")),
            }
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=400,
            content=_error_body("validation_error", "Request validation failed.", details),
        )
