"""The runtime context passed to the agent on every turn.

Carried as LangChain's typed ``context`` (not persisted by the checkpointer), so
middleware and tools can reach the request-scoped session/publisher and the
assembled athlete context without it leaking into thread state.
"""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.events import EventPublisher
from app.schemas import ContextSignals, MemoryItem


@dataclass
class ForgeContext:
    user_id: uuid.UUID
    session: AsyncSession
    publisher: EventPublisher
    signals: ContextSignals
    identity: str | None = None
    memory: list[MemoryItem] = field(default_factory=list)
    sessions: list[dict[str, Any]] = field(default_factory=list)
    # Serialises the per-tool DB writes — the model can call several tools in one
    # turn and LangGraph runs them concurrently, but one AsyncSession is not safe
    # for concurrent use.
    db_lock: asyncio.Lock = field(default_factory=asyncio.Lock)
