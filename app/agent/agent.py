"""Build the Forge agent (LangChain ``create_agent``).

A middleware-driven agent over LangGraph: grounding + guardrail + metrics +
action-logging middleware, a tool registry, and a checkpointer for short-term
(thread) memory. Long-term memory (A5) is injected by the grounding middleware
and written by the ``remember`` tool.
"""

from __future__ import annotations

from typing import Any

from langchain.agents import create_agent
from langchain_core.language_models import BaseChatModel
from langchain_core.tools import BaseTool
from langgraph.checkpoint.memory import InMemorySaver

from app.agent.middleware import FORGE_MIDDLEWARE
from app.agent.runtime_context import ForgeContext

# Process-local thread memory. TODO(prod): swap for the Postgres checkpointer so
# conversation memory survives restarts and is shared across instances.
_checkpointer = InMemorySaver()


def build_agent(model: BaseChatModel, tools: list[BaseTool]) -> Any:
    """Compile the agent for one request (tools are request-scoped; the
    checkpointer and middleware are shared)."""
    return create_agent(
        model=model,
        tools=tools,
        middleware=FORGE_MIDDLEWARE,
        context_schema=ForgeContext,
        checkpointer=_checkpointer,
    )
