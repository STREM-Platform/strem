"""Forge agent endpoints: the assembled context graph (A6) + long-term memory (A5).

Every Forge surface reads ``GET /v1/ai/context``. Memory is the agent's durable
recall of stated preferences/injuries; the ``writeMemory`` tool (B1) posts here.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app import agent_actions, memory
from app.agent import run_chat
from app.agent.metrics import METRICS
from app.agent.runtime_context import ForgeContext
from app.deps import (
    AgentModelDep,
    AthleteContextProviderDep,
    BearerTokenDep,
    ContextProviderDep,
    CurrentUserDep,
    PublisherDep,
    SessionDep,
)
from app.enums import AgentCapability
from app.errors import AppError
from app.schemas import (
    ActionCreate,
    AgentActionOut,
    AgentActionPage,
    AthleteContext,
    ChatRequest,
    CoachReply,
    MemoryCreate,
    MemoryItem,
    MemoryList,
    Pagination,
)

router = APIRouter(prefix="/v1", tags=["agent"])


@router.get("/ai/context", response_model=AthleteContext)
async def get_context(
    current: CurrentUserDep,
    session: SessionDep,
    provider: AthleteContextProviderDep,
    token: BearerTokenDep,
) -> AthleteContext:
    """The one Athlete Context Graph snapshot: connected sources + derived signals
    + long-term memory. 409 until onboarding gives the coach an identity."""
    snapshot = await provider.for_user(str(current.user_id), token)
    if snapshot is None:
        raise AppError(
            409,
            "insufficient_context",
            "Not enough context yet. Finish onboarding and log an action first.",
        )
    items = await memory.list_items(session, current.user_id)
    return AthleteContext(sources=snapshot.sources, signals=snapshot.signals, memory=items)


@router.get("/ai/memory", response_model=MemoryList)
async def list_memory(current: CurrentUserDep, session: SessionDep) -> MemoryList:
    return MemoryList(items=await memory.list_items(session, current.user_id))


@router.post("/ai/memory", status_code=status.HTTP_201_CREATED, response_model=MemoryItem)
async def add_memory(
    body: MemoryCreate, current: CurrentUserDep, session: SessionDep
) -> MemoryItem:
    item = await memory.create_item(
        session, current.user_id, icon=body.icon, text=body.text, source="user"
    )
    await session.commit()
    return item


@router.delete("/ai/memory/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory(memory_id: uuid.UUID, current: CurrentUserDep, session: SessionDep) -> None:
    archived = await memory.archive_item(session, current.user_id, memory_id)
    if not archived:
        raise AppError(404, "not_found", "Memory not found.")
    await session.commit()


# ── Chat (B1) ────────────────────────────────────────────────────────────────
@router.post("/ai/agent/chat", response_model=CoachReply)
async def chat(
    body: ChatRequest,
    current: CurrentUserDep,
    session: SessionDep,
    provider: AthleteContextProviderDep,
    bundle_provider: ContextProviderDep,
    model: AgentModelDep,
    publisher: PublisherDep,
    token: BearerTokenDep,
) -> CoachReply:
    """A cited, grounded coach reply over the assembled context (A6), via the
    LangGraph agent — which may call tools (logged, reversible) mid-turn."""
    snapshot = await provider.for_user(str(current.user_id), token)
    if snapshot is None:
        raise AppError(409, "insufficient_context", "Not enough context yet to coach.")
    bundle = await bundle_provider.for_user(str(current.user_id), token)
    items = await memory.list_items(session, current.user_id)
    ctx = ForgeContext(
        user_id=current.user_id,
        session=session,
        publisher=publisher,
        signals=snapshot.signals,
        identity=bundle.identity_statement if bundle else None,
        memory=items,
    )
    text, cites = await run_chat(model, ctx, body.message)
    await session.commit()  # persist any tool actions the agent took mid-turn
    return CoachReply(text=text, cites=cites)


# ── Action log (B3) ──────────────────────────────────────────────────────────
def _capability(value: str) -> AgentCapability:
    try:
        return AgentCapability(value)
    except ValueError as exc:
        raise AppError(422, "invalid_capability", f"Unknown capability '{value}'.") from exc


@router.post("/ai/agent/actions", status_code=status.HTTP_201_CREATED)
async def create_action(
    body: ActionCreate,
    current: CurrentUserDep,
    session: SessionDep,
    publisher: PublisherDep,
) -> AgentActionOut | None:
    """Record a typed agent action, gated by the capability's autonomy (A7).
    Returns ``null`` (201) when the capability is OFF for this user."""
    capability = _capability(body.capability)
    action = await agent_actions.record_action(
        session,
        publisher,
        user_id=current.user_id,
        capability=capability,
        type=body.type,
        summary=body.summary,
        reasoning=body.reasoning,
        cited_data=[c.model_dump() for c in body.cited_data],
    )
    await session.commit()
    return action


@router.get("/ai/agent/activity", response_model=AgentActionPage)
async def activity(
    current: CurrentUserDep,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> AgentActionPage:
    items, total = await agent_actions.list_actions(
        session, current.user_id, limit=limit, offset=offset
    )
    return AgentActionPage(
        items=items, pagination=Pagination(limit=limit, offset=offset, total=total)
    )


@router.post("/ai/agent/actions/{action_id}/approve", response_model=AgentActionOut)
async def approve_action(
    action_id: uuid.UUID, current: CurrentUserDep, session: SessionDep, publisher: PublisherDep
) -> AgentActionOut:
    action = await agent_actions.approve(session, publisher, current.user_id, action_id)
    if action is None:
        raise AppError(404, "not_found", "No proposed action to approve.")
    await session.commit()
    return action


@router.post("/ai/agent/actions/{action_id}/undo", response_model=AgentActionOut)
async def undo_action(
    action_id: uuid.UUID, current: CurrentUserDep, session: SessionDep, publisher: PublisherDep
) -> AgentActionOut:
    action = await agent_actions.undo(session, publisher, current.user_id, action_id)
    if action is None:
        raise AppError(404, "not_found", "No action to undo.")
    await session.commit()
    return action


@router.get("/ai/agent/metrics")
async def agent_metrics(current: CurrentUserDep) -> dict[str, object]:
    """Agent run metrics (model/tool/guardrail counters + avg latency) for
    production inspection. Full per-run traces go to LangSmith."""
    return METRICS.snapshot()
