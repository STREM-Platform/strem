"""Endpoint tests for the agent chat (B1) + action log (B3)."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable

import pytest
from langchain_core.messages import AIMessage

from app.agent.llm import SAFE_FALLBACK
from tests.support import Harness, ScriptedChatModel, ai_app, auth_header


def run(scenario: Callable[[Harness], Awaitable[None]]) -> None:
    async def _inner() -> None:
        async with ai_app() as harness:
            await scenario(harness)

    asyncio.run(_inner())


def test_agent_calls_a_tool_mid_turn_and_logs_it() -> None:
    """The LangGraph agent reasons → calls a tool → reasons → answers, and the
    tool call lands in the Activity feed (writeMemory, AUTO → done)."""
    model = ScriptedChatModel(
        responses=[
            AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "remember",
                        "args": {"text": "Lunges bug the left knee", "icon": "heart"},
                        "id": "call_1",
                        "type": "tool_call",
                    }
                ],
            ),
            AIMessage(content="Noted — I'll keep you off lunges and sub split squats."),
        ]
    )

    async def scenario(h: Harness) -> None:
        uid = uuid.uuid4()
        res = await h.client.post(
            "/v1/ai/agent/chat",
            headers=auth_header(uid),
            json={"message": "Please note that lunges bug my left knee."},
        )
        assert res.status_code == 200
        assert "lunges" in res.json()["text"].lower()

        mem = await h.client.get("/v1/ai/memory", headers=auth_header(uid))
        assert any("knee" in m["text"].lower() for m in mem.json()["items"])

        feed = await h.client.get("/v1/ai/agent/activity", headers=auth_header(uid))
        actions = feed.json()["items"]
        assert any(a["capability"] == "writeMemory" and a["status"] == "done" for a in actions)

    async def _inner() -> None:
        async with ai_app(model=model) as harness:
            await scenario(harness)

    asyncio.run(_inner())


def test_keyless_chat_is_unavailable_without_citations() -> None:
    async def scenario(h: Harness) -> None:
        res = await h.client.post(
            "/v1/ai/agent/chat",
            headers=auth_header(uuid.uuid4()),
            json={"message": "What should I train today?"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["text"] == SAFE_FALLBACK
        assert body["cites"] == []

    run(scenario)


def test_chat_care_redirect_on_unsafe_message() -> None:
    async def scenario(h: Harness) -> None:
        res = await h.client.post(
            "/v1/ai/agent/chat",
            headers=auth_header(uuid.uuid4()),
            json={"message": "I think my knee is torn, is it broken?"},
        )
        assert res.status_code == 200
        assert "professional" in res.json()["text"].lower()
        assert res.json()["cites"] == []

    run(scenario)


def test_auto_action_is_done_ask_action_is_proposed() -> None:
    async def scenario(h: Harness) -> None:
        user = uuid.uuid4()
        # updateReadiness defaults to AUTO → done
        auto = await h.client.post(
            "/v1/ai/agent/actions",
            headers=auth_header(user),
            json={
                "capability": "updateReadiness",
                "type": "Updated readiness",
                "summary": "Set readiness to 62",
                "reasoning": "Combined sleep and HRV with 7-day load.",
                "citedData": [{"icon": "moon", "text": "Sleep 5h24m"}],
            },
        )
        assert auto.json()["status"] == "done"
        # adjustTodayPlan defaults to ASK → proposed
        ask = await h.client.post(
            "/v1/ai/agent/actions",
            headers=auth_header(user),
            json={
                "capability": "adjustTodayPlan",
                "type": "Adjusted today's plan",
                "summary": "Swap heavy squats for Zone-2",
                "reasoning": "Low readiness after a PR.",
                "citedData": [],
            },
        )
        proposed = ask.json()
        assert proposed["status"] == "proposed"

        # the feed shows both, newest first
        feed = await h.client.get("/v1/ai/agent/activity", headers=auth_header(user))
        items = feed.json()["items"]
        assert len(items) == 2
        assert items[0]["capability"] == "adjustTodayPlan"

        # approve the proposed one
        approved = await h.client.post(
            f"/v1/ai/agent/actions/{proposed['id']}/approve", headers=auth_header(user)
        )
        assert approved.json()["status"] == "done"

        # undo it
        undone = await h.client.post(
            f"/v1/ai/agent/actions/{proposed['id']}/undo", headers=auth_header(user)
        )
        assert undone.json()["status"] == "undone"

        # an event was published per transition
        assert len(h.publisher.of_type("ai.agent_action")) >= 3

    run(scenario)


def test_output_guardrail_middleware_replaces_a_shaming_reply() -> None:
    """The after_model middleware catches shame/vanity/diagnosis and ships a safe
    line instead — and the block is counted for production inspection."""
    model = ScriptedChatModel(
        responses=[AIMessage(content="You were lazy and you failed this week. No excuses.")]
    )

    async def scenario(h: Harness) -> None:
        uid = uuid.uuid4()
        res = await h.client.post(
            "/v1/ai/agent/chat", headers=auth_header(uid), json={"message": "how did I do?"}
        )
        assert res.status_code == 200
        text = res.json()["text"].lower()
        assert "lazy" not in text and "failed" not in text
        assert res.json()["text"] == SAFE_FALLBACK
        assert res.json()["cites"] == []

        metrics = await h.client.get("/v1/ai/agent/metrics", headers=auth_header(uid))
        assert metrics.json()["guardrail_blocks"] >= 1

    async def _inner() -> None:
        async with ai_app(model=model) as harness:
            await scenario(harness)

    asyncio.run(_inner())


@pytest.mark.parametrize("content", ["", "   ", [{"type": "text", "text": "Unparsed"}]])
def test_empty_or_non_text_reply_has_no_citations(content: str | list[dict[str, str]]) -> None:
    async def scenario() -> None:
        model = ScriptedChatModel(responses=[AIMessage(content=content)])  # type: ignore[arg-type]
        async with ai_app(model=model) as h:
            res = await h.client.post(
                "/v1/ai/agent/chat",
                headers=auth_header(uuid.uuid4()),
                json={"message": "What evidence do you have?"},
            )
            assert res.status_code == 200
            assert res.json()["text"] == SAFE_FALLBACK
            assert res.json()["cites"] == []

    asyncio.run(scenario())


def test_successful_model_reply_preserves_existing_response() -> None:
    async def scenario() -> None:
        model = ScriptedChatModel(responses=[AIMessage(content="Your recorded load is 412.")])
        async with ai_app(model=model) as h:
            res = await h.client.post(
                "/v1/ai/agent/chat",
                headers=auth_header(uuid.uuid4()),
                json={"message": "What is my recorded load?"},
            )
            assert res.status_code == 200
            assert res.json()["text"] == "Your recorded load is 412."
            assert res.json()["cites"]

    asyncio.run(scenario())


@pytest.mark.parametrize("during_build", [True, False])
def test_graph_failure_has_no_citations(
    monkeypatch: pytest.MonkeyPatch, during_build: bool
) -> None:
    from unittest.mock import AsyncMock, MagicMock

    from app.agent import service

    graph = MagicMock()
    graph.ainvoke = AsyncMock(side_effect=RuntimeError("provider unavailable"))
    factory = (
        MagicMock(side_effect=RuntimeError("graph unavailable"))
        if during_build
        else MagicMock(return_value=graph)
    )
    monkeypatch.setattr(service, "build_agent", factory)

    async def scenario(h: Harness) -> None:
        res = await h.client.post(
            "/v1/ai/agent/chat",
            headers=auth_header(uuid.uuid4()),
            json={"message": "What should I do?"},
        )
        assert res.status_code == 200
        assert res.json()["text"] == SAFE_FALLBACK
        assert res.json()["cites"] == []

    run(scenario)


def test_metrics_count_model_calls() -> None:
    async def scenario(h: Harness) -> None:
        uid = uuid.uuid4()
        await h.client.post(
            "/v1/ai/agent/chat", headers=auth_header(uid), json={"message": "what should I train?"}
        )
        metrics = await h.client.get("/v1/ai/agent/metrics", headers=auth_header(uid))
        body = metrics.json()
        assert body["model_calls"] >= 1
        assert "avg_model_ms" in body

    run(scenario)


def test_actions_are_per_user() -> None:
    async def scenario(h: Harness) -> None:
        owner, other = uuid.uuid4(), uuid.uuid4()
        await h.client.post(
            "/v1/ai/agent/actions",
            headers=auth_header(owner),
            json={
                "capability": "surfaceInsight",
                "type": "Surfaced an insight",
                "summary": "Protein drives your squat",
                "reasoning": "From 31 sessions.",
                "citedData": [],
            },
        )
        feed = await h.client.get("/v1/ai/agent/activity", headers=auth_header(other))
        assert feed.json()["items"] == []

    run(scenario)
