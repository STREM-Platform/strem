"""The Forge agent graph (LangGraph).

A small but real state machine, not a single LLM call:

    reason ──(tool calls?)──▶ act ──▶ reason ...
       │
       └──(final answer)──▶ guard ──▶ END

``reason`` is the model (bound to the tool registry); ``act`` runs the requested
tools (each logging a reversible AgentAction); ``guard`` is the A8 safety net on
the final answer. Compiled once per request with the request-scoped tools.
"""

from __future__ import annotations

from typing import Annotated, Any, TypedDict

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.tools import BaseTool
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from app.agent.llm import SAFE_FALLBACK
from app.safety import guardrails_ok


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


def build_agent_graph(model: BaseChatModel, tools: list[BaseTool]) -> Any:
    """Compile the reason/act/guard graph for one request."""
    bound = model.bind_tools(tools) if tools else model

    async def reason(state: AgentState) -> dict[str, list[BaseMessage]]:
        reply = await bound.ainvoke(state["messages"])
        return {"messages": [reply]}

    def route(state: AgentState) -> str:
        last = state["messages"][-1]
        return "act" if getattr(last, "tool_calls", None) else "guard"

    async def guard(state: AgentState) -> dict[str, list[BaseMessage]]:
        last = state["messages"][-1]
        text = last.content if isinstance(last.content, str) else ""
        if text and not guardrails_ok(text):
            # Replace a guardrail-tripping answer rather than ship it.
            return {"messages": [AIMessage(content=SAFE_FALLBACK)]}
        return {"messages": []}

    graph = StateGraph(AgentState)
    graph.add_node("reason", reason)
    graph.add_node("act", ToolNode(tools))
    graph.add_node("guard", guard)
    graph.set_entry_point("reason")
    graph.add_conditional_edges("reason", route, {"act": "act", "guard": "guard"})
    graph.add_edge("act", "reason")
    graph.add_edge("guard", END)
    return graph.compile()
