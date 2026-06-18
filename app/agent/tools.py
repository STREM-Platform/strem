"""The agent's tool registry — typed, reversible, logged actions.

Each tool the model can call performs its side effect *and* records an
``AgentAction`` gated by the capability's autonomy (AUTO runs, ASK proposes, OFF
is suppressed), so everything the agent does on its own lands in the Activity feed
with reasoning, cited data, and an undo. Tools are built per request, closing over
the DB session + event publisher + user id.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from langchain_core.tools import BaseTool, StructuredTool
from sqlalchemy.ext.asyncio import AsyncSession

from app import agent_actions, memory
from app.enums import AgentCapability
from app.events import EventPublisher


@dataclass
class ToolContext:
    session: AsyncSession
    publisher: EventPublisher
    user_id: uuid.UUID


def build_tools(ctx: ToolContext) -> list[BaseTool]:
    async def remember(text: str, icon: str = "clock") -> str:
        """Save a durable memory — a stated preference or injury (e.g. 'left knee
        flares on lunges') — so you never re-ask. Use the athlete's own words."""
        await memory.create_item(ctx.session, ctx.user_id, icon=icon, text=text, source="agent")
        await agent_actions.record_action(
            ctx.session,
            ctx.publisher,
            user_id=ctx.user_id,
            capability=AgentCapability.WRITE_MEMORY,
            type="Remembered a preference",
            summary=text,
            reasoning="The athlete stated this; I'm keeping it so I never re-ask.",
            cited_data=[],
        )
        return f"Saved to memory: {text}"

    async def flag_fuel(detail: str) -> str:
        """Flag low protein / under-fuelling or a recovery gap. `detail` must be a
        specific one-liner grounded in the athlete's logs."""
        await agent_actions.record_action(
            ctx.session,
            ctx.publisher,
            user_id=ctx.user_id,
            capability=AgentCapability.FLAG_NUTRITION,
            type="Flagged fuel / recovery",
            summary=detail,
            reasoning="Surfaced a fuelling/recovery gap from the athlete's own data.",
            cited_data=[],
        )
        return f"Flagged: {detail}"

    async def surface_insight(title: str, body: str) -> str:
        """Surface a cross-domain insight you found (training × sleep × fuel),
        grounded only in their data."""
        await agent_actions.record_action(
            ctx.session,
            ctx.publisher,
            user_id=ctx.user_id,
            capability=AgentCapability.SURFACE_INSIGHT,
            type="Surfaced an insight",
            summary=title,
            reasoning=body,
            cited_data=[],
        )
        return f"Insight surfaced: {title}"

    async def propose_plan_change(summary: str, reasoning: str) -> str:
        """Propose a change to today's plan (e.g. swap heavy lower for a Zone-2 run).
        This is an ASK action — it waits for the athlete's approval, it does not
        apply automatically."""
        await agent_actions.record_action(
            ctx.session,
            ctx.publisher,
            user_id=ctx.user_id,
            capability=AgentCapability.ADJUST_TODAY_PLAN,
            type="Proposed a plan change",
            summary=summary,
            reasoning=reasoning,
            cited_data=[],
        )
        return f"Proposed (awaiting the athlete's approval): {summary}"

    return [
        StructuredTool.from_function(coroutine=remember, name="remember"),
        StructuredTool.from_function(coroutine=flag_fuel, name="flag_fuel"),
        StructuredTool.from_function(coroutine=surface_insight, name="surface_insight"),
        StructuredTool.from_function(coroutine=propose_plan_change, name="propose_plan_change"),
    ]
