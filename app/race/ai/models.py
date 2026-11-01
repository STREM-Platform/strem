"""The race team's model layer on LangChain (ADR 0010, ai#58 phase 1).

`ChatAnthropic` and `ChatOpenAI` replace the two hand-written clients behind the
same `RaceAI` contract, so every caller (brief, chat, layers, plan, adapt,
import) is unchanged. The rules and the race context go first as the system
message (cached on Anthropic); JSON answers use native structured outputs;
attachments become LangChain standard content blocks. Any failure — no key, no
credit, rate limit, outage, refusal, cut-off — raises `AIUnavailable` with an
honest reason so callers fall back to the race engine instead of inventing output.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, AnyMessage, HumanMessage, SystemMessage
from pydantic import SecretStr

from app.race.ai.client import AIStatus, AIUnavailable

log = logging.getLogger(__name__)

FALLBACK_BETA = "server-side-fallback-2026-06-01"
# A refused Anthropic request is retried on this model inside the same call.
FALLBACK_MODEL = "claude-opus-4-8"
BILLING_CODES = {"insufficient_quota", "credit_balance_exhausted", "billing_hard_limit_reached"}


def anthropic_chat(api_key: str, model: str) -> BaseChatModel:
    from langchain_anthropic import ChatAnthropic

    return ChatAnthropic(  # type: ignore[call-arg]
        model=model,
        api_key=SecretStr(api_key),
        max_tokens=16000,
        timeout=180.0,
        max_retries=1,
        streaming=True,
        betas=[FALLBACK_BETA],
        model_kwargs={"fallbacks": [{"model": FALLBACK_MODEL}]},
    )


def openai_chat(api_key: str, model: str, base_url: str) -> BaseChatModel:
    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        model=model,
        api_key=SecretStr(api_key),
        base_url=base_url,
        timeout=240.0,
        max_retries=1,
        use_responses_api=True,
        store=False,
    )


def standard_block(block: dict[str, Any]) -> dict[str, Any]:
    """Anthropic-style attachment blocks → LangChain standard content blocks."""
    source = block.get("source") or {}
    if block.get("type") == "image" and source.get("type") == "base64":
        return {"type": "image", "base64": source["data"], "mime_type": source["media_type"]}
    if block.get("type") == "document" and source.get("type") == "base64":
        return {
            "type": "file",
            "base64": source["data"],
            "mime_type": source.get("media_type", "application/pdf"),
            "filename": block.get("title") or "plan.pdf",
        }
    if block.get("type") == "text":
        return {"type": "text", "text": str(block.get("text", ""))}
    raise AIUnavailable("This file type cannot be sent to the AI.")


class LangChainRaceAI:
    COOLDOWN_SECONDS = 600

    def __init__(self, chat: BaseChatModel, model: str, provider: str) -> None:
        self.chat = chat
        self.model = model
        self.provider = provider  # "anthropic" | "openai"
        self._label = "Anthropic" if provider == "anthropic" else "OpenAI"
        self._disabled_until = 0.0
        self._reason: str | None = None
        # Non-reasoning OpenAI models reject `reasoning`; learnt on the first 400.
        self._reasoning = provider == "openai"

    def status(self) -> AIStatus:
        if time.monotonic() < self._disabled_until:
            return AIStatus(False, self.model, self._reason)
        return AIStatus(True, self.model)

    def _disable(self, reason: str) -> AIUnavailable:
        self._disabled_until = time.monotonic() + self.COOLDOWN_SECONDS
        self._reason = reason
        return AIUnavailable(reason)

    def _system(self, rules: str, context: str) -> SystemMessage:
        if self.provider == "anthropic":
            # The race context is the long, shared part: cache it across calls.
            return SystemMessage(
                content=[
                    {"type": "text", "text": rules},
                    {"type": "text", "text": context, "cache_control": {"type": "ephemeral"}},
                ]
            )
        return SystemMessage(content=f"{rules}\n\n{context}")

    def _configured(self, max_tokens: int, effort: str) -> BaseChatModel:
        if self.provider == "anthropic":
            update: dict[str, Any] = {"max_tokens": max_tokens, "reasoning_effort": effort}
        else:
            update = {
                "max_tokens": max_tokens,
                "reasoning": {"effort": effort} if self._reasoning else None,
            }
        return self.chat.model_copy(update=update)

    async def _run(self, build: Any, messages: list[AnyMessage]) -> Any:
        """Invoke `build()` (a fresh runnable) and turn provider failures into reasons."""
        status = self.status()
        if not status.available:
            raise AIUnavailable(status.reason or "AI is temporarily unavailable.")
        try:
            return await build().ainvoke(messages)
        except AIUnavailable:
            raise
        except Exception as exc:  # provider SDK errors differ; classify by shape
            if self._reasoning and _status(exc) == 400 and "reasoning" in str(exc).lower():
                self._reasoning = False
                return await build().ainvoke(messages)
            raise self._error(exc) from exc

    def _error(self, exc: Exception) -> AIUnavailable:
        name = type(exc).__name__
        if "Connection" in name or "Timeout" in name:
            return AIUnavailable("The AI provider could not be reached.")
        status = _status(exc)
        # OpenAI puts the error object itself in `body` (and `code` on the exception);
        # Anthropic nests it under `error`.
        body = getattr(exc, "body", None)
        error = body.get("error", body) if isinstance(body, dict) else {}
        error = error if isinstance(error, dict) else {}
        code = str(getattr(exc, "code", None) or error.get("code") or error.get("type") or "")
        message = str(getattr(exc, "message", None) or exc).lower()
        log.warning("%s error %s %s: %s", self.provider, status, code, message[:300])
        if status == 401:
            return self._disable(f"The {self._label} API key was rejected.")
        if code in BILLING_CODES or "credit" in message or "billing" in message:
            return self._disable(
                f"The {self._label} account has no credit left — "
                "add credit to re-enable the AI race team."
            )
        if status == 429:
            return AIUnavailable("The AI is rate limited right now — try again shortly.")
        if status in (403, 404) or code == "model_not_found":
            return self._disable(f"The {self._label} account cannot use the model {self.model}.")
        if status is not None and status >= 500:
            return AIUnavailable("The AI provider had an error — try again shortly.")
        if status is None:
            return AIUnavailable("The AI request failed.")
        return AIUnavailable("The AI request was rejected.")

    @staticmethod
    def _checked(message: AIMessage) -> AIMessage:
        meta = message.response_metadata or {}
        details = meta.get("incomplete_details") or {}
        if meta.get("stop_reason") == "refusal" or message.additional_kwargs.get("refusal"):
            raise AIUnavailable("The AI declined this request.")
        if details.get("reason") == "content_filter":
            raise AIUnavailable("The AI declined this request.")
        if meta.get("stop_reason") == "max_tokens" or meta.get("status") == "incomplete":
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
        content: str | list[str | dict[str, Any]] = (
            [*(standard_block(a) for a in attachments), {"type": "text", "text": prompt}]
            if attachments
            else prompt
        )
        messages: list[AnyMessage] = [self._system(rules, context), HumanMessage(content=content)]
        result = await self._run(
            lambda: self._configured(max_tokens, effort).with_structured_output(
                {"title": "race_output", **schema},
                method="json_schema",
                strict=True,
                include_raw=True,
            ),
            messages,
        )
        self._checked(result["raw"])
        value = result.get("parsed")
        if value is None:
            raw = result["raw"].text
            try:
                value = json.loads(raw)
            except (TypeError, json.JSONDecodeError) as exc:
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
        turns: list[AnyMessage] = [self._system(rules, context)]
        for m in messages:
            turns.append(
                HumanMessage(content=m["content"])
                if m["role"] == "user"
                else AIMessage(content=m["content"])
            )
        answer = self._checked(await self._run(lambda: self._configured(max_tokens, effort), turns))
        text = answer.text.strip()
        if not text:
            raise AIUnavailable("The AI returned an empty answer.")
        return text


def _status(exc: Exception) -> int | None:
    status = getattr(exc, "status_code", None)
    return status if isinstance(status, int) else None
