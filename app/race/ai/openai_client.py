"""The race team on OpenAI GPT models (Responses API over httpx).

Same contract as the Claude client: strict JSON-schema structured outputs, the
shared rules + race context sent first (OpenAI caches long identical prefixes
automatically), and every failure — bad key, no quota, rate limit, outage,
refusal, cut-off — raised as `AIUnavailable` with an honest reason so callers
fall back to the race engine. No SDK dependency: images rebuild offline.
"""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Any

import httpx

from app.race.ai.client import AIStatus, AIUnavailable

log = logging.getLogger(__name__)


def to_openai_part(block: dict[str, Any]) -> dict[str, Any]:
    """Anthropic-style attachment blocks → Responses API input parts."""
    source = block.get("source") or {}
    if block.get("type") == "image" and source.get("type") == "base64":
        return {
            "type": "input_image",
            "image_url": f"data:{source['media_type']};base64,{source['data']}",
            "detail": "high",
        }
    if block.get("type") == "document" and source.get("type") == "base64":
        media = source.get("media_type", "application/pdf")
        return {
            "type": "input_file",
            "filename": block.get("title") or "plan.pdf",
            "file_data": f"data:{media};base64,{source['data']}",
        }
    if block.get("type") == "text":
        return {"type": "input_text", "text": str(block.get("text", ""))}
    raise AIUnavailable("This file type cannot be sent to the AI.")


class OpenAIRaceAI:
    COOLDOWN_SECONDS = 600

    def __init__(
        self, api_key: str, model: str, base_url: str = "https://api.openai.com/v1"
    ) -> None:
        verify: str | bool = os.environ.get("SSL_CERT_FILE") or True
        self.client = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=httpx.Timeout(240.0, connect=15.0),
            verify=verify,
        )
        self.model = model
        self._disabled_until = 0.0
        self._reason: str | None = None
        # Non-reasoning models reject `reasoning`; learnt on the first 400.
        self._reasoning = True

    def status(self) -> AIStatus:
        if time.monotonic() < self._disabled_until:
            return AIStatus(False, self.model, self._reason)
        return AIStatus(True, self.model)

    def _disable(self, reason: str) -> AIUnavailable:
        self._disabled_until = time.monotonic() + self.COOLDOWN_SECONDS
        self._reason = reason
        return AIUnavailable(reason)

    async def _call(self, body: dict[str, Any], effort: str) -> str:
        status = self.status()
        if not status.available:
            raise AIUnavailable(status.reason or "AI is temporarily unavailable.")
        payload = {"model": self.model, "store": False, **body}
        if self._reasoning:
            payload["reasoning"] = {"effort": effort}
        try:
            response = await self.client.post("/responses", json=payload)
        except httpx.HTTPError as exc:
            raise AIUnavailable("The AI provider could not be reached.") from exc
        if response.status_code == 400 and self._reasoning and "reasoning" in response.text.lower():
            self._reasoning = False
            return await self._call(body, effort)
        if response.status_code >= 400:
            raise self._error(response)
        try:
            data = response.json()
        except ValueError as exc:
            raise AIUnavailable("The AI returned unreadable output.") from exc
        if data.get("status") == "incomplete":
            reason = (data.get("incomplete_details") or {}).get("reason")
            if reason == "content_filter":
                raise AIUnavailable("The AI declined this request.")
            raise AIUnavailable("The AI response was cut off.")
        parts: list[str] = []
        for item in data.get("output") or []:
            if item.get("type") != "message":
                continue
            for content in item.get("content") or []:
                if content.get("type") == "refusal":
                    raise AIUnavailable("The AI declined this request.")
                if content.get("type") == "output_text":
                    parts.append(str(content.get("text", "")))
        return "".join(parts)

    def _error(self, response: httpx.Response) -> AIUnavailable:
        try:
            error = response.json().get("error") or {}
        except ValueError:
            error = {}
        code = str(error.get("code") or error.get("type") or "")
        message = str(error.get("message") or "")
        log.warning("openai error %s %s: %s", response.status_code, code, message[:300])
        if response.status_code == 401:
            return self._disable("The OpenAI API key was rejected.")
        if code == "insufficient_quota":
            return self._disable(
                "The OpenAI account has no credit left — add credit to re-enable the AI race team."
            )
        if response.status_code == 429:
            return AIUnavailable("The AI is rate limited right now — try again shortly.")
        if response.status_code in (403, 404) or code == "model_not_found":
            return self._disable(f"The OpenAI account cannot use the model {self.model}.")
        if response.status_code >= 500:
            return AIUnavailable("The AI provider had an error — try again shortly.")
        return AIUnavailable("The AI request was rejected.")

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
        content = [
            *(to_openai_part(a) for a in attachments or []),
            {"type": "input_text", "text": prompt},
        ]
        text = await self._call(
            {
                "instructions": f"{rules}\n\n{context}",
                "input": [{"role": "user", "content": content}],
                "max_output_tokens": max_tokens,
                "text": {
                    "format": {
                        "type": "json_schema",
                        "name": "race_output",
                        "schema": schema,
                        "strict": True,
                    }
                },
            },
            effort,
        )
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
        text = await self._call(
            {
                "instructions": f"{rules}\n\n{context}",
                "input": [{"role": m["role"], "content": m["content"]} for m in messages],
                "max_output_tokens": max_tokens,
            },
            effort,
        )
        text = text.strip()
        if not text:
            raise AIUnavailable("The AI returned an empty answer.")
        return text
