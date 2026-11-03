"""The race team's LangChain model layer (ADR 0010, ai#58 phase 1).

No network: Claude and GPT run against mock HTTP transports, so these tests pin
what goes over the wire (system context, cache control, structured output,
attachments, effort) and how provider failures become honest reasons.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

import anthropic
import httpx
import httpx2  # the Anthropic SDK's HTTP client
import pytest
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from app.config import Settings
from app.race.ai import client as ai_client
from app.race.ai.client import AIUnavailable, UnavailableAI, build_race_ai
from app.race.ai.models import FALLBACK_BETA, FALLBACK_MODEL, LangChainRaceAI, anthropic_chat

SCHEMA = {
    "type": "object",
    "properties": {"summary": {"type": "string"}},
    "required": ["summary"],
    "additionalProperties": False,
}
ATTACHMENTS = [
    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "AAA"}},
    {
        "type": "document",
        "source": {"type": "base64", "media_type": "application/pdf", "data": "BBB"},
    },
]


# ── OpenAI (Responses API) ───────────────────────────────────────────────────


def openai_response(text: str, **extra: Any) -> dict[str, Any]:
    return {
        "id": "resp_1",
        "object": "response",
        "created_at": 0,
        "model": "gpt-6.1-sol",
        "status": "completed",
        "output": [
            {
                "type": "message",
                "id": "msg_1",
                "role": "assistant",
                "status": "completed",
                "content": [{"type": "output_text", "text": text, "annotations": []}],
            }
        ],
        "usage": {"input_tokens": 10, "output_tokens": 5, "total_tokens": 15},
        **extra,
    }


def gpt(handler: Any) -> LangChainRaceAI:
    chat = ChatOpenAI(
        model="gpt-6.1-sol",
        api_key=SecretStr("sk-test-only"),
        base_url="https://api.openai.test/v1",
        use_responses_api=True,
        store=False,
        max_retries=0,
        http_async_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    return LangChainRaceAI(chat, "gpt-6.1-sol", "openai")


def test_gpt_structured_json_sends_context_schema_effort_and_attachments() -> None:
    seen: list[dict[str, Any]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(json.loads(request.content))
        assert request.url.path == "/v1/responses"
        assert request.headers["authorization"] == "Bearer sk-test-only"
        return httpx.Response(200, json=openai_response('{"summary": "Solid base."}'))

    out = asyncio.run(
        gpt(handler).complete_json(
            rules="RULES",
            context="RACE MISSION",
            prompt="Transcribe",
            schema=SCHEMA,
            attachments=ATTACHMENTS,
        )
    )
    assert out == {"summary": "Solid base."}
    body = seen[0]
    assert body["model"] == "gpt-6.1-sol" and body["store"] is False
    assert body["reasoning"] == {"effort": "medium"}
    assert (
        body["text"]["format"]["type"] == "json_schema" and body["text"]["format"]["strict"] is True
    )
    assert body["text"]["format"]["schema"]["properties"] == SCHEMA["properties"]
    wire = json.dumps(body["input"])
    assert "RULES\\n\\nRACE MISSION" in wire and "Transcribe" in wire
    assert "data:image/png;base64,AAA" in wire and "BBB" in wire


def test_gpt_chat_learns_models_without_reasoning() -> None:
    calls: list[dict[str, Any]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        calls.append(body)
        if "reasoning" in body:
            return httpx.Response(
                400,
                json={"error": {"message": "Unsupported parameter: 'reasoning'.", "code": None}},
            )
        return httpx.Response(200, json=openai_response("  Keep the long run easy.  "))

    ai = gpt(handler)
    turns = [
        {"role": "user", "content": "How hard on Saturday?"},
        {"role": "assistant", "content": "Easy."},
        {"role": "user", "content": "And Sunday?"},
    ]
    assert (
        asyncio.run(ai.complete_text(rules="R", context="C", messages=turns))
        == "Keep the long run easy."
    )
    assert "text" not in calls[1] or calls[1]["text"].get("format", {}).get("type") != "json_schema"
    asyncio.run(ai.complete_text(rules="R", context="C", messages=turns))
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
def test_gpt_errors_become_honest_reasons(
    status: int, error: dict[str, Any], reason: str, disabled: bool
) -> None:
    ai = gpt(lambda _: httpx.Response(status, json={"error": error}))
    with pytest.raises(AIUnavailable) as caught:
        asyncio.run(ai.complete_json(rules="R", context="C", prompt="P", schema=SCHEMA))
    assert reason in caught.value.reason
    assert ai.status().available is (not disabled)


def test_gpt_cut_off_output_is_not_used() -> None:
    cut = openai_response(
        "", status="incomplete", incomplete_details={"reason": "max_output_tokens"}
    )
    with pytest.raises(AIUnavailable) as caught:
        asyncio.run(
            gpt(lambda _: httpx.Response(200, json=cut)).complete_text(
                rules="R", context="C", messages=[{"role": "user", "content": "x"}]
            )
        )
    assert "cut off" in caught.value.reason


# ── Anthropic (Messages API, streamed) ───────────────────────────────────────


def sse(text: str, stop_reason: str = "end_turn") -> str:
    events = [
        (
            "message_start",
            {
                "type": "message_start",
                "message": {
                    "id": "msg_1",
                    "type": "message",
                    "role": "assistant",
                    "model": "claude-opus-5-5",
                    "content": [],
                    "stop_reason": None,
                    "stop_sequence": None,
                    "usage": {"input_tokens": 10, "output_tokens": 0},
                },
            },
        ),
        (
            "content_block_start",
            {
                "type": "content_block_start",
                "index": 0,
                "content_block": {"type": "text", "text": ""},
            },
        ),
        (
            "content_block_delta",
            {
                "type": "content_block_delta",
                "index": 0,
                "delta": {"type": "text_delta", "text": text},
            },
        ),
        ("content_block_stop", {"type": "content_block_stop", "index": 0}),
        (
            "message_delta",
            {
                "type": "message_delta",
                "delta": {"stop_reason": stop_reason, "stop_sequence": None},
                "usage": {"output_tokens": 5},
            },
        ),
        ("message_stop", {"type": "message_stop"}),
    ]
    return "".join(f"event: {name}\ndata: {json.dumps(data)}\n\n" for name, data in events)


def claude(handler: Any) -> LangChainRaceAI:
    chat = anthropic_chat("sk-ant-test-only", "claude-opus-5-5")
    assert isinstance(chat, ChatAnthropic)
    # ChatAnthropic builds its SDK client lazily; swap in one on a mock transport.
    chat.__dict__["_async_client"] = anthropic.AsyncAnthropic(
        api_key="sk-ant-test-only",
        max_retries=0,
        http_client=httpx2.AsyncClient(transport=httpx2.MockTransport(handler)),
    )
    return LangChainRaceAI(chat, "claude-opus-5-5", "anthropic")


def test_claude_caches_the_race_context_and_uses_native_structured_output() -> None:
    seen: list[dict[str, Any]] = []

    def handler(request: httpx2.Request) -> httpx2.Response:
        seen.append(json.loads(request.content))
        return httpx2.Response(
            200,
            text=sse('{"summary": "Fuel early."}'),
            headers={"content-type": "text/event-stream"},
        )

    out = asyncio.run(
        claude(handler).complete_json(
            rules="RULES",
            context="RACE MISSION",
            prompt="Build",
            schema=SCHEMA,
            effort="high",
            attachments=ATTACHMENTS,
        )
    )
    assert out == {"summary": "Fuel early."}
    body = seen[0]
    assert body["system"][0]["text"] == "RULES"
    assert body["system"][1] == {
        "type": "text",
        "text": "RACE MISSION",
        "cache_control": {"type": "ephemeral"},
    }
    assert body["output_config"]["format"]["type"] == "json_schema"
    assert body["output_config"]["effort"] == "high"
    assert body["fallbacks"] == [{"model": FALLBACK_MODEL}] and body["stream"] is True
    content = body["messages"][0]["content"]
    assert content[0]["type"] == "image" and content[0]["source"]["data"] == "AAA"
    assert content[1]["type"] == "document" and content[1]["source"]["data"] == "BBB"
    assert content[2] == {"type": "text", "text": "Build"}


def test_claude_sends_the_fallback_beta_and_alternating_turns() -> None:
    seen: list[httpx2.Request] = []

    def handler(request: httpx2.Request) -> httpx2.Response:
        seen.append(request)
        return httpx2.Response(
            200,
            text=sse("  Hold back on the first climb.  "),
            headers={"content-type": "text/event-stream"},
        )

    turns = [
        {"role": "user", "content": "Pacing?"},
        {"role": "assistant", "content": "Even."},
        {"role": "user", "content": "Climb?"},
    ]
    answer = asyncio.run(claude(handler).complete_text(rules="R", context="C", messages=turns))
    assert answer == "Hold back on the first climb."
    assert FALLBACK_BETA in seen[0].headers.get("anthropic-beta", "")
    assert [m["role"] for m in json.loads(seen[0].content)["messages"]] == [
        "user",
        "assistant",
        "user",
    ]


@pytest.mark.parametrize(("stop", "reason"), [("refusal", "declined"), ("max_tokens", "cut off")])
def test_claude_refusal_and_cut_off_are_not_used(stop: str, reason: str) -> None:
    ai = claude(
        lambda _: httpx2.Response(
            200, text=sse("partial", stop), headers={"content-type": "text/event-stream"}
        )
    )
    with pytest.raises(AIUnavailable) as caught:
        asyncio.run(
            ai.complete_text(rules="R", context="C", messages=[{"role": "user", "content": "x"}])
        )
    assert reason in caught.value.reason


@pytest.mark.parametrize(
    ("status", "error", "reason", "disabled"),
    [
        (
            401,
            {"type": "authentication_error", "message": "invalid x-api-key"},
            "key was rejected",
            True,
        ),
        (
            400,
            {"type": "invalid_request_error", "message": "Your credit balance is too low."},
            "no credit left",
            True,
        ),
        (429, {"type": "rate_limit_error", "message": "slow down"}, "rate limited", False),
        (
            529,
            {"type": "overloaded_error", "message": "overloaded"},
            "provider had an error",
            False,
        ),
    ],
)
def test_claude_errors_become_honest_reasons(
    status: int, error: dict[str, Any], reason: str, disabled: bool
) -> None:
    ai = claude(lambda _: httpx2.Response(status, json={"type": "error", "error": error}))
    with pytest.raises(AIUnavailable) as caught:
        asyncio.run(
            ai.complete_text(rules="R", context="C", messages=[{"role": "user", "content": "x"}])
        )
    assert reason in caught.value.reason
    assert ai.status().available is (not disabled)


# ── Selection ────────────────────────────────────────────────────────────────


def test_provider_selection(monkeypatch: pytest.MonkeyPatch) -> None:
    def pick(**values: str) -> Any:
        monkeypatch.setattr(ai_client, "get_settings", lambda: Settings(_env_file=None, **values))  # type: ignore[call-arg]
        return build_race_ai()

    assert pick(openai_api_key="sk-x").provider == "openai"
    assert pick(anthropic_api_key="a", openai_api_key="sk-x").provider == "anthropic"
    assert (
        pick(ai_provider="openai", anthropic_api_key="a", openai_api_key="sk-x").provider
        == "openai"
    )
    chosen = pick(ai_provider="OpenAI", openai_api_key="sk-x", openai_model="gpt-6-astra")
    assert isinstance(chosen, LangChainRaceAI) and chosen.model == "gpt-6-astra"
    missing = pick(ai_provider="openai")
    assert isinstance(missing, UnavailableAI) and "OpenAI API key" in (
        missing.status().reason or ""
    )
    assert "Unknown AI_PROVIDER" in (pick(ai_provider="gemini").status().reason or "")
    assert isinstance(pick(), UnavailableAI)
