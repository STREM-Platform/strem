"""Omniscient coach chat (B1).

A grounded, cited reply over the assembled context (A6). The LLM is pluggable:
``AnthropicLLMClient`` calls Claude when an API key is configured; otherwise (and
on any LLM failure) ``DeterministicLLMClient`` returns a safe grounded fallback so
chat never hard-fails. Every reply is filtered through the A8 guardrails, and the
cited chips come from the user's own data — the model grounding its answer.
"""

from __future__ import annotations

from typing import Any, Protocol

import httpx

from app.config import Settings, get_settings
from app.context import GraphSnapshot
from app.safety import detect_unsafe, guardrails_ok
from app.schemas import CitedDatum, ContextSignals, MemoryItem

_SAFE_FALLBACK = (
    "I've read everything I can see — your training load, recovery and what you've "
    "told me. Tell me what you want to focus on and I'll ground the plan in your own "
    "numbers."
)


def grounding_chips(signals: ContextSignals, memory: list[MemoryItem]) -> list[CitedDatum]:
    """The data the answer is grounded in — only fields that are actually present."""
    chips: list[CitedDatum] = []
    if signals.sleep_hours:
        chips.append(CitedDatum(icon="moon", text=f"Sleep {signals.sleep_hours}"))
    if signals.hrv is not None:
        delta = f" {signals.hrv_delta}" if signals.hrv_delta else ""
        chips.append(CitedDatum(icon="heart", text=f"HRV {signals.hrv}ms{delta}"))
    chips.append(CitedDatum(icon="bolt", text=f"Load {signals.acwr} ({signals.load_label})"))
    chips.append(
        CitedDatum(icon="flame", text=f"Readiness {signals.readiness} ({signals.readiness_label})")
    )
    if memory:
        chips.append(CitedDatum(icon=memory[0].icon, text=memory[0].text))
    return chips[:4]


def build_system_prompt(
    identity: str | None, signals: ContextSignals, memory: list[MemoryItem]
) -> str:
    lines = [
        "You are Forge, STREM's omniscient AI coach. Ground every answer in the "
        "athlete's own data below. Be direct and encouraging. Never shame, never use "
        "vanity metrics, never give medical diagnosis, never invent numbers.",
    ]
    if identity:
        lines.append(f"Identity: {identity}")
    lines.append(
        f"Signals: readiness {signals.readiness} ({signals.readiness_label}); "
        f"7-day load {signals.load7}, ACWR {signals.acwr} ({signals.load_label}); "
        f"momentum {signals.momentum}."
        + (f" Sleep {signals.sleep_hours}." if signals.sleep_hours else "")
        + (f" HRV {signals.hrv}ms {signals.hrv_delta or ''}." if signals.hrv is not None else "")
    )
    if memory:
        lines.append("Memory: " + "; ".join(m.text for m in memory[:6]))
    return "\n".join(lines)


class LLMClient(Protocol):
    async def complete(self, system: str, message: str) -> str: ...


class DeterministicLLMClient:
    """Offline, key-free coach voice — also the fallback when the LLM is down."""

    async def complete(self, system: str, message: str) -> str:
        return _SAFE_FALLBACK


class AnthropicLLMClient:
    """Calls the Anthropic Messages API (Claude)."""

    def __init__(self, api_key: str, model: str) -> None:
        self._api_key = api_key
        self._model = model

    async def complete(self, system: str, message: str) -> str:
        payload: dict[str, Any] = {
            "model": self._model,
            "max_tokens": 600,
            "system": system,
            "messages": [{"role": "user", "content": message}],
        }
        headers = {
            "x-api-key": self._api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                "https://api.anthropic.com/v1/messages", json=payload, headers=headers
            )
            res.raise_for_status()
            blocks = res.json().get("content", [])
            return "".join(b.get("text", "") for b in blocks if b.get("type") == "text").strip()


_client: LLMClient | None = None


def get_llm_client() -> LLMClient:
    """Anthropic when configured, else the deterministic client (FastAPI dependency)."""
    global _client
    if _client is None:
        settings: Settings = get_settings()
        if settings.anthropic_api_key:
            _client = AnthropicLLMClient(settings.anthropic_api_key, settings.anthropic_model)
        else:
            _client = DeterministicLLMClient()
    return _client


async def reply(
    client: LLMClient,
    *,
    identity: str | None,
    snapshot: GraphSnapshot,
    memory: list[MemoryItem],
    message: str,
) -> tuple[str, list[CitedDatum]]:
    """Produce a guardrail-clean, cited reply. Falls back to a safe grounded line
    if the LLM errors or the output trips a guardrail."""
    # Care-redirect (crisis / medical / supplement) short-circuits before the LLM.
    redirect = detect_unsafe(message)
    if redirect is not None:
        return redirect, []

    system = build_system_prompt(identity, snapshot.signals, memory)
    try:
        text = await client.complete(system, message)
    except Exception:  # noqa: BLE001 — chat must never hard-fail; fall back safely
        text = _SAFE_FALLBACK
    if not text or not guardrails_ok(text):
        text = _SAFE_FALLBACK
    return text, grounding_chips(snapshot.signals, memory)
