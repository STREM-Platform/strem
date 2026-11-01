"""The race team's model contract (`RaceAI`) and provider selection.

The models themselves run on LangChain (`models.py`, ADR 0010): Claude or GPT,
chosen by `AI_PROVIDER`. Any failure raises `AIUnavailable` with an honest
reason so callers fall back to the race engine instead of inventing output.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from app.config import get_settings


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

    def __init__(self, reason: str = "No AI provider key is configured on this server.") -> None:
        self._reason = reason

    def status(self) -> AIStatus:
        return AIStatus(False, None, self._reason)

    async def complete_json(self, **_: Any) -> dict[str, Any]:
        raise AIUnavailable(self._reason)

    async def complete_text(self, **_: Any) -> str:
        raise AIUnavailable(self._reason)


_ai: RaceAI | None = None


def get_race_ai() -> RaceAI:
    """FastAPI dependency (tests override with a scripted model)."""
    global _ai
    if _ai is None:
        _ai = build_race_ai()
    return _ai


def build_race_ai() -> RaceAI:
    """The configured provider, or an honest `UnavailableAI` saying what is missing."""
    settings = get_settings()
    provider = settings.ai_provider.strip().lower()
    if provider not in ("", "anthropic", "openai"):
        return UnavailableAI(f"Unknown AI_PROVIDER {provider!r}: use anthropic or openai.")
    if provider == "openai" or (
        not provider and not settings.anthropic_api_key and settings.openai_api_key
    ):
        if not settings.openai_api_key:
            return UnavailableAI("AI_PROVIDER is openai but no OpenAI API key is configured.")
        from app.race.ai.models import LangChainRaceAI, openai_chat

        chat = openai_chat(settings.openai_api_key, settings.openai_model, settings.openai_base_url)
        return LangChainRaceAI(chat, settings.openai_model, "openai")
    if settings.anthropic_api_key:
        from app.race.ai.models import LangChainRaceAI, anthropic_chat

        chat = anthropic_chat(settings.anthropic_api_key, settings.race_model)
        return LangChainRaceAI(chat, settings.race_model, "anthropic")
    if provider == "anthropic":
        return UnavailableAI("AI_PROVIDER is anthropic but no Anthropic API key is configured.")
    return UnavailableAI()


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
