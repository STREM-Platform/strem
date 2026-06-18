"""The agent's tool registry.

Tools carry only their side effect + a clear docstring (the model reads these to
decide when to use them). The cross-cutting concern — recording a reversible,
autonomy-gated AgentAction for each call — lives in the ``action_logging``
middleware, so there's one place that logs every tool. Built per request, closing
over the runtime context for the side effects that need the DB session.
"""

from __future__ import annotations

from langchain_core.tools import BaseTool, StructuredTool

from app import memory
from app.agent.runtime_context import ForgeContext


def build_tools(ctx: ForgeContext) -> list[BaseTool]:
    async def remember(text: str, icon: str = "clock") -> str:
        """Save a durable memory — a stated preference or injury (e.g. 'left knee
        flares on lunges') — so you never re-ask. Use the athlete's own words."""
        await memory.create_item(ctx.session, ctx.user_id, icon=icon, text=text, source="agent")
        return f"Saved to memory: {text}"

    async def flag_fuel(detail: str) -> str:
        """Flag low protein / under-fuelling or a recovery gap. `detail` must be a
        specific one-liner grounded in the athlete's logs."""
        return f"Flagged: {detail}"

    async def surface_insight(title: str, body: str) -> str:
        """Surface a cross-domain insight you found (training × sleep × fuel),
        grounded only in their data."""
        return f"Insight surfaced: {title}"

    async def propose_plan_change(summary: str, reasoning: str) -> str:
        """Propose a change to today's plan (e.g. swap heavy lower for a Zone-2 run).
        This waits for the athlete's approval — it does not apply automatically."""
        return f"Proposed (awaiting the athlete's approval): {summary}"

    return [
        StructuredTool.from_function(coroutine=remember, name="remember"),
        StructuredTool.from_function(coroutine=flag_fuel, name="flag_fuel"),
        StructuredTool.from_function(coroutine=surface_insight, name="surface_insight"),
        StructuredTool.from_function(coroutine=propose_plan_change, name="propose_plan_change"),
    ]
