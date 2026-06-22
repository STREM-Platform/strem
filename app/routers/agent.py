"""Forge agent endpoints: the assembled context graph (A6) + long-term memory (A5).

Every Forge surface reads ``GET /v1/ai/context``. Memory is the agent's durable
recall of stated preferences/injuries; the ``writeMemory`` tool (B1) posts here.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app import agent_actions, memory
from app.adaptive_plan import build_adaptive_plan
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
from app.insights import build_insights
from app.schemas import (
    ActionCreate,
    AdaptivePlan,
    AgentActionOut,
    AgentActionPage,
    AthleteContext,
    ChatRequest,
    CoachReply,
    InsightList,
    MemoryCreate,
    MemoryItem,
    MemoryList,
    Pagination,
    SwapRequest,
    SwapResult,
    TrainingPlan,
)
from app.training_plan import build_training_plan, build_training_plan_llm, swap_exercise

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
    # Athlete Baseline facts (#61) lead, then the agent's own A5 notes.
    items = await memory.list_items(session, current.user_id)
    return AthleteContext(
        sources=snapshot.sources,
        signals=snapshot.signals,
        memory=snapshot.memory + items,
    )


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
        sessions=snapshot.sessions,
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


# ── Insights (B8) + adaptive plan (B4) ───────────────────────────────────────
@router.get("/ai/insights", response_model=InsightList)
async def insights(
    current: CurrentUserDep, provider: AthleteContextProviderDep, token: BearerTokenDep
) -> InsightList:
    """Cross-domain correlations the data supports — empty below the sample gate
    (never a fabricated pattern)."""
    snapshot = await provider.for_user(str(current.user_id), token)
    if snapshot is None:
        return InsightList(items=[])
    return InsightList(items=build_insights(snapshot.sessions, snapshot.nutrition))


@router.get("/ai/agent/plan", response_model=AdaptivePlan)
async def adaptive_plan(
    current: CurrentUserDep,
    session: SessionDep,
    provider: AthleteContextProviderDep,
    bundle_provider: ContextProviderDep,
    token: BearerTokenDep,
) -> AdaptivePlan:
    """Readiness-aware mission suggestions for the Coach Plan view (B4)."""
    snapshot = await provider.for_user(str(current.user_id), token)
    if snapshot is None:
        raise AppError(409, "insufficient_context", "Not enough context yet to plan.")
    bundle = await bundle_provider.for_user(str(current.user_id), token)
    items = await memory.list_items(session, current.user_id)
    return build_adaptive_plan(
        snapshot.signals,
        goal=bundle.transformation_goal if bundle else None,
        weekly_target=bundle.weekly_target_days if bundle else None,
        memory=items,
    )


@router.get("/ai/agent/training-plan", response_model=TrainingPlan)
async def training_plan(
    current: CurrentUserDep,
    provider: AthleteContextProviderDep,
    bundle_provider: ContextProviderDep,
    model: AgentModelDep,
    token: BearerTokenDep,
    goal: Annotated[str | None, Query()] = None,
) -> TrainingPlan:
    """A full structured weekly plan, shaped by goal + weekly volume + readiness.

    `goal` overrides the onboarding goal so the athlete can build a plan for what
    they're preparing for right now (an unknown value falls back to the default
    week — never an error). LLM-written and grounded in the athlete's real
    sessions/PRs/memory (#70) when a model is available; the deterministic
    rule-based week is the keyless / parse-failure fallback — never fabricated.
    """
    snapshot = await provider.for_user(str(current.user_id), token)
    if snapshot is None:
        raise AppError(409, "insufficient_context", "Not enough context yet to plan.")
    bundle = await bundle_provider.for_user(str(current.user_id), token)
    chosen_goal = goal or (bundle.transformation_goal if bundle else None)
    weekly_target = bundle.weekly_target_days if bundle else None
    plan = await build_training_plan_llm(
        model,
        goal=chosen_goal,
        weekly_target_days=weekly_target,
        signals=snapshot.signals,
        sessions=snapshot.sessions,
        memory=snapshot.memory,
    )
    if plan is None:
        plan = build_training_plan(
            goal=chosen_goal, weekly_target_days=weekly_target, signals=snapshot.signals
        )
    return plan


@router.post("/ai/agent/training-plan/swap", response_model=SwapResult)
async def training_plan_swap(body: SwapRequest, current: CurrentUserDep) -> SwapResult:
    """Swap one exercise for another in the same movement group."""
    return SwapResult(exercise=swap_exercise(body.group, body.exclude))
