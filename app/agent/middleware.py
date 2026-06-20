"""The Forge agent middleware stack (LangChain ``create_agent`` middleware).

Cross-cutting concerns live here, not in the tools or the graph:

- **grounding** (`dynamic_prompt`) — injects the assembled context + long-term
  memory into the system prompt on every model call.
- **output_guardrail** (`after_model`) — the A8 safety net: replaces any final
  answer that trips shame/vanity/diagnosis rather than shipping it.
- **model_metrics** (`wrap_model_call`) — times/counts every model call.
- **action_logging** (`wrap_tool_call`) — records a reversible, autonomy-gated
  AgentAction around every tool call, and counts it. One place, every tool.
"""

from __future__ import annotations

import time
from typing import Any

from langchain.agents.middleware import (
    AgentMiddleware,
    after_model,
    dynamic_prompt,
    wrap_model_call,
    wrap_tool_call,
)
from langchain_core.messages import AIMessage

from app import agent_actions
from app.agent.llm import SAFE_FALLBACK
from app.agent.metrics import METRICS
from app.agent.prompt import build_system_prompt
from app.enums import AgentCapability
from app.safety import guardrails_ok

# Tool name → (capability, action label, build (summary, reasoning) from args).
_TOOL_SPEC: dict[str, tuple[AgentCapability, str, Any]] = {
    "remember": (
        AgentCapability.WRITE_MEMORY,
        "Remembered a preference",
        lambda a: (a.get("text", ""), "The athlete stated this; keeping it so I never re-ask."),
    ),
    "flag_fuel": (
        AgentCapability.FLAG_NUTRITION,
        "Flagged fuel / recovery",
        lambda a: (
            a.get("detail", ""),
            "Surfaced a fuelling/recovery gap from the athlete's data.",
        ),
    ),
    "surface_insight": (
        AgentCapability.SURFACE_INSIGHT,
        "Surfaced an insight",
        lambda a: (a.get("title", ""), a.get("body", "")),
    ),
    "propose_plan_change": (
        AgentCapability.ADJUST_TODAY_PLAN,
        "Proposed a plan change",
        lambda a: (a.get("summary", ""), a.get("reasoning", "")),
    ),
}


@dynamic_prompt
def grounding(request: Any) -> str:
    ctx = request.runtime.context
    return build_system_prompt(ctx.identity, ctx.signals, ctx.memory, ctx.sessions)


@after_model
def output_guardrail(state: Any, runtime: Any) -> dict[str, Any] | None:
    last = state["messages"][-1]
    if isinstance(last, AIMessage) and not getattr(last, "tool_calls", None):
        text = last.content if isinstance(last.content, str) else ""
        if text and not guardrails_ok(text):
            METRICS.record_guardrail_block()
            # Same id → the add_messages reducer replaces rather than appends.
            return {"messages": [AIMessage(content=SAFE_FALLBACK, id=last.id)]}
    return None


@wrap_model_call
async def model_metrics(request: Any, handler: Any) -> Any:
    start = time.perf_counter()
    try:
        response = await handler(request)
    except Exception:
        METRICS.record_model((time.perf_counter() - start) * 1000, error=True)
        raise
    METRICS.record_model((time.perf_counter() - start) * 1000)
    return response


@wrap_tool_call
async def action_logging(request: Any, handler: Any) -> Any:
    """Run the tool, then log a reversible, autonomy-gated AgentAction for it."""
    response = await handler(request)
    spec = _TOOL_SPEC.get(request.tool_call["name"])
    ctx = request.runtime.context
    if spec is not None and ctx is not None:
        capability, label, builder = spec
        summary, reasoning = builder(request.tool_call.get("args", {}))
        await agent_actions.record_action(
            ctx.session,
            ctx.publisher,
            user_id=ctx.user_id,
            capability=capability,
            type=label,
            summary=summary,
            reasoning=reasoning,
            cited_data=[],
        )
        METRICS.record_tool(capability.value)
    return response


FORGE_MIDDLEWARE: list[AgentMiddleware] = [
    grounding,
    model_metrics,
    action_logging,
    output_guardrail,
]
