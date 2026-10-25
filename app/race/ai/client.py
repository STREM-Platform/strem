"""The race team's model client: Claude via the Anthropic SDK.

Structured outputs return schema-valid JSON; the shared race context sits in a
cached system block so parallel layer builds and chat turns reuse it. Refusal
fallbacks are enabled (server-side, retried on Opus 4.8). Any failure — no key, no
credit, rate limit, outage, refusal — raises `AIUnavailable` with an honest
reason so callers fall back to the race engine instead of inventing output.
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from typing import Any, Protocol

import anthropic

from app.config import get_settings

FALLBACK_BETA = "server-side-fallback-2026-06-01"
# A refused request is retried on this model inside the same call.
FALLBACK_MODEL = "claude-opus-4-8"


class AIUnavailable(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


@dataclass
class AIStatus:
    available: bool
    model: str | None
    reason: str | None = None


class RaceAI(Protocol):
    model: str

    def status(self) -> AIStatus: ...

    async def complete_json(
        self,
        *,
        rules: str,
        context: str,
        prompt: str,
        schema: dict[str, Any],
        max_tokens: int = 16000,
        effort: str = "medium",
        attachments: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]: ...

    async def complete_text(
        self,
        *,
        rules: str,
        context: str,
        messages: list[dict[str, str]],
        max_tokens: int = 2000,
        effort: str = "low",
    ) -> str: ...


class UnavailableAI:
    """Used when no API key is configured: the engine carries the product."""

    model = "none"

    def __init__(self, reason: str = "No Anthropic API key is configured on this server.") -> None:
        self._reason = reason

    def status(self) -> AIStatus:
        return AIStatus(False, None, self._reason)

    async def complete_json(self, **_: Any) -> dict[str, Any]:
        raise AIUnavailable(self._reason)

    async def complete_text(self, **_: Any) -> str:
        raise AIUnavailable(self._reason)


class ClaudeRaceAI:
    COOLDOWN_SECONDS = 600

    def __init__(self, api_key: str, model: str) -> None:
        verify = os.environ.get("SSL_CERT_FILE")
        http_client = anthropic.DefaultAsyncHttpxClient(verify=verify) if verify else None
        self.client = anthropic.AsyncAnthropic(
            api_key=api_key, http_client=http_client, timeout=180.0, max_retries=1
        )
        self.model = model
        self._disabled_until = 0.0
        self._reason: str | None = None

    def status(self) -> AIStatus:
        if time.monotonic() < self._disabled_until:
            return AIStatus(False, self.model, self._reason)
        return AIStatus(True, self.model)

    def _disable(self, reason: str) -> AIUnavailable:
        self._disabled_until = time.monotonic() + self.COOLDOWN_SECONDS
        self._reason = reason
        return AIUnavailable(reason)

    def _system(self, rules: str, context: str) -> list[dict[str, Any]]:
        return [
            {"type": "text", "text": rules},
            {"type": "text", "text": context, "cache_control": {"type": "ephemeral"}},
        ]

    async def _call(self, **params: Any) -> Any:
        status = self.status()
        if not status.available:
            raise AIUnavailable(status.reason or "AI is temporarily unavailable.")
        try:
            async with self.client.beta.messages.stream(
                model=self.model,
                betas=[FALLBACK_BETA],
                fallbacks=[{"model": FALLBACK_MODEL}],
                **params,
            ) as stream:
                message = await stream.get_final_message()
        except anthropic.AuthenticationError as exc:
            raise self._disable("The Anthropic API key was rejected.") from exc
        except anthropic.PermissionDeniedError as exc:
            raise self._disable("The Anthropic account cannot use this model.") from exc
        except anthropic.BadRequestError as exc:
            text = str(exc.message).lower()
            if "credit balance" in text or "billing" in text:
                raise self._disable(
                    "The Anthropic account has no credit left — "
                    "add credit to re-enable the AI race team."
                ) from exc
            raise AIUnavailable("The AI request was rejected.") from exc
        except anthropic.RateLimitError as exc:
            raise AIUnavailable("The AI is rate limited right now — try again shortly.") from exc
        except anthropic.APIStatusError as exc:
            raise AIUnavailable("The AI provider had an error — try again shortly.") from exc
        except anthropic.APIConnectionError as exc:
            raise AIUnavailable("The AI provider could not be reached.") from exc
        if message.stop_reason == "refusal":
            raise AIUnavailable("The AI declined this request.")
        if message.stop_reason == "max_tokens":
            raise AIUnavailable("The AI response was cut off.")
        return message

    async def complete_json(
        self,
        *,
        rules: str,
        context: str,
        prompt: str,
        schema: dict[str, Any],
        max_tokens: int = 16000,
        effort: str = "medium",
        attachments: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        # Images and PDFs (e.g. a plan screenshot) go before the instruction.
        content: str | list[dict[str, Any]] = (
            [*attachments, {"type": "text", "text": prompt}] if attachments else prompt
        )
        message = await self._call(
            max_tokens=max_tokens,
            system=self._system(rules, context),
            messages=[{"role": "user", "content": content}],
            output_config={"effort": effort, "format": {"type": "json_schema", "schema": schema}},
        )
        text = "".join(block.text for block in message.content if block.type == "text")
        try:
            value = json.loads(text)
        except json.JSONDecodeError as exc:
            raise AIUnavailable("The AI returned unreadable output.") from exc
        if not isinstance(value, dict):
            raise AIUnavailable("The AI returned unexpected output.")
        return value

    async def complete_text(
        self,
        *,
        rules: str,
        context: str,
        messages: list[dict[str, str]],
        max_tokens: int = 2000,
        effort: str = "low",
    ) -> str:
        message = await self._call(
            max_tokens=max_tokens,
            system=self._system(rules, context),
            messages=messages,
            output_config={"effort": effort},
        )
        text = "".join(block.text for block in message.content if block.type == "text").strip()
        if not text:
            raise AIUnavailable("The AI returned an empty answer.")
        return text


_ai: RaceAI | None = None


def get_race_ai() -> RaceAI:
    """FastAPI dependency (tests override with a scripted model)."""
    global _ai
    if _ai is None:
        settings = get_settings()
        if settings.anthropic_api_key:
            _ai = ClaudeRaceAI(settings.anthropic_api_key, settings.race_model)
        else:
            _ai = UnavailableAI()
    return _ai


def strict_schema(schema: dict[str, Any]) -> dict[str, Any]:
    """Adapt a Pydantic JSON schema to structured-output rules: every object
    closed (additionalProperties false) with all properties required; drop
    numeric/string/array constraint keywords and defaults the API rejects."""
    drop = {
        "minimum",
        "maximum",
        "exclusiveMinimum",
        "exclusiveMaximum",
        "multipleOf",
        "minLength",
        "maxLength",
        "pattern",
        "minItems",
        "maxItems",
        "uniqueItems",
        "default",
        "title",
    }

    def walk(node: Any) -> Any:
        if isinstance(node, dict):
            out: dict[str, Any] = {}
            for key, value in node.items():
                if key in drop:
                    continue
                if key in ("properties", "$defs") and isinstance(value, dict):
                    # Keys here are property / definition names, not keywords.
                    out[key] = {name: walk(sub) for name, sub in value.items()}
                else:
                    out[key] = walk(value)
            if out.get("type") == "object" and "properties" in out:
                out["additionalProperties"] = False
                out["required"] = list(out["properties"].keys())
            return out
        if isinstance(node, list):
            return [walk(item) for item in node]
        return node

    return dict(walk(schema))
