"""Run the agent graph for one chat turn (B1).

Assembles the system prompt from the context (A6), invokes the LangGraph agent
(which may call tools mid-turn), and returns a guardrail-clean reply + the
grounding chips. Care-redirects (crisis/medical/supplement) short-circuit before
the model; any failure degrades to a safe grounded line so chat never hard-fails.
"""

from __future__ import annotations

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

from app.agent.graph import build_agent_graph
from app.agent.llm import SAFE_FALLBACK
from app.agent.prompt import build_system_prompt, grounding_chips
from app.agent.tools import ToolContext, build_tools
from app.context import GraphSnapshot
from app.safety import detect_unsafe, guardrails_ok
from app.schemas import CitedDatum, MemoryItem


async def run_chat(
    model: BaseChatModel,
    *,
    ctx: ToolContext,
    identity: str | None,
    snapshot: GraphSnapshot,
    memory: list[MemoryItem],
    message: str,
) -> tuple[str, list[CitedDatum]]:
    redirect = detect_unsafe(message)
    if redirect is not None:
        return redirect, []

    tools = build_tools(ctx)
    graph = build_agent_graph(model, tools)
    system = build_system_prompt(identity, snapshot.signals, memory)

    try:
        result = await graph.ainvoke(
            {"messages": [SystemMessage(content=system), HumanMessage(content=message)]}
        )
        final = result["messages"][-1]
        text = final.content if isinstance(final.content, str) else ""
    except Exception:  # noqa: BLE001 — chat must never hard-fail
        text = SAFE_FALLBACK

    if not text or not guardrails_ok(text):
        text = SAFE_FALLBACK
    return text, grounding_chips(snapshot.signals, memory)
