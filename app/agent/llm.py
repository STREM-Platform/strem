"""Chat model factory for the agent graph.

Claude (langchain-anthropic) when an API key is configured; otherwise a
deterministic ``FallbackChatModel`` so local dev, tests, and an LLM outage all
degrade to a safe grounded reply instead of failing. Both satisfy the LangGraph
agent node's ``BaseChatModel`` + ``bind_tools`` contract.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatResult

from app.config import Settings, get_settings

SAFE_FALLBACK = (
    "I've read everything I can see — your training load, recovery, and what you've "
    "told me. Tell me what you want to focus on and I'll ground the plan in your own "
    "numbers."
)


class FallbackChatModel(BaseChatModel):
    """Keyless, deterministic model. Never calls tools; returns a safe grounded line."""

    @property
    def _llm_type(self) -> str:
        return "forge-fallback"

    def bind_tools(self, tools: Sequence[Any], **kwargs: Any) -> FallbackChatModel:
        return self

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=SAFE_FALLBACK))])

    async def _agenerate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        return self._generate(messages, stop, run_manager, **kwargs)


def build_model(settings: Settings | None = None) -> BaseChatModel:
    """Claude when configured, else the deterministic fallback."""
    settings = settings or get_settings()
    if settings.anthropic_api_key:
        from langchain_anthropic import ChatAnthropic
        from pydantic import SecretStr

        return ChatAnthropic(  # type: ignore[call-arg]
            model=settings.anthropic_model,
            api_key=SecretStr(settings.anthropic_api_key),
            max_tokens=800,
            temperature=0.4,
        )
    return FallbackChatModel()


_model: BaseChatModel | None = None


def get_agent_model() -> BaseChatModel:
    """FastAPI dependency — the configured agent model (tests override)."""
    global _model
    if _model is None:
        _model = build_model()
    return _model
