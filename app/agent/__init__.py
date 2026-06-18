"""Forge — the omniscient agent, as a LangGraph state machine (B1).

Not a one-shot LLM call: a graph that *reasons → acts → reasons → answers*, with a
tool registry of typed, reversible actions (each gated by the user's autonomy and
logged to the Activity feed) and a guardrail node on the way out. The model is
Claude (via langchain-anthropic) when configured, with a deterministic fallback
so local dev and tests run without a key.
"""

from app.agent.service import run_chat

__all__ = ["run_chat"]
