"""Forge agent endpoints: the assembled context graph (A6) + long-term memory (A5).

Every Forge surface reads ``GET /v1/ai/context``. Memory is the agent's durable
recall of stated preferences/injuries; the ``writeMemory`` tool (B1) posts here.
"""

import uuid

from fastapi import APIRouter, status

from app import memory
from app.deps import AthleteContextProviderDep, BearerTokenDep, CurrentUserDep, SessionDep
from app.errors import AppError
from app.schemas import AthleteContext, MemoryCreate, MemoryItem, MemoryList

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
