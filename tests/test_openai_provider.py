"""OpenAI GPT as the race team's model (issue #42). No network: a mock transport."""

from __future__ import annotations

import asyncio
import json
from typing import Any

import httpx
import pytest

from app.config import Settings
from app.race.ai import client as ai_client
from app.race.ai.client import AIUnavailable, ClaudeRaceAI, UnavailableAI, build_race_ai
from app.race.ai.openai_client import OpenAIRaceAI

SCHEMA = {
    "type": "object",
    "properties": {"summary": {"type": "string"}},
    "required": ["summary"],
    "additionalProperties": False,
}


def gpt(handler: Any) -> OpenAIRaceAI:
    ai = OpenAIRaceAI("sk-test-only", "gpt-6.1-sol")
    ai.client = httpx.AsyncClient(
        base_url="https://api.openai.test/v1",
        headers=ai.client.headers,
        transport=httpx.MockTransport(handler),
    )
    return ai


def message(text: str) -> dict[str, Any]:
    return {
        "status": "completed",
        "output": [
            {"type": "reasoning", "summary": []},
            {"type": "message", "content": [{"type": "output_text", "text": text}]},
        ],
    }


def test_structured_json_sends_rules_context_schema_and_attachments() -> None:
    seen: list[dict[str, Any]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(json.loads(request.content))
        assert request.url.path == "/v1/responses"
        assert request.headers["authorization"] == "Bearer sk-test-only"
        return httpx.Response(200, json=message('{"summary": "Solid base."}'))

    ai = gpt(handler)
    out = asyncio.run(
        ai.complete_json(
            rules="RULES",
            context="RACE MISSION",
            prompt="Transcribe",
            schema=SCHEMA,
            attachments=[
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": "image/png", "data": "AAA"},
                },
                {
                    "type": "document",
                    "source": {"type": "base64", "media_type": "application/pdf", "data": "BBB"},
                },
            ],
        )
    )
    assert out == {"summary": "Solid base."}
    body = seen[0]
    assert body["model"] == "gpt-6.1-sol" and body["store"] is False
    assert body["instructions"] == "RULES\n\nRACE MISSION"
    assert body["text"]["format"] == {
        "type": "json_schema",
        "name": "race_output",
        "schema": SCHEMA,
        "strict": True,
    }
    assert body["reasoning"] == {"effort": "medium"}
    parts = body["input"][0]["content"]
    assert parts[0] == {
        "type": "input_image",
        "image_url": "data:image/png;base64,AAA",
        "detail": "high",
    }
    assert (
        parts[1]["type"] == "input_file"
        and parts[1]["file_data"] == "data:application/pdf;base64,BBB"
    )
    assert parts[2] == {"type": "input_text", "text": "Transcribe"}


def test_text_chat_and_models_without_reasoning() -> None:
    calls: list[dict[str, Any]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        calls.append(body)
        if "reasoning" in body:
            return httpx.Response(
                400,
                json={"error": {"message": "Unsupported parameter: 'reasoning'.", "code": None}},
            )
        return httpx.Response(200, json=message("  Keep the long run easy.  "))

    ai = gpt(handler)
    msgs = [{"role": "user", "content": "How hard on Saturday?"}]
    answer = asyncio.run(ai.complete_text(rules="R", context="C", messages=msgs))
    assert answer == "Keep the long run easy."
    assert calls[1]["input"] == msgs and "text" not in calls[1]
    asyncio.run(ai.complete_text(rules="R", context="C", messages=msgs))
    assert len(calls) == 3  # learnt once: no more rejected first attempts


@pytest.mark.parametrize(
    ("status", "error", "reason", "disabled"),
    [
        (401, {"message": "bad key", "code": "invalid_api_key"}, "key was rejected", True),
        (429, {"message": "quota", "code": "insufficient_quota"}, "no credit left", True),
        (
            429,
            {"message": "You have no credits remaining.", "code": "credit_balance_exhausted"},
            "no credit left",
            True,
        ),
        (429, {"message": "slow down", "code": "rate_limit_exceeded"}, "rate limited", False),
        (404, {"message": "no model", "code": "model_not_found"}, "cannot use the model", True),
        (500, {"message": "boom"}, "provider had an error", False),
    ],
)
def test_errors_become_honest_reasons(
    status: int, error: dict[str, Any], reason: str, disabled: bool
) -> None:
    ai = gpt(lambda _: httpx.Response(status, json={"error": error}))
    with pytest.raises(AIUnavailable) as caught:
        asyncio.run(ai.complete_json(rules="R", context="C", prompt="P", schema=SCHEMA))
    assert reason in caught.value.reason
    assert ai.status().available is (not disabled)


def test_refusal_and_cut_off_output_are_not_used() -> None:
    refusal = {
        "status": "completed",
        "output": [{"type": "message", "content": [{"type": "refusal", "refusal": "no"}]}],
    }
    cut = {
        "status": "incomplete",
        "incomplete_details": {"reason": "max_output_tokens"},
        "output": [],
    }
    for body, reason in ((refusal, "declined"), (cut, "cut off")):
        ai = gpt(lambda _, b=body: httpx.Response(200, json=b))
        with pytest.raises(AIUnavailable) as caught:
            asyncio.run(ai.complete_json(rules="R", context="C", prompt="P", schema=SCHEMA))
        assert reason in caught.value.reason


def test_provider_selection(monkeypatch: pytest.MonkeyPatch) -> None:
    def pick(**values: str) -> object:
        monkeypatch.setattr(ai_client, "get_settings", lambda: Settings(_env_file=None, **values))  # type: ignore[call-arg]
        return build_race_ai()

    assert isinstance(pick(openai_api_key="sk-x"), OpenAIRaceAI)
    assert isinstance(pick(anthropic_api_key="a", openai_api_key="sk-x"), ClaudeRaceAI)
    assert isinstance(
        pick(ai_provider="openai", anthropic_api_key="a", openai_api_key="sk-x"), OpenAIRaceAI
    )
    chosen = pick(ai_provider="OpenAI", openai_api_key="sk-x", openai_model="gpt-6-astra")
    assert isinstance(chosen, OpenAIRaceAI) and chosen.model == "gpt-6-astra"
    missing = pick(ai_provider="openai")
    assert isinstance(missing, UnavailableAI) and "OpenAI API key" in (
        missing.status().reason or ""
    )
    assert "Unknown AI_PROVIDER" in (pick(ai_provider="gemini").status().reason or "")  # type: ignore[attr-defined]
    assert isinstance(pick(), UnavailableAI)
