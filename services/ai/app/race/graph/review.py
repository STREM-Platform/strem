"""Plan changes pause for the athlete (ADR 0010, ai#58 phase 4).

    draft → review (interrupt) ─ accept  → apply
                               ├ adjust  → draft (with the athlete's note) → review …
                               └ dismiss → close

Every change to a plan — an adaptation the athlete asked for, or the race
team's response to missed training — runs as this graph. It stops at `review`
with a LangGraph interrupt; nothing is written to the plan until the athlete
accepts. "Adjust" sends their words back for a new draft and pauses again. The
checkpointer keeps each proposal's thread (thread id = proposal id), so a
review can be answered days later. The proposal row stays the app's view of it.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any, TypedDict, cast

from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from app.config import get_settings


class ReviewState(TypedDict, total=False):
    kind: str  # "adapt" (the athlete asked) | "missed" (missed training)
    reason: str
    base: dict[str, Any]  # the engine's first draft, when the caller computed it
    notes: list[str]  # the athlete's adjust requests, oldest first
    draft: dict[str, Any]
    origin: str
    model: str | None
    ai_reason: str | None
    decision: str  # accept | dismiss


Drafter = Callable[[ReviewState], Awaitable[dict[str, Any]]]
Hook = Callable[[ReviewState], Awaitable[None]]


def build_review(
    *,
    drafter: Drafter,
    on_draft: Hook,
    on_accept: Hook,
    on_dismiss: Hook,
    checkpointer: BaseCheckpointSaver[Any],
) -> Any:
    """`drafter` returns {draft, origin, model, ai_reason}; hooks keep the proposal row in step."""

    async def draft(state: ReviewState) -> dict[str, Any]:
        update: dict[str, Any] = dict(await drafter(state))
        await on_draft(cast(ReviewState, {**state, **update}))
        return update

    def review(state: ReviewState) -> Command[str]:
        answer = interrupt({"draft": state.get("draft")})
        decision = str((answer or {}).get("decision") or "dismiss")
        if decision == "adjust":
            note = str((answer or {}).get("note") or "").strip()
            return Command(goto="draft", update={"notes": [*state.get("notes", []), note]})
        return Command(
            goto="apply" if decision == "accept" else "close", update={"decision": decision}
        )

    async def apply(state: ReviewState) -> dict[str, Any]:
        await on_accept(state)
        return {}

    async def close(state: ReviewState) -> dict[str, Any]:
        await on_dismiss(state)
        return {}

    graph = StateGraph(ReviewState)
    graph.add_node("draft", draft)
    graph.add_node("review", review, destinations=("draft", "apply", "close"))
    graph.add_node("apply", apply)
    graph.add_node("close", close)
    graph.add_edge(START, "draft")
    graph.add_edge("draft", "review")
    graph.add_edge("apply", END)
    graph.add_edge("close", END)
    return graph.compile(checkpointer=checkpointer)


def thread(proposal_id: Any) -> RunnableConfig:
    return RunnableConfig(configurable={"thread_id": f"proposal:{proposal_id}"})


async def waiting_for_review(graph: Any, proposal_id: Any) -> bool:
    """Whether this proposal's thread is paused at review (older proposals have none)."""
    state = await graph.aget_state(thread(proposal_id))
    return "review" in (state.next or ())


_checkpointer: BaseCheckpointSaver[Any] | None = None


async def checkpointer() -> BaseCheckpointSaver[Any]:
    """Postgres in the deployed service; in memory for SQLite (tests, local tools)."""
    global _checkpointer
    if _checkpointer is None:
        url = get_settings().database_url
        if url.startswith("postgresql"):
            from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
            from psycopg.rows import dict_row
            from psycopg_pool import AsyncConnectionPool

            pool: AsyncConnectionPool[Any] = AsyncConnectionPool(
                conninfo=url.replace("postgresql+asyncpg://", "postgresql://"),
                kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
                open=False,
            )
            await pool.open()
            saver = AsyncPostgresSaver(pool)
            await saver.setup()
            _checkpointer = saver
        else:
            from langgraph.checkpoint.memory import InMemorySaver

            _checkpointer = InMemorySaver()
    return _checkpointer
