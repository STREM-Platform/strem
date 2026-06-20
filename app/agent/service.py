"""Run the agent for one chat turn (B1).

Care-redirects (crisis/medical/supplement) short-circuit before the model. The
agent runs with the request's tools + runtime context and a per-user thread id
(short-term memory). The grounding/guardrail/metrics/action-logging middleware do
the rest; this just extracts the final reply + grounding chips and degrades to a
safe line if anything fails.
"""

from __future__ import annotations

import logging

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage

from app.agent.agent import build_agent
from app.agent.llm import SAFE_FALLBACK
from app.agent.metrics import METRICS
from app.agent.prompt import grounding_chips
from app.agent.runtime_context import ForgeContext
from app.agent.tools import build_tools
from app.safety import detect_unsafe, guardrails_ok
from app.schemas import CitedDatum

_log = logging.getLogger("strem-ai-orchestrator")


async def run_chat(
    model: BaseChatModel, ctx: ForgeContext, message: str
) -> tuple[str, list[CitedDatum]]:
    redirect = detect_unsafe(message)
    if redirect is not None:
        METRICS.record_care_redirect()
        return redirect, []

    agent = build_agent(model, build_tools(ctx))
    try:
        result = await agent.ainvoke(
            {"messages": [HumanMessage(content=message)]},
            context=ctx,
            config={"configurable": {"thread_id": str(ctx.user_id)}},
        )
        final = result["messages"][-1]
        text = final.content if isinstance(final.content, str) else ""
    except Exception:  # noqa: BLE001 — chat must never hard-fail
        # Log it (the catch-all otherwise hides real bugs) and roll the session
        # back so a mid-turn DB error can't poison the caller's commit.
        _log.exception("agent chat turn failed; returning safe fallback")
        await ctx.session.rollback()
        text = SAFE_FALLBACK

    if not text or not guardrails_ok(text):
        text = SAFE_FALLBACK
    return text, grounding_chips(ctx.signals, ctx.memory)
